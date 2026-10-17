export type StravaActivitySummary = {
  id: number
  name: string
  type: string
  startDate: string
  distance: number
  movingTime: number
  elevation: number
  averageSpeed: number
  polyline: string | null
  url: string
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

export type StravaHeatmap = {
  gridSize: number
  cells: { x: number; y: number; intensity: number }[]
  bounds: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  } | null
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
  const points = decodePolyline(encoded)
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

  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const latSpan = maxLat - minLat || 0.001
  const lngSpan = maxLng - minLng || 0.001

  const parts = points.map((p, i) => {
    const x = padding + ((p.lng - minLng) / lngSpan) * innerW
    const y = padding + (1 - (p.lat - minLat) / latSpan) * innerH
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
  })
  return parts.join(" ")
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
