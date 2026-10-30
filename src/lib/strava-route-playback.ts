export const STRAVA_ROUTE_PLAYBACK_SPEEDS = [1, 2, 4, 8] as const

export type StravaRoutePlaybackSpeed = (typeof STRAVA_ROUTE_PLAYBACK_SPEEDS)[number]

export type StravaRoutePoint = { lat: number; lng: number }

export type StravaRoutePlaybackGeometry = {
  points: StravaRoutePoint[]
  cumulativeMeters: number[]
  totalMeters: number
}

function haversineMeters(a: StravaRoutePoint, b: StravaRoutePoint): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function buildStravaRoutePlaybackGeometry(
  points: StravaRoutePoint[],
): StravaRoutePlaybackGeometry | null {
  if (points.length < 2) return null

  const cumulativeMeters: number[] = [0]
  let totalMeters = 0
  for (let i = 1; i < points.length; i++) {
    totalMeters += haversineMeters(points[i - 1], points[i])
    cumulativeMeters.push(totalMeters)
  }

  if (totalMeters <= 0) return null

  return { points, cumulativeMeters, totalMeters }
}

function clampProgress(progress: number) {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  return progress
}

export function routePointAtProgress(
  geometry: StravaRoutePlaybackGeometry,
  progress: number,
): StravaRoutePoint {
  const p = clampProgress(progress)
  if (p <= 0) return geometry.points[0]
  if (p >= 1) return geometry.points[geometry.points.length - 1]

  const target = p * geometry.totalMeters
  let hi = 1
  while (hi < geometry.cumulativeMeters.length && geometry.cumulativeMeters[hi] < target) {
    hi++
  }

  const lo = hi - 1
  const segStart = geometry.cumulativeMeters[lo]
  const segEnd = geometry.cumulativeMeters[hi]
  const span = segEnd - segStart || 1
  const t = (target - segStart) / span
  const a = geometry.points[lo]
  const b = geometry.points[hi]
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  }
}

/** Positions for a polyline from route start through `progress` (inclusive). */
export function routePositionsThroughProgress(
  geometry: StravaRoutePlaybackGeometry,
  progress: number,
): StravaRoutePoint[] {
  const p = clampProgress(progress)
  if (p <= 0) return [geometry.points[0]]

  const target = p * geometry.totalMeters
  const out: StravaRoutePoint[] = [geometry.points[0]]
  for (let i = 1; i < geometry.points.length; i++) {
    if (geometry.cumulativeMeters[i] <= target) {
      out.push(geometry.points[i])
      continue
    }
    out.push(routePointAtProgress(geometry, p))
    break
  }
  return out
}

/** Wall-clock time at 1× to play the full route (not activity moving time). */
export const STRAVA_ROUTE_PLAYBACK_WALL_MS = 24_000

export function playbackDurationMs(totalMeters: number): number {
  if (totalMeters <= 0) return STRAVA_ROUTE_PLAYBACK_WALL_MS
  const scaled = (totalMeters / 12_000) * STRAVA_ROUTE_PLAYBACK_WALL_MS
  return Math.min(36_000, Math.max(14_000, scaled))
}
