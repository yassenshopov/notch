import type { GitHubContributionWeek, GitHubContributionYear, GitHubContributions } from "./github"

export type GitHubHeroPeriod = number | "all" | "rolling"

export type HeroContributionView = {
  weeks: GitHubContributionWeek[]
  total: number
  heatmapVariant: "desktop" | "year"
  weekLimit?: number
  periodLabel: string
  statsWindowDays: number
}

export function listHeroYearOptions(years: GitHubContributionYear[], currentYear: number): number[] {
  const fromInsights = years.map((y) => y.year)
  const merged = new Set([currentYear, ...fromInsights])
  return [...merged].sort((a, b) => b - a)
}

export function resolveHeroContributionView(
  period: GitHubHeroPeriod,
  years: GitHubContributionYear[],
  rollingFallback: GitHubContributions | null,
  currentYear: number,
): HeroContributionView | null {
  if (period === "rolling") {
    if (!rollingFallback?.weeks?.length) return null
    return {
      weeks: rollingFallback.weeks,
      total: rollingFallback.total,
      heatmapVariant: "desktop",
      weekLimit: 53,
      periodLabel: "last 52 weeks",
      statsWindowDays: 365,
    }
  }

  if (period === "all") {
    if (!years.length) return null
    const sorted = [...years].sort((a, b) => a.year - b.year)
    return {
      weeks: sorted.flatMap((y) => y.weeks),
      total: sorted.reduce((sum, y) => sum + y.total, 0),
      heatmapVariant: "desktop",
      weekLimit: Number.POSITIVE_INFINITY,
      periodLabel: "all time",
      statsWindowDays: Number.POSITIVE_INFINITY,
    }
  }

  const row = years.find((y) => y.year === period)
  if (row) {
    return {
      weeks: row.weeks,
      total: row.total,
      heatmapVariant: "desktop",
      weekLimit: Number.POSITIVE_INFINITY,
      periodLabel: String(period),
      statsWindowDays:
        period === currentYear
          ? numberOfDaysInCalendarYear(currentYear)
          : Number.POSITIVE_INFINITY,
    }
  }

  return null
}

function numberOfDaysInCalendarYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}