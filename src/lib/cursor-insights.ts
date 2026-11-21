import type { GitHubContributionWeek } from "./github"
import { formatCursorCents } from "./cursor"

export type CursorUsageDay = {
  date: string
  count: number
  spendCents?: number
}

export type CursorUsageWeek = CursorUsageDay[]

export type CursorUsageYear = {
  year: number
  total: number
  totalCents: number
  weeks: CursorUsageWeek[]
}

export type CursorTopModelInsight = {
  model: string
  label: string
  events: number
  cents: number
}

export type CursorMonthlyUsage = {
  month: string
  events: number
  cents: number
}

export type CursorActivityInsights = {
  configured: boolean
  connected: boolean
  ready: boolean
  years: number[]
  chartYear: number
  weeks: CursorUsageWeek[]
  days: CursorUsageDay[]
  totalEvents: number
  totalCents: number
  topModels: CursorTopModelInsight[]
  monthly: CursorMonthlyUsage[]
  yearsData: CursorUsageYear[]
  eventsInYear?: number | null
  eventsSampled?: number | null
  syncedAt?: number | null
  error?: string
}

const currentYear = () => new Date().getFullYear()

export const idleCursorInsights: CursorActivityInsights = {
  configured: false,
  connected: false,
  ready: false,
  years: [],
  chartYear: currentYear(),
  weeks: [],
  days: [],
  totalEvents: 0,
  totalCents: 0,
  topModels: [],
  monthly: [],
  yearsData: [],
}

export async function fetchCursorInsights(options?: {
  force?: boolean
  year?: number
}): Promise<CursorActivityInsights> {
  const bridge = window.notch?.cursor
  if (!bridge?.insights) {
    return {
      ...idleCursorInsights,
      error: "no_electron",
    }
  }
  const data = await bridge.insights(options)
  return normalizeCursorInsights(data)
}

function normalizeCursorInsights(
  data: Partial<CursorActivityInsights> | undefined,
): CursorActivityInsights {
  if (!data) return { ...idleCursorInsights, error: "insights_unavailable" }
  return {
    configured: data.configured ?? false,
    connected: data.connected ?? false,
    ready: data.ready ?? false,
    years: data.years ?? [],
    chartYear: data.chartYear ?? currentYear(),
    weeks: data.weeks ?? [],
    days: data.days ?? [],
    totalEvents: data.totalEvents ?? 0,
    totalCents: data.totalCents ?? 0,
    topModels: data.topModels ?? [],
    monthly: data.monthly ?? [],
    yearsData: data.yearsData ?? [],
    eventsInYear: data.eventsInYear,
    eventsSampled: data.eventsSampled,
    syncedAt: data.syncedAt,
    error: data.error,
  }
}

export function formatCursorUsageHeatmapCount(count: number) {
  if (count <= 0) return "No usage"
  if (count === 1) return "1 request"
  return `${count.toLocaleString()} requests`
}

export function formatCursorHeroTotal(events: number, cents: number) {
  if (events <= 0) return formatCursorCents(0)
  return `${events.toLocaleString()} requests · ${formatCursorCents(cents)} est.`
}

export type CursorHeroPeriod = number | "rolling"

export type CursorHeroView = {
  weeks: GitHubContributionWeek[]
  totalEvents: number
  totalCents: number
  periodLabel: string
}

export function listCursorHeroYearOptions(years: number[], fallbackYear: number): number[] {
  const merged = new Set([fallbackYear, ...years])
  return [...merged].sort((a, b) => b - a)
}

export function resolveCursorHeroView(
  period: CursorHeroPeriod,
  yearsData: CursorUsageYear[],
  rollingWeeks: GitHubContributionWeek[] | null,
): CursorHeroView | null {
  if (period === "rolling") {
    if (!rollingWeeks?.length) return null
    let totalEvents = 0
    let totalCents = 0
    for (const week of rollingWeeks) {
      for (const day of week) {
        if (!day?.date) continue
        totalEvents += day.count ?? 0
        totalCents += (day as CursorUsageDay).spendCents ?? 0
      }
    }
    return {
      weeks: rollingWeeks,
      totalEvents,
      totalCents,
      periodLabel: "last 52 weeks",
    }
  }

  const row = yearsData.find((y) => y.year === period)
  if (!row?.weeks?.length) return null
  return {
    weeks: row.weeks,
    totalEvents: row.total,
    totalCents: row.totalCents,
    periodLabel: String(period),
  }
}

/** Last 53 week columns from merged calendar-year day rows. */
export function buildRollingUsageWeeks(days: CursorUsageDay[]): GitHubContributionWeek[] {
  if (!days.length) return []
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const lastDate = sorted[sorted.length - 1].date
  const end = new Date(`${lastDate}T12:00:00Z`)
  const gridEnd = new Date(end)
  const endDow = gridEnd.getUTCDay()
  if (endDow < 6) gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - endDow))
  const gridStart = new Date(gridEnd)
  gridStart.setUTCDate(gridStart.getUTCDate() - 7 * 52)

  const byDate = new Map(sorted.map((d) => [d.date, d]))
  const weeks: GitHubContributionWeek[] = []
  const cursor = new Date(gridStart)

  while (cursor <= gridEnd) {
    const column: CursorUsageDay[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor)
      d.setUTCDate(cursor.getUTCDate() + i)
      const key = d.toISOString().slice(0, 10)
      const hit = byDate.get(key)
      column.push(
        hit
          ? { date: key, count: hit.count, spendCents: hit.spendCents ?? 0 }
          : { date: key, count: 0, spendCents: 0 },
      )
    }
    weeks.push(column)
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  return weeks.slice(-53)
}