/**
 * Google Calendar — OAuth + Calendar API (all selected calendars)
 */
const http = require("http")
const fs = require("fs")
const path = require("path")
const { shell, app } = require("electron")

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly"
const CALLBACK_PORT = 43112
const CACHE_MS = 5 * 60 * 1000

let cache = { at: 0, events: [], calendars: [] }

function tokenPath() {
  return path.join(app.getPath("userData"), "google-calendar-tokens.json")
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
  cache = { at: 0, events: [], calendars: [] }
}

function getConfig() {
  return {
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
    clientSecret:
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      `http://127.0.0.1:${CALLBACK_PORT}/callback`,
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
  const refresh = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim()
  const access = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN?.trim()
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
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...body,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google token failed: ${err}`)
  }
  return res.json()
}

/** @type {Promise<string | null> | null} */
let refreshInFlight = null

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const tokens = readTokens()
    if (!tokens?.refresh_token) return tokens?.access_token ?? null

    const refreshed = await exchangeToken({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    })

    const next = {
      access_token: refreshed.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
    }
    writeTokens(next)
    return next.access_token
  })().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

async function getAccessToken() {
  seedTokensFromEnv()
  const tokens = readTokens()
  if (!tokens?.access_token && !tokens?.refresh_token) return null

  if (tokens.access_token && tokens.expires_at && tokens.expires_at > Date.now() + 30_000) {
    return tokens.access_token
  }

  if (!tokens.refresh_token) return tokens.access_token || null

  return refreshAccessToken()
}

function extractUrl(text) {
  if (!text) return null
  const match = String(text).match(/https?:\/\/[^\s<>"']+/i)
  return match ? match[0].replace(/[.,;]+$/, "") : null
}

function stripHtmlDescription(html) {
  if (!html) return null
  const text = String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

// Google Calendar colorId → hex (keep in sync with src/lib/google-calendar-colors.ts)
const GOOGLE_CALENDAR_COLOR_BY_ID = {
  "1": "#7986cb",
  "2": "#33b679",
  "3": "#8e24aa",
  "4": "#e67c73",
  "5": "#f6bf26",
  "6": "#f4511e",
  "7": "#039be5",
  "8": "#616161",
  "9": "#3f51b5",
  "10": "#0b8043",
  "11": "#d50000",
}

const DEFAULT_CALENDAR_COLOR = "#039be5"

function colorFromGoogleId(colorId) {
  if (!colorId) return null
  return GOOGLE_CALENDAR_COLOR_BY_ID[String(colorId)] ?? null
}

function resolveCalendarColor(cal) {
  if (cal.backgroundColor && /^#[0-9a-f]{6}$/i.test(cal.backgroundColor)) {
    return cal.backgroundColor
  }
  return colorFromGoogleId(cal.colorId) || DEFAULT_CALENDAR_COLOR
}

function resolveEventColor(item, calendarColor) {
  return colorFromGoogleId(item.colorId) || calendarColor || DEFAULT_CALENDAR_COLOR
}

function mapGcalEvent(item, calendarId, calendarSummary, calendarColor) {
  const allDay = Boolean(item.start?.date && !item.start?.dateTime)
  let start = null
  if (item.start?.dateTime) {
    start = new Date(item.start.dateTime).toISOString()
  } else if (item.start?.date) {
    start = new Date(`${item.start.date}T12:00:00`).toISOString()
  }

  let end = start
  if (item.end?.dateTime) {
    end = new Date(item.end.dateTime).toISOString()
  } else if (item.end?.date) {
    end = new Date(`${item.end.date}T12:00:00`).toISOString()
  }

  const videoEntry = (item.conferenceData?.entryPoints ?? []).find(
    (e) => e.entryPointType === "video" && e.uri,
  )

  const eventId = item.id || `${start}-${item.summary}`
  const color = resolveEventColor(item, calendarColor)

  return {
    id: `${calendarId}:${eventId}`,
    iCalUID: item.iCalUID || null,
    summary: item.summary || "(No title)",
    start,
    end,
    allDay,
    location: item.location || null,
    calendarId,
    calendarName: calendarSummary || null,
    color,
    description: stripHtmlDescription(item.description),
    htmlLink: item.htmlLink || null,
    organizerName: item.organizer?.displayName || null,
    organizerEmail: item.organizer?.email || null,
    attendees: (item.attendees ?? []).map((a) => ({
      email: a.email || "",
      name: a.displayName || null,
      optional: Boolean(a.optional),
      responseStatus: a.responseStatus || null,
    })),
    status: item.status || null,
    visibility: item.visibility || null,
    joinUrl:
      item.hangoutLink ||
      videoEntry?.uri ||
      extractUrl(item.location) ||
      extractUrl(item.description) ||
      null,
  }
}

async function googleCalendarFetch(pathname, options = {}, allow401Retry = true) {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    const err = new Error("not_connected")
    err.code = "not_connected"
    throw err
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  })

  if (res.status === 401 && allow401Retry) {
    const tokens = readTokens()
    if (tokens) writeTokens({ ...tokens, expires_at: 0 })
    await refreshAccessToken()
    return googleCalendarFetch(pathname, options, false)
  }

  return res
}

/** Window for month navigation: 12 months back through ~3 months ahead. */
function eventTimeRange() {
  const now = new Date()
  const timeMin = new Date(now.getFullYear(), now.getMonth() - 12, 1, 0, 0, 0, 0)
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 4, 0, 23, 59, 59, 999)
  return {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    horizonStart: timeMin.getTime(),
    horizonEnd: timeMax.getTime(),
  }
}

async function fetchCalendarList() {
  const calendars = []
  let pageToken = null

  do {
    const params = new URLSearchParams({
      minAccessRole: "reader",
      maxResults: "250",
      showHidden: "true",
    })
    if (pageToken) params.set("pageToken", pageToken)

    const res = await googleCalendarFetch(`/users/me/calendarList?${params}`)
    if (!res.ok) throw new Error("calendar_list_failed")

    const data = await res.json()
    for (const cal of data.items ?? []) {
      if (cal.selected === false) continue
      if (cal.deleted === true) continue
      if (cal.accessRole === "freeBusyReader") continue
      calendars.push({
        id: cal.id,
        summary: cal.summaryOverride || cal.summary || cal.id,
        color: resolveCalendarColor(cal),
      })
    }
    pageToken = data.nextPageToken || null
  } while (pageToken)

  if (calendars.length === 0) {
    calendars.push({ id: "primary", summary: "Primary", color: DEFAULT_CALENDAR_COLOR })
  }

  return calendars
}

async function fetchEventsForCalendar(calendarId, calendarSummary, calendarColor, timeMin, timeMax) {
  const events = []
  let pageToken = null

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    })
    if (pageToken) params.set("pageToken", pageToken)

    const res = await googleCalendarFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    )
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) return []
      throw new Error("calendar_fetch_failed")
    }

    const data = await res.json()
    for (const item of data.items ?? []) {
      const mapped = mapGcalEvent(item, calendarId, calendarSummary, calendarColor)
      if (mapped.start) events.push(mapped)
    }
    pageToken = data.nextPageToken || null
  } while (pageToken)

  return events
}

function dedupeEvents(events) {
  const out = []
  const seen = new Set()

  for (const event of events) {
    const key = event.iCalUID
      ? `${event.iCalUID}:${event.start}`
      : event.id
    if (seen.has(key)) continue
    seen.add(key)
    const { iCalUID, ...rest } = event
    out.push(rest)
  }

  return out
}

async function fetchGoogleEvents() {
  const { timeMin, timeMax } = eventTimeRange()
  const calendars = await fetchCalendarList()

  const batches = await Promise.all(
    calendars.map((cal) =>
      fetchEventsForCalendar(cal.id, cal.summary, cal.color, timeMin, timeMax),
    ),
  )

  return {
    calendars,
    events: dedupeEvents(batches.flat()),
  }
}

async function snapshot(options = {}) {
  const configured = isConfigured()
  const connected = isConnected()

  if (!configured) {
    return { configured: false, connected: false, calendars: [], events: [], error: null }
  }
  if (!connected) {
    return { configured: true, connected: false, calendars: [], events: [], error: null }
  }

  const force = options.force === true
  const now = Date.now()
  if (!force && now - cache.at < CACHE_MS) {
    return {
      configured: true,
      connected: true,
      calendars: cache.calendars,
      events: cache.events,
      error: null,
    }
  }

  try {
    const { horizonStart, horizonEnd } = eventTimeRange()
    const { events: rawEvents, calendars } = await fetchGoogleEvents()
    const filtered = rawEvents
      .filter((e) => {
        const start = new Date(e.start).getTime()
        const end = new Date(e.end).getTime()
        return end >= horizonStart && start <= horizonEnd
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    cache = { at: now, events: filtered, calendars }
    return { configured: true, connected: true, calendars, events: filtered, error: null }
  } catch (err) {
    return {
      configured: true,
      connected: true,
      calendars: cache.calendars,
      events: cache.events,
      error: err instanceof Error ? err.message : "calendar_error",
    }
  }
}

function startAuth() {
  return new Promise((resolve, reject) => {
    const { clientId, redirectUri } = getConfig()
    if (!clientId) {
      reject(new Error("not_configured"))
      return
    }

    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url?.startsWith("/callback")) {
          res.writeHead(404)
          res.end()
          return
        }

        const url = new URL(req.url, redirectUri)
        const error = url.searchParams.get("error")
        const code = url.searchParams.get("code")

        if (error || !code) {
          res.writeHead(400, { "Content-Type": "text/html" })
          res.end("<h1>Google Calendar auth failed</h1><p>You can close this window.</p>")
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
          refresh_token: tokens.refresh_token || readTokens()?.refresh_token || "",
          expires_at: Date.now() + (tokens.expires_in ?? 3600) * 1000,
        })

        cache = { at: 0, events: [], calendars: [] }

        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(
          "<h1>Connected to Google Calendar</h1><p>You can close this window and return to notch.</p>",
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
        scope: SCOPES,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
      })
      void shell.openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
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
  return snapshot({ force: true })
}

function getRedirectUri() {
  return getConfig().redirectUri
}

module.exports = {
  snapshot,
  startAuth,
  disconnect,
  isConfigured,
  isConnected,
  getRedirectUri,
}
