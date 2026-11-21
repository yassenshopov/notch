import type { AppSettings } from "../config/settings"
import type { CalendarEvent } from "./calendar"
import type { CursorStatus } from "./cursor"
import { computeCursorCyclePace, formatCursorUsageAlert } from "./cursor-cycle"
import type { GitHubStatus } from "./github"
import { collectWeatherPrecipActivity } from "./live-activities"
import type { NotchPanel } from "./panel-routing"
import type { WeatherSnapshot } from "./weather"

export type OverviewInsight = {
  id: string
  label: string
  panel: NotchPanel
  priority: number
}

export function collectOverviewInsights(args: {
  settings: AppSettings
  weather: WeatherSnapshot | null
  calendar: CalendarEvent[]
  github: GitHubStatus
  cursor: CursorStatus
  now?: number
}): OverviewInsight[] {
  const { settings, weather, calendar, github, cursor } = args
  const now = args.now ?? Date.now()
  const out: OverviewInsight[] = []

  if (weather) {
    const precip = collectWeatherPrecipActivity(weather, settings)
    if (precip) {
      out.push({
        id: precip.id,
        label: precip.label,
        panel: "weather",
        priority: precip.priority,
      })
    }
  }

  const pace = cursor.usage ? computeCursorCyclePace(cursor.usage, cursor.billing) : null
  const cursorAlert =
    cursor.connected && cursor.usage
      ? formatCursorUsageAlert(cursor.usage, pace, settings.cursor.usageWarningPercent)
      : null
  if (cursorAlert) {
    out.push({
      id: cursorAlert.id,
      label: cursorAlert.label,
      panel: "cursor",
      priority: 50,
    })
  }

  const notifCount = github.notifications?.length ?? 0
  if (github.connected && notifCount > 0) {
    out.push({
      id: `github-inbox-${notifCount}`,
      label: `${notifCount} GitHub notification${notifCount === 1 ? "" : "s"}`,
      panel: "github",
      priority: 30,
    })
  }

  const prCount = github.pullRequests?.length ?? 0
  if (github.connected && prCount > 0) {
    out.push({
      id: `github-prs-${prCount}`,
      label: `${prCount} open pull request${prCount === 1 ? "" : "s"}`,
      panel: "github",
      priority: 25,
    })
  }

  for (const event of calendar) {
    const start = new Date(event.start).getTime()
    const mins = (start - now) / 60_000
    if (mins < 0 || mins > 45) continue
    const title = event.summary?.trim() || "Event"
    out.push({
      id: `cal-soon-${event.id}`,
      label: mins <= 1 ? `${title} starts now` : `${title} in ${Math.round(mins)}m`,
      panel: "calendar",
      priority: 60,
    })
    break
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, 4)
}

export function overviewGreeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export function formatOverviewDate(now = new Date()): string {
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}