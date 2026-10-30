export type StravaActivitySummary = {
  id: number
  name: string
  type: string
  startDate: string
  distance: number
  movingTime: number
  elapsedTime?: number
  elevation: number
  averageSpeed: number
  maxSpeed?: number
  averageCadence?: number | null
  averageWatts?: number | null
  weightedAverageWatts?: number | null
  averageHeartrate?: number | null
  maxHeartrate?: number | null
  calories?: number | null
  kilojoules?: number | null
  elevHigh?: number | null
  elevLow?: number | null
  averageTemp?: number | null
  /** Estimated from Open-Meteo at activity start when Strava has no temp */
  weatherTempC?: number | null
  startLat?: number | null
  startLng?: number | null
  sufferScore?: number | null
  polyline: string | null
  url: string
  streams?: StravaActivityStreams | null
}

export type StravaActivityStreams = {
  time: number[]
  distance: number[]
  altitude?: number[]
  velocitySmooth?: number[]
  heartrate?: number[]
  cadence?: number[]
  watts?: number[]
  gradeSmooth?: number[]
  temp?: number[]
}

export type StravaCalendarCell = {
  inMonth: boolean
  date: string | null
  day: number | null
  activities: { id: number; type: string }[]
  isToday?: boolean
}

export type StravaCalendar = {
  monthLabel: string
  cells: StravaCalendarCell[]
  weekRows: { active: boolean }[]
  monthActivityCount: number
}

export type StravaHeatmapBounds = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export type StravaHeatmapRoute = {
  polyline: string
  type: string
}

export type StravaHeatmap = {
  bounds: StravaHeatmapBounds | null
  /** Encoded summary polylines with activity type for route-density overlay */
  routes: StravaHeatmapRoute[]
}

type StravaHeatmapPayload = StravaHeatmap & { polylines?: string[] }

/** Accept cached payloads that still use `polylines` (pre–activity-color heatmap). */
export function normalizeStravaHeatmap(
  heatmap: StravaHeatmapPayload | null | undefined,
): StravaHeatmap | null {
  if (!heatmap) return null
  if (heatmap.routes?.length) {
    return { bounds: heatmap.bounds, routes: heatmap.routes }
  }
  const legacy = heatmap.polylines?.filter(Boolean) ?? []
  if (legacy.length > 0 && heatmap.bounds) {
    return {
      bounds: heatmap.bounds,
      routes: legacy.map((polyline: string) => ({ polyline, type: "Run" })),
    }
  }
  return { bounds: heatmap.bounds ?? null, routes: [] }
}

export type StravaStats = {
  ytdRideDistance: number
  ytdRunDistance: number
  ytdSwimDistance: number
  recentRideDistance: number
  recentRunDistance: number
  recentSwimDistance: number
}

export type StravaStatus = {
  configured: boolean
  connected: boolean
  login: string | null
  avatarUrl: string | null
  athleteId: number | null
  stats: StravaStats | null
  streak: { weeks: number; activitiesInStreak: number } | null
  calendar: StravaCalendar | null
  calendarActivities: { id: number; type: string; startDate: string }[]
  heatmap: StravaHeatmap | null
  featuredActivity: StravaActivitySummary | null
  activities: StravaActivitySummary[]
  monthDistance: number
  message?: string
  error?: string
}

export function formatDistance(meters: number) {
  if (!meters || meters <= 0) return "0 km"
  const km = meters / 1000
  if (km >= 100) return `${Math.round(km)} km`
  if (km >= 10) return `${km.toFixed(1)} km`
  return `${km.toFixed(2)} km`
}

export function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0m"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatPace(secondsPerKm: number) {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return "—"
  const m = Math.floor(secondsPerKm / 60)
  const s = Math.round(secondsPerKm % 60)
  return `${m}:${String(s).padStart(2, "0")} /km`
}

export function formatSpeedKmh(metersPerSecond: number) {
  if (!metersPerSecond || !Number.isFinite(metersPerSecond)) return "—"
  return `${(metersPerSecond * 3.6).toFixed(1)} km/h`
}

export function activityKind(type: string): "run" | "ride" | "swim" | "workout" | "other" {
  const t = type.toLowerCase()
  if (t.includes("run") || t === "walk" || t === "hike") return "run"
  if (t.includes("ride") || t === "ebikeride") return "ride"
  if (t.includes("swim")) return "swim"
  if (
    t.includes("workout") ||
    t.includes("weight") ||
    t.includes("crossfit") ||
    t.includes("yoga") ||
    t.includes("pilates")
  ) {
    return "workout"
  }
  return "other"
}

const ACTIVITY_KINDS = new Set(["run", "ride", "swim", "workout", "other"])

