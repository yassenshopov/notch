import type { AppSettings, ClockFormat } from "../config/settings"
import type { CursorStatus } from "./cursor"
import { formatHour } from "./utils"
import type { WeatherCode, WeatherSnapshot } from "./weather"

export type LiveActivityPanel = "weather" | "cursor"

export type LiveActivityKind = "weather-precip" | "cursor-usage"

export type LiveActivity = {
  id: string
  kind: LiveActivityKind
  panel: LiveActivityPanel
  /** Full line in the expanded-width pill */
  label: string
  priority: number
  weatherCode?: WeatherCode
  isDay?: boolean
}

const PRECIP_CODES = new Set<WeatherCode>(["drizzle", "rain", "snow", "thunder"])

function precipLabel(code: WeatherCode): string {
  switch (code) {
    case "snow":
      return "Snow"
    case "thunder":
      return "Storms"
    case "drizzle":
      return "Drizzle"
    default:
      return "Rain"
  }
}

function formatPrecipActivity(
  code: WeatherCode,
  kind: "now" | "soon",
  startsAt: string,
  minutesUntil: number,
  clockFormat: ClockFormat,
): string {
  const name = precipLabel(code)
  if (kind === "now") return `${name} now`
  if (minutesUntil <= 90) return `${name} in ${minutesUntil}m`
  return `${name} · ${formatHour(startsAt, clockFormat)}`
}

function isWeatherPrecipSnoozed(cfg: AppSettings["liveActivities"]["weather"], activityId: string) {
  return cfg.snoozedUntilMs > Date.now() && cfg.snoozedForId === activityId
}

export function snoozeWeatherPrecipActivity(
  settings: AppSettings,
  activityId: string,
): AppSettings["liveActivities"]["weather"] {
  const cfg = settings.liveActivities.weather
  return {
    ...cfg,
    snoozedUntilMs: Date.now() + Math.max(5 * 60_000, cfg.remindAfterMs),
    snoozedForId: activityId,
  }
}

export function collectWeatherPrecipActivity(
  data: WeatherSnapshot,
  settings: AppSettings,
): LiveActivity | null {
  const cfg = settings.liveActivities.weather
  if (!settings.liveActivities.enabled || !cfg.enabled) return null

  const nowMs = Date.now()
  const lookaheadMs = cfg.lookaheadMinutes * 60 * 1000
  const minProb = cfg.minPrecipProbability

  if (PRECIP_CODES.has(data.code)) {
    const point = data.upcomingHours[0]
    const id = `weather-now-${data.code}`
    if (isWeatherPrecipSnoozed(cfg, id)) return null
    return {
      id,
      kind: "weather-precip",
      panel: "weather",
      label: formatPrecipActivity(data.code, "now", point?.time ?? "", 0, settings.clock.format),
      priority: 40,
      weatherCode: data.code,
      isDay: data.isDay,
    }
  }

  for (const point of data.upcomingHours) {
    const t = new Date(point.time).getTime()
    if (t < nowMs) continue
    if (t - nowMs > lookaheadMs) break

    const wetCode = PRECIP_CODES.has(point.code)
    const wetProb = point.precipProbability >= minProb
    if (!wetCode && !wetProb) continue

    const minutesUntil = Math.max(1, Math.round((t - nowMs) / 60_000))
    const code = wetCode ? point.code : "rain"
    const id = `weather-soon-${point.time}`
    if (isWeatherPrecipSnoozed(cfg, id)) return null
    return {
      id,
      kind: "weather-precip",
      panel: "weather",
      label: formatPrecipActivity(code, "soon", point.time, minutesUntil, settings.clock.format),
      priority: 35,
      weatherCode: code,
      isDay: point.isDay,
    }
  }

  return null
}

/** How long to hide cursor usage alerts after the user dismisses them */
export function snoozeCursorUsageUntilMs(status: CursorStatus | null): number {
  const end = status?.billing?.cycleEnd
  if (end) {
    const t = new Date(end).getTime()
    if (Number.isFinite(t) && t > Date.now()) return t
  }
  return Date.now() + 24 * 60 * 60 * 1000
}

export function collectCursorUsageActivity(
  status: CursorStatus,
  settings: AppSettings,
): LiveActivity | null {
  const cfg = settings.liveActivities.cursor
  if (!settings.liveActivities.enabled || !cfg.enabled) return null
  if (cfg.snoozedUntilMs > Date.now()) return null
  if (!status.connected || !status.usage?.enabled) return null
  if (status.billing?.isUnlimited) return null

  const pct = Math.round(status.usage.totalPercentUsed)
  const threshold = settings.cursor.usageWarningPercent
  if (pct < threshold) return null

  return {
    id: `cursor-usage-${pct}`,
    kind: "cursor-usage",
    panel: "cursor",
    label: `Cursor ${pct}% used`,
    priority: 100,
  }
}

export function collectLiveActivities(
  data: WeatherSnapshot | null,
  cursor: CursorStatus | null,
  settings: AppSettings,
): LiveActivity[] {
  if (!settings.liveActivities.enabled) return []

  const items: LiveActivity[] = []
  if (data) {
    const weather = collectWeatherPrecipActivity(data, settings)
    if (weather) items.push(weather)
  }
  if (cursor) {
    const usage = collectCursorUsageActivity(cursor, settings)
    if (usage) items.push(usage)
  }

  return items.sort((a, b) => b.priority - a.priority)
}
