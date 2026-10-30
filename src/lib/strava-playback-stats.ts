import type { StravaRoutePlaybackGeometry } from "./strava-route-playback"
import {
  activityKind,
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeedKmh,
  type StravaActivityStreams,
  type StravaActivitySummary,
} from "./strava"

export type StravaPlaybackStat = {
  label: string
  value: string
  series?: number[]
  seriesIndex?: number
}

export type StravaPlaybackSnapshot = {
  progress: number
  distanceCurrent: string
  distanceTotal: string
  timeCurrent: string
  timeTotal: string
  clock: string | null
  live: StravaPlaybackStat[]
}

function clampProgress(progress: number) {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  return progress
}

function sampleAlong(
  anchor: number[],
  values: number[] | undefined,
  target: number,
): number | null {
  if (!values || values.length === 0 || anchor.length < 2) return null
  if (values.length === anchor.length) {
    if (target <= anchor[0]) return values[0]
    const last = anchor.length - 1
    if (target >= anchor[last]) return values[last]

    let hi = 1
    while (hi < anchor.length && anchor[hi] < target) hi++
    const lo = hi - 1
    const span = anchor[hi] - anchor[lo] || 1
    const t = (target - anchor[lo]) / span
    return values[lo] + (values[hi] - values[lo]) * t
  }

  return sampleStreamSeries(anchor, values, target)
}

function fractionalIndexAtDistance(distance: number[], target: number): number {
  if (distance.length <= 1) return 0
  if (target <= distance[0]) return 0
  const last = distance.length - 1
  if (target >= distance[last]) return last

  let hi = 1
  while (hi < distance.length && distance[hi] < target) hi++
  const lo = hi - 1
  const span = distance[hi] - distance[lo] || 1
  const t = (target - distance[lo]) / span
  return lo + t
}

function sampleStreamSeries(
  distance: number[],
  values: number[],
  targetDistance: number,
): number | null {
  if (!values.length || distance.length < 2) return null
  const frac = fractionalIndexAtDistance(distance, targetDistance)
  const mapped = (frac / (distance.length - 1)) * (values.length - 1)
  const lo = Math.floor(mapped)
  const hi = Math.min(values.length - 1, lo + 1)
  const t = mapped - lo
  const a = values[lo]
  const b = values[hi]
  if (!Number.isFinite(a) && !Number.isFinite(b)) return null
  if (!Number.isFinite(a)) return b
  if (!Number.isFinite(b)) return a
  return a + (b - a) * t
}

function playbackSampleDistance(
  activity: StravaActivitySummary,
  progress: number,
  streamDistance: number[],
  routeMeters: number,
): number {
  const p = clampProgress(progress)
  const streamMax = streamDistance[streamDistance.length - 1]
  const total =
    activity.distance > 0 ? activity.distance : streamMax > 0 ? streamMax : routeMeters
  const target = p * (total || streamMax)
  return Math.min(streamMax, Math.max(streamDistance[0], target))
}

function elevationGainToDistance(
  streams: StravaActivityStreams,
  targetDistance: number,
): number | null {
  const { distance, altitude } = streams
  if (!altitude || altitude.length !== distance.length) return null

  let gain = 0
  for (let i = 1; i < distance.length; i++) {
    if (distance[i] > targetDistance) break
    const delta = altitude[i] - altitude[i - 1]
    if (delta > 0) gain += delta
  }
  return gain
}

function instantSpeedFromGeometry(
  geometry: StravaRoutePlaybackGeometry,
  progress: number,
  movingTimeSeconds: number,
): number | null {
  if (movingTimeSeconds <= 0 || geometry.totalMeters <= 0) return null

  const p = clampProgress(progress)
  const target = p * geometry.totalMeters
  let hi = 1
  while (hi < geometry.cumulativeMeters.length && geometry.cumulativeMeters[hi] < target) {
    hi++
  }
  if (hi >= geometry.cumulativeMeters.length) hi = geometry.cumulativeMeters.length - 1
  const lo = Math.max(0, hi - 1)
  const segMeters = geometry.cumulativeMeters[hi] - geometry.cumulativeMeters[lo]
  if (segMeters <= 0) return null
  const segTime = (segMeters / geometry.totalMeters) * movingTimeSeconds
  if (segTime <= 0) return null
  return segMeters / segTime
}

