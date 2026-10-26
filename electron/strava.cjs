const http = require("http")
const fs = require("fs")
const path = require("path")
const { shell, app } = require("electron")
const { createSmartCache } = require("./smart-cache.cjs")

const API = "https://www.strava.com/api/v3"
const SCOPES = "read,activity:read_all"
const CALLBACK_PORT = 43111

const cache = createSmartCache()
const STATUS_TTL_MS = 3 * 60_000
const STATUS_STALE_MS = 15 * 60_000
const ACTIVITY_DETAIL_TTL_MS = 30 * 60_000
const ACTIVITY_DETAIL_STALE_MS = 24 * 60 * 60_000
function tokenPath() {
  return path.join(app.getPath("userData"), "strava-tokens.json")
}

function readTokens() {
  try {
    return JSON.parse(fs.readFileSync(tokenPath(), "utf8"))
  } catch {
    return null
  }
}

function writeTokens(tokens) {
  fs.writeFileSync(tokenPath(), JSON.stringify(tokens, null, 2), "utf8")
}

function clearTokens() {
  try {
    fs.unlinkSync(tokenPath())
  } catch {
    // ignore
  }
}

function getConfig() {
  return {
    clientId: process.env.STRAVA_CLIENT_ID || "",
    clientSecret: process.env.STRAVA_CLIENT_SECRET || "",
    redirectUri:
      process.env.STRAVA_REDIRECT_URI || `http://127.0.0.1:${CALLBACK_PORT}/callback`,
  }
}

function isConfigured() {
  const { clientId, clientSecret } = getConfig()
  return Boolean(clientId && clientSecret)
}

function isConnected() {
  const tokens = readTokens()
  return Boolean(tokens?.refresh_token || tokens?.access_token)
}

function seedTokensFromEnv() {
  const refresh = process.env.STRAVA_REFRESH_TOKEN?.trim()
  const access = process.env.STRAVA_ACCESS_TOKEN?.trim()
  if (!refresh && !access) return
  const existing = readTokens()
  if (existing?.refresh_token) return
  writeTokens({
    access_token: access || "",
    refresh_token: refresh || "",
    expires_at: Date.now() + 60 * 60 * 1000,
  })
}

async function exchangeToken(body) {
  const { clientId, clientSecret } = getConfig()
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      ...body,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Strava token failed: ${err}`)
  }
  return res.json()
}

async function getAccessToken() {
  seedTokensFromEnv()
  const tokens = readTokens()
  if (!tokens?.access_token && !tokens?.refresh_token) return null

  if (tokens.expires_at && tokens.expires_at > Date.now() + 30_000 && tokens.access_token) {
    return tokens.access_token
  }

  if (!tokens.refresh_token) return tokens.access_token || null

  const refreshed = await exchangeToken({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
  })

  const next = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + (refreshed.expires_in ?? 21600) * 1000,
    athlete_id: refreshed.athlete?.id ?? tokens.athlete_id,
  }
  writeTokens(next)
  return next.access_token
}

async function stravaFetch(pathname, options = {}) {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    const err = new Error("not_connected")
    err.code = "not_connected"
    throw err
  }

  const res = await fetch(`${API}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  })
  return res
}

function mapActivity(a) {
  return {
    id: a.id,
    name: a.name,
    type: a.sport_type || a.type,
    startDate: a.start_date_local || a.start_date,
    distance: a.distance ?? 0,
    movingTime: a.moving_time ?? 0,
    elevation: a.total_elevation_gain ?? 0,
    averageSpeed: a.average_speed ?? 0,
    polyline: a.map?.polyline || a.map?.summary_polyline || null,
    url: `https://www.strava.com/activities/${a.id}`,
  }
}

function localDateKey(iso) {
  const d = new Date(iso)
  return localDateKeyFromDate(d)
}

function localDateKeyFromDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function mondayOfWeek(d) {
  const copy = new Date(d)
  const wd = copy.getDay()
  const toMon = wd === 0 ? -6 : 1 - wd
  copy.setDate(copy.getDate() + toMon)
  copy.setHours(12, 0, 0, 0)
  return copy
}

function weekKey(d) {
  const m = mondayOfWeek(d)
  const y = m.getFullYear()
  const mo = String(m.getMonth() + 1).padStart(2, "0")
  const day = String(m.getDate()).padStart(2, "0")
  return `${y}-${mo}-${day}`
}

function computeStreak(activities) {
  const weeks = new Set()
  for (const a of activities) {
    if (!a.startDate) continue
    weeks.add(weekKey(new Date(a.startDate)))
  }
  if (weeks.size === 0) return { weeks: 0, activitiesInStreak: 0 }

  let streak = 0
  let cursor = mondayOfWeek(new Date())
  const counted = new Set()

  while (true) {
    const key = weekKey(cursor)
    if (!weeks.has(key)) break
    streak += 1
    for (const a of activities) {
      if (weekKey(new Date(a.startDate)) === key) counted.add(a.id)
    }
    cursor.setDate(cursor.getDate() - 7)
  }

  return { weeks: streak, activitiesInStreak: counted.size }
}