export function activityRouteColor(
  kindOrType: ReturnType<typeof activityKind> | string,
): string {
  const kind =
    typeof kindOrType === "string" && ACTIVITY_KINDS.has(kindOrType)
      ? (kindOrType as ReturnType<typeof activityKind>)
      : activityKind(kindOrType)
  switch (kind) {
    case "ride":
      return "#2563eb"
    case "swim":
      return "#0891b2"
    case "workout":
      return "#9333ea"
    case "other":
      return "#64748b"
    case "run":
    default:
      return "#fc4c02"
  }
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function densifyRoutePoints(
  points: { lat: number; lng: number }[],
  stepMeters = 12,
): { lat: number; lng: number }[] {
  if (points.length < 2) return points
  const out: { lat: number; lng: number }[] = [points[0]]
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

export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number
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

export function polylineToSvgPath(
  encoded: string,
  width: number,
  height: number,
  padding = 8,
): string | null {
  const points = densifyRoutePoints(decodePolyline(encoded))
  if (points.length < 2) return null

  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLng = points[0].lng
  let maxLng = points[0].lng
  for (const p of points) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  }

  const midLat = (minLat + maxLat) / 2
  const lngScale = Math.cos((midLat * Math.PI) / 180)

  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const latSpan = maxLat - minLat || 0.001
  const lngSpan = (maxLng - minLng) * lngScale || 0.001

  const parts = points.map((p, i) => {
    const x = padding + (((p.lng - minLng) * lngScale) / lngSpan) * innerW
    const y = padding + (1 - (p.lat - minLat) / latSpan) * innerH
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
  })
  return parts.join(" ")
}

export function polylineToSvgPoints(
  encoded: string,
  width: number,
  height: number,
  padding = 8,
): { x: number; y: number }[] | null {
  const points = densifyRoutePoints(decodePolyline(encoded))
  if (points.length < 2) return null

  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLng = points[0].lng
  let maxLng = points[0].lng
  for (const p of points) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  }

  const midLat = (minLat + maxLat) / 2
  const lngScale = Math.cos((midLat * Math.PI) / 180)
  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const latSpan = maxLat - minLat || 0.001
  const lngSpan = (maxLng - minLng) * lngScale || 0.001

  return points.map((p) => ({
    x: padding + (((p.lng - minLng) * lngScale) / lngSpan) * innerW,
    y: padding + (1 - (p.lat - minLat) / latSpan) * innerH,
  }))
}

/** Densified lat/lng points for map playback and smooth SVG routes. */
export function buildStravaRoutePath(encoded: string): { lat: number; lng: number }[] {
  return densifyRoutePoints(decodePolyline(encoded))
}

const activityDetailCache = new Map<number, StravaActivitySummary>()
const activityDetailInflight = new Map<number, Promise<StravaActivitySummary>>()

export async function fetchStravaActivity(
  id: number,
  options?: { force?: boolean },
): Promise<StravaActivitySummary> {
  const bridge = window.notch?.strava
  if (!bridge?.activity) {
    throw new Error("not_electron")
  }

  if (options?.force) {
    activityDetailCache.delete(id)
    activityStreamsCache.delete(id)
  }

  const cached = activityDetailCache.get(id)
  if (cached && "streams" in cached) return cached
  if (cached) activityDetailCache.delete(id)

  const pending = activityDetailInflight.get(id)
  if (pending) return pending

  const request = bridge.activity(id).then(async (activity) => {
    let streams = activity.streams ?? null
    if (activity.polyline && streams == null) {
      streams = await fetchStravaActivityStreams(id, { force: options?.force })
    }
    const merged = { ...activity, streams }
    activityDetailCache.set(id, merged)
    activityDetailInflight.delete(id)
    return merged
  })

  activityDetailInflight.set(id, request)
  try {
    return await request
  } catch (err) {
    activityDetailInflight.delete(id)
    throw err
  }
}

const activityStreamsCache = new Map<number, StravaActivityStreams | null>()
const activityStreamsInflight = new Map<number, Promise<StravaActivityStreams | null>>()

export async function fetchStravaActivityStreams(
  id: number,
  options?: { force?: boolean },
): Promise<StravaActivityStreams | null> {
  const bridge = window.notch?.strava
  if (!bridge?.activityStreams) {
    return null
  }

  if (options?.force) {
    activityStreamsCache.delete(id)
  } else if (activityStreamsCache.has(id)) {
    return activityStreamsCache.get(id) ?? null
  }

  const pending = activityStreamsInflight.get(id)
  if (pending) return pending

  const request = bridge.activityStreams(id).then((streams) => {
    activityStreamsInflight.delete(id)
    if (streams) activityStreamsCache.set(id, streams)
    return streams
  })

  activityStreamsInflight.set(id, request)
  try {
    return await request
  } catch {
    activityStreamsInflight.delete(id)
    activityStreamsCache.set(id, null)
    return null
  }
}

export async function fetchStravaStatus(options?: { force?: boolean }): Promise<StravaStatus> {
  const bridge = window.notch?.strava
  if (!bridge) {
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
      error: "not_electron",
    }
  }
  return bridge.status(options)
}

export function openStravaUrl(url: string) {
  void window.notch?.strava?.openUrl(url)
}