function formatClockAtProgress(startDate: string, movingElapsedSeconds: number) {
  const start = new Date(startDate)
  if (Number.isNaN(start.getTime())) return "—"
  const at = new Date(start.getTime() + movingElapsedSeconds * 1000)
  return at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

function formatGrade(grade: number) {
  if (!Number.isFinite(grade)) return "—"
  const sign = grade > 0 ? "+" : ""
  return `${sign}${grade.toFixed(1)}%`
}

function formatTemp(celsius: number) {
  if (!Number.isFinite(celsius)) return "—"
  return `${Math.round(celsius)}°C`
}

function pushStat(stats: StravaPlaybackStat[], label: string, value: string | null | undefined) {
  if (value == null || value === "" || value === "—") return
  stats.push({ label, value })
}

function liveValue(value: string | null | undefined): string {
  if (value == null || value === "") return "—"
  return value
}

const SERIES_POINTS = 52

function progressSamples(count: number): number[] {
  if (count <= 1) return [0]
  return Array.from({ length: count }, (_, i) => i / (count - 1))
}

function fillSeries(count: number, value: number): number[] {
  return Array.from({ length: count }, () => value)
}

function estimatedActivityPowerW(activity: StravaActivitySummary): number | null {
  if (activity.averageWatts != null && activity.averageWatts > 0) return activity.averageWatts
  if (activity.weightedAverageWatts != null && activity.weightedAverageWatts > 0) {
    return activity.weightedAverageWatts
  }
  if (activity.kilojoules != null && activity.kilojoules > 0 && activity.movingTime > 0) {
    return (activity.kilojoules * 1000) / activity.movingTime
  }
  if (activity.calories != null && activity.calories > 0 && activity.movingTime > 0) {
    return (activity.calories * 4186) / activity.movingTime
  }
  return null
}

function estimatedActivityTempC(activity: StravaActivitySummary): number | null {
  if (activity.averageTemp != null && Number.isFinite(activity.averageTemp)) {
    return activity.averageTemp
  }
  if (activity.weatherTempC != null && Number.isFinite(activity.weatherTempC)) {
    return activity.weatherTempC
  }
  return null
}

function seriesFromStream(
  activity: StravaActivitySummary,
  streams: StravaActivityStreams,
  routeMeters: number,
  values: number[] | undefined,
  filter: (v: number) => boolean = () => true,
): number[] {
  const distance = streams.distance
  if (!values?.length || distance.length < 2) return []

  return progressSamples(SERIES_POINTS).map((p) => {
    const dist = playbackSampleDistance(activity, p, distance, routeMeters)
    const v = sampleAlong(distance, values, dist)
    return v != null && Number.isFinite(v) && filter(v) ? v : Number.NaN
  })
}

function interpolateSeriesGaps(series: number[]): number[] {
  const out = [...series]
  for (let i = 0; i < out.length; i++) {
    if (Number.isFinite(out[i])) continue
    let lo = i - 1
    let hi = i + 1
    while (lo >= 0 && !Number.isFinite(out[lo])) lo--
    while (hi < out.length && !Number.isFinite(out[hi])) hi++
    const a = lo >= 0 ? out[lo] : undefined
    const b = hi < out.length ? out[hi] : undefined
    if (a != null && b != null) {
      const t = (i - lo) / (hi - lo)
      out[i] = a + (b - a) * t
    } else if (a != null) out[i] = a
    else if (b != null) out[i] = b
  }
  return out
}

function paceSeriesFromVelocity(
  activity: StravaActivitySummary,
  geometry: StravaRoutePlaybackGeometry | null,
  streams: StravaActivityStreams | null,
  routeMeters: number,
  kind: ReturnType<typeof activityKind>,
): number[] {
  const samples = progressSamples(SERIES_POINTS)

  if (streams?.distance?.length) {
    const raw = seriesFromStream(
      activity,
      streams,
      routeMeters,
      streams.velocitySmooth,
      (v) => v > 0,
    )
    if (raw.some(Number.isFinite)) {
      return interpolateSeriesGaps(raw).map((v) =>
        kind === "run" ? 1000 / v : v * 3.6,
      )
    }
  }

  if (!geometry || activity.movingTime <= 0) return []

  return samples.map((p) => {
    const v = instantSpeedFromGeometry(geometry, p, activity.movingTime)
    if (v == null || v <= 0) return Number.NaN
    return kind === "run" ? 1000 / v : v * 3.6
  })
}

function formatPaceOrSpeedValue(
  kind: ReturnType<typeof activityKind>,
  raw: number,
): string | null {
  if (!Number.isFinite(raw) || raw <= 0) return null
  return kind === "run" ? formatPace(raw) : `${raw.toFixed(1)} km/h`
}

function buildLiveMetric(
  label: string,
  series: number[],
  progress: number,
  format: (v: number) => string | null,
): StravaPlaybackStat {
  const last = Math.max(0, series.length - 1)
  const seriesIndex = Math.round(clampProgress(progress) * last)
  const raw = series[seriesIndex]
  const value = Number.isFinite(raw) ? format(raw) : null

  return {
    label,
    value: liveValue(value),
    series: series.length >= 2 ? series : undefined,
    seriesIndex,
  }
}

export function buildStravaPlaybackSnapshot(
  activity: StravaActivitySummary,
  progress: number,
  geometry: StravaRoutePlaybackGeometry | null,
  streams: StravaActivityStreams | null,
): StravaPlaybackSnapshot {
  const p = clampProgress(progress)
  const kind = activityKind(activity.type)
  const paceLabel = kind === "run" ? "Pace" : "Speed"
  const routeMeters = geometry?.totalMeters ?? activity.distance
  const samples = progressSamples(SERIES_POINTS)

  const targetDistance =
    activity.distance > 0 ? p * activity.distance : p * (routeMeters || 0)
  const movingElapsed = activity.movingTime > 0 ? p * activity.movingTime : 0

  const distanceTotal =
    activity.distance > 0 ? formatDistance(activity.distance) : formatDistance(routeMeters)
  const distanceCurrent = formatDistance(targetDistance)
  const timeTotal =
    activity.movingTime > 0 ? formatDuration(activity.movingTime) : "—"
  const timeCurrent =
    activity.movingTime > 0 ? formatDuration(Math.round(movingElapsed)) : "—"
  const clock =
    activity.movingTime > 0
      ? formatClockAtProgress(activity.startDate, movingElapsed)
      : null

  const paceSeries = paceSeriesFromVelocity(activity, geometry, streams, routeMeters, kind)

  let hrSeries: number[] = []
  let elevSeries: number[] = []
  let cadenceSeries: number[] = []
  let powerSeries: number[] = []
  let gradeSeries: number[] = []
  let tempSeries: number[] = []
  let climbSeries: number[] = []

  if (streams?.distance?.length) {
    hrSeries = interpolateSeriesGaps(
      seriesFromStream(activity, streams, routeMeters, streams.heartrate, (v) => v > 0),
    )
    elevSeries = interpolateSeriesGaps(
      seriesFromStream(activity, streams, routeMeters, streams.altitude),
    )
    cadenceSeries = interpolateSeriesGaps(
      seriesFromStream(activity, streams, routeMeters, streams.cadence, (v) => v > 0),
    )
    powerSeries = interpolateSeriesGaps(
      seriesFromStream(activity, streams, routeMeters, streams.watts, (v) => v > 0),
    )
    gradeSeries = interpolateSeriesGaps(
      seriesFromStream(activity, streams, routeMeters, streams.gradeSmooth),
    )
    tempSeries = interpolateSeriesGaps(
      seriesFromStream(activity, streams, routeMeters, streams.temp),
    )

    climbSeries = samples.map((sampleP) => {
      const dist = playbackSampleDistance(activity, sampleP, streams.distance, routeMeters)
      const gain = elevationGainToDistance(streams, dist)
      return gain != null ? gain : Number.NaN
    })
  }

  if (!elevSeries.some(Number.isFinite)) {
    elevSeries = samples.map((sampleP) => {
      if (activity.elevLow != null && activity.elevHigh != null) {
        return activity.elevLow + (activity.elevHigh - activity.elevLow) * sampleP
      }
      return activity.elevation === 0 ? 0 : Number.NaN
    })
  }

  if (!climbSeries.some(Number.isFinite)) {
    climbSeries = samples.map((sampleP) => sampleP * activity.elevation)
  }

  const avgPower = estimatedActivityPowerW(activity)
  if (!powerSeries.some(Number.isFinite) && avgPower != null) {
    powerSeries = fillSeries(SERIES_POINTS, avgPower)
  }

  const avgTemp = estimatedActivityTempC(activity)
  if (!tempSeries.some(Number.isFinite) && avgTemp != null) {
    tempSeries = fillSeries(SERIES_POINTS, avgTemp)
  }

  const live: StravaPlaybackStat[] = [
    buildLiveMetric(paceLabel, paceSeries, p, (v) => formatPaceOrSpeedValue(kind, v)),
    buildLiveMetric("Heart rate", hrSeries, p, (v) =>
      v > 0 ? `${Math.round(v)} bpm` : null,
    ),
    buildLiveMetric("Elevation", elevSeries, p, (v) =>
      Number.isFinite(v) ? `${Math.round(v)} m` : null,
    ),
    buildLiveMetric("Cadence", cadenceSeries, p, (v) =>
      v > 0 ? `${Math.round(v)} ${kind === "ride" ? "rpm" : "spm"}` : null,
    ),
    buildLiveMetric("Power", powerSeries, p, (v) =>
      v > 0 ? `${Math.round(v)} W` : null,
    ),
    buildLiveMetric("Grade", gradeSeries, p, (v) =>
      Number.isFinite(v) ? formatGrade(v) : null,
    ),
    buildLiveMetric("Climb", climbSeries, p, (v) =>
      Number.isFinite(v) ? `${Math.round(v)} m` : null,
    ),
    buildLiveMetric("Temp", tempSeries, p, (v) =>
      Number.isFinite(v) ? formatTemp(v) : null,
    ),
  ]

  return {
    progress: p,
    distanceCurrent,
    distanceTotal,
    timeCurrent,
    timeTotal,
    clock,
    live,
  }
}

export function buildStravaActivityTotalStats(activity: StravaActivitySummary): StravaPlaybackStat[] {
  const kind = activityKind(activity.type)
  const stats: StravaPlaybackStat[] = []

  pushStat(stats, "Distance", formatDistance(activity.distance))
  pushStat(stats, "Moving time", formatDuration(activity.movingTime))
  if (activity.elapsedTime && activity.elapsedTime > activity.movingTime) {
    pushStat(stats, "Elapsed time", formatDuration(activity.elapsedTime))
  }

  if (kind === "run" && activity.distance > 0) {
    pushStat(stats, "Avg pace", formatPace(activity.movingTime / (activity.distance / 1000)))
  } else if (activity.averageSpeed > 0) {
    pushStat(stats, "Avg speed", formatSpeedKmh(activity.averageSpeed))
  }

  if (activity.maxSpeed != null && activity.maxSpeed > 0) {
    pushStat(stats, "Max speed", formatSpeedKmh(activity.maxSpeed))
  }

  pushStat(stats, "Elevation", `${Math.round(activity.elevation)} m`)

  if (activity.elevHigh != null && activity.elevLow != null) {
    pushStat(
      stats,
      "Elev range",
      `${Math.round(activity.elevLow)}–${Math.round(activity.elevHigh)} m`,
    )
  }

  if (activity.averageHeartrate != null && activity.averageHeartrate > 0) {
    pushStat(stats, "Avg HR", `${Math.round(activity.averageHeartrate)} bpm`)
  }
  if (activity.maxHeartrate != null && activity.maxHeartrate > 0) {
    pushStat(stats, "Max HR", `${Math.round(activity.maxHeartrate)} bpm`)
  }

  if (activity.averageCadence != null && activity.averageCadence > 0) {
    pushStat(
      stats,
      "Avg cadence",
      `${Math.round(activity.averageCadence)} ${kind === "ride" ? "rpm" : "spm"}`,
    )
  }

  if (activity.averageWatts != null && activity.averageWatts > 0) {
    pushStat(stats, "Avg power", `${Math.round(activity.averageWatts)} W`)
  }
  if (activity.weightedAverageWatts != null && activity.weightedAverageWatts > 0) {
    pushStat(stats, "Weighted power", `${Math.round(activity.weightedAverageWatts)} W`)
  }
  if (activity.kilojoules != null && activity.kilojoules > 0) {
    pushStat(stats, "Energy", `${Math.round(activity.kilojoules)} kJ`)
  }
  if (activity.calories != null && activity.calories > 0) {
    pushStat(stats, "Calories", `${Math.round(activity.calories)} kcal`)
  }
  if (activity.sufferScore != null && activity.sufferScore > 0) {
    pushStat(stats, "Suffer score", `${Math.round(activity.sufferScore)}`)
  }

  return stats
}