function buildMonthCalendar(activities, ref = new Date()) {
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const monthLabel = ref.toLocaleDateString(undefined, { month: "long", year: "numeric" })

  const byDay = new Map()
  for (const a of activities) {
    const key = localDateKey(a.startDate)
    const d = new Date(`${key}T12:00:00`)
    if (d.getFullYear() !== year || d.getMonth() !== month) continue
    const list = byDay.get(key) ?? []
    list.push(a)
    byDay.set(key, list)
  }

  const first = new Date(year, month, 1, 12)
  const last = new Date(year, month + 1, 0, 12)
  const startPad = (first.getDay() + 6) % 7
  const cells = []

  for (let i = 0; i < startPad; i++) {
    cells.push({ inMonth: false, date: null, day: null, activities: [] })
  }

  const todayKey = localDateKeyFromDate(ref)

  for (let day = 1; day <= last.getDate(); day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const acts = byDay.get(key) ?? []
    cells.push({
      inMonth: true,
      date: key,
      day,
      activities: acts.map((a) => ({ id: a.id, type: a.type })),
      isToday: key === todayKey,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ inMonth: false, date: null, day: null, activities: [] })
  }

  const monthActivities = activities.filter((a) => {
    const d = new Date(a.startDate)
    return d.getFullYear() === year && d.getMonth() === month
  })

  const weekRows = []
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7)
    const active = row.some((c) => c.inMonth && c.activities.length > 0)
    weekRows.push({ active })
  }

  return {
    monthLabel,
    cells,
    weekRows,
    monthActivityCount: monthActivities.length,
  }
}

function decodePolyline(encoded) {
  if (!encoded) return []
  const points = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    shift = 0
    result = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

function haversineMeters(a, b) {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function densifyRoutePoints(points, stepMeters = 18) {
  if (points.length < 2) return points
  const out = [points[0]]
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const dist = haversineMeters(a, b)
    const steps = Math.max(1, Math.ceil(dist / stepMeters))
    for (let s = 1; s < steps; s++) {
      const t = s / steps
      out.push({
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      })
    }
    out.push(b)
  }
  return out
}

function buildRouteHeatmap(activities) {
  const polylines = []
  const boundsPoints = []

  for (const a of activities) {
    if (!a.polyline) continue
    polylines.push(a.polyline)
    for (const p of decodePolyline(a.polyline)) {
      boundsPoints.push(p)
    }
  }

  if (boundsPoints.length < 2) {
    return { polylines: [], bounds: null }
  }

  let minLat = boundsPoints[0].lat
  let maxLat = boundsPoints[0].lat
  let minLng = boundsPoints[0].lng
  let maxLng = boundsPoints[0].lng
  for (const p of boundsPoints) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  }

  const padLat = (maxLat - minLat) * 0.1 || 0.002
  const padLng = (maxLng - minLng) * 0.1 || 0.002

  return {
    bounds: {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    },
    polylines,
  }
}

async function fetchStatusPayload() {
  const athleteRes = await stravaFetch("/athlete")
  if (!athleteRes.ok) throw new Error(`strava_http_${athleteRes.status}`)
  const athlete = await athleteRes.json()

  const [activitiesRes, statsRes] = await Promise.all([
    stravaFetch("/athlete/activities?per_page=80"),
    stravaFetch(`/athletes/${athlete.id}/stats`),
  ])

  if (!activitiesRes.ok) throw new Error(`strava_http_${activitiesRes.status}`)
  const rawActivities = await activitiesRes.json()
  const activities = (rawActivities ?? []).map(mapActivity)

  let stats = null
  if (statsRes.ok) {
    const s = await statsRes.json()
    stats = {
      ytdRideDistance: s.ytd_ride_totals?.distance ?? 0,
      ytdRunDistance: s.ytd_run_totals?.distance ?? 0,
      ytdSwimDistance: s.ytd_swim_totals?.distance ?? 0,
      recentRideDistance: s.recent_ride_totals?.distance ?? 0,
      recentRunDistance: s.recent_run_totals?.distance ?? 0,
      recentSwimDistance: s.recent_swim_totals?.distance ?? 0,
    }
  }

  const streak = computeStreak(activities)
  const calendar = buildMonthCalendar(activities)
  const heatmap = buildRouteHeatmap(activities.slice(0, 40))

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const recent30 = activities.filter((a) => new Date(a.startDate) >= monthStart)

  return {
    login: `${athlete.firstname ?? ""} ${athlete.lastname ?? ""}`.trim() || athlete.username,
    avatarUrl: athlete.profile_medium || athlete.profile || null,
    athleteId: athlete.id,
    stats,
    streak,
    calendar,
    calendarActivities: activities.map((a) => ({
      id: a.id,
      type: a.type,
      startDate: a.startDate,
    })),
    heatmap,
    featuredActivity: activities.find((a) => a.polyline) ?? activities[0] ?? null,
    activities: activities.slice(0, 20),
    monthDistance: recent30.reduce((sum, a) => sum + (a.distance || 0), 0),
  }
}

async function status(options = {}) {
  const force = options.force === true
  const configured = isConfigured()
  if (!configured) {
    return {
      configured: false,
      connected: false,
      login: null,
      avatarUrl: null,
      athleteId: null,
      stats: null,
      streak: null,
      calendar: null,
      calendarActivities: [],
      heatmap: null,
      featuredActivity: null,
      activities: [],
      monthDistance: 0,
      message: "Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to .env",
    }
  }

  if (!isConnected()) {
    return {
      configured: true,
      connected: false,
      login: null,
      avatarUrl: null,
      athleteId: null,
      stats: null,
      streak: null,
      calendar: null,
      calendarActivities: [],
      heatmap: null,
      featuredActivity: null,
      activities: [],
      monthDistance: 0,
      message: "Connect Strava in Settings",
    }
  }

  try {
    const data = await cache.get("strava:status:v4", {
      ttlMs: STATUS_TTL_MS,
      staleMs: STATUS_STALE_MS,
      force,
      fetcher: fetchStatusPayload,
    })
    return { configured: true, connected: true, ...data }
  } catch (err) {
    if (err.code === "not_connected") {
      return {
        configured: true,
        connected: false,
        login: null,
        avatarUrl: null,
        athleteId: null,
        stats: null,
        streak: null,
        calendar: null,
        calendarActivities: [],
        heatmap: null,
        featuredActivity: null,
        activities: [],
        monthDistance: 0,
        message: "Connect Strava in Settings",
      }
    }
    return {
      configured: true,
      connected: false,
      login: null,
      avatarUrl: null,
      athleteId: null,
      stats: null,
      streak: null,
      calendar: null,
      calendarActivities: [],
      heatmap: null,
      featuredActivity: null,
      activities: [],
      monthDistance: 0,
      error: err instanceof Error ? err.message : "strava_error",
    }
  }
}

function startAuth() {
  return new Promise((resolve, reject) => {
    const { clientId, redirectUri } = getConfig()
    if (!isConfigured()) {
      reject(new Error("Strava credentials missing in .env"))
      return
    }

    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://127.0.0.1:${CALLBACK_PORT}`)
        if (url.pathname !== "/callback") {
          res.writeHead(404)
          res.end()
          return
        }

        const error = url.searchParams.get("error")
        const code = url.searchParams.get("code")

        if (error || !code) {
          res.writeHead(400, { "Content-Type": "text/html" })
          res.end("<h1>Strava auth failed</h1><p>You can close this window.</p>")
          server.close()
          reject(new Error(error || "missing_code"))
          return
        }

        const tokens = await exchangeToken({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        })

        writeTokens({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: Date.now() + (tokens.expires_in ?? 21600) * 1000,
          athlete_id: tokens.athlete?.id,
        })

        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(
          "<h1>Connected to Strava</h1><p>You can close this window and return to notch.</p>",
        )
        server.close()
        resolve(true)
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" })
        res.end("<h1>Auth error</h1><p>You can close this window.</p>")
        server.close()
        reject(err)
      }
    })

    server.listen(CALLBACK_PORT, "127.0.0.1", () => {
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        approval_prompt: "auto",
        scope: SCOPES,
      })
      void shell.openExternal(`https://www.strava.com/oauth/authorize?${params}`)
    })

    server.on("error", (err) => reject(err))

    setTimeout(() => {
      try {
        server.close()
      } catch {
        // ignore
      }
      reject(new Error("Auth timed out"))
    }, 5 * 60 * 1000)
  })
}

function disconnect() {
  clearTokens()
  cache.invalidate?.("strava:status:v4")
  cache.invalidatePrefix?.("strava:activity:")
  return status()
}

async function getActivity(activityId) {
  const id = Number(activityId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("invalid_activity_id")
  }

  return cache.get(`strava:activity:${id}`, {
    ttlMs: ACTIVITY_DETAIL_TTL_MS,
    staleMs: ACTIVITY_DETAIL_STALE_MS,
    fetcher: async () => {
      const res = await stravaFetch(`/activities/${id}`)
      if (!res.ok) {
        throw new Error(`strava_http_${res.status}`)
      }
      return mapActivity(await res.json())
    },
  })
}

module.exports = {
  isConfigured,
  isConnected,
  status,
  startAuth,
  disconnect,
  getActivity,
  configured: () => isConfigured(),
}
