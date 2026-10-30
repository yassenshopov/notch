import { useMemo } from "react"
import type { GitHubContributionWeek, GitHubContributionYear } from "../lib/github"
import {
  currentContributionStreak,
  longestContributionStreak,
  rollingContributionAverage,
  yearToDateComparison,
} from "../lib/github-contribution-stats"
import { cn } from "../lib/utils"

type Props = {
  weeks: GitHubContributionWeek[]
  years?: GitHubContributionYear[]
  className?: string
}

export function GitHubContributionStats({ weeks, years = [], className }: Props) {
  const stats = useMemo(() => {
    const ytd = yearToDateComparison(weeks)
    const yearRows = years.slice().sort((a, b) => b.year - a.year)
    const fullYearCurrent = yearRows.find((y) => y.year === ytd.year)?.total
    const fullYearPrev = yearRows.find((y) => y.year === ytd.prevYear)?.total
    return {
      streak: currentContributionStreak(weeks),
      longest: longestContributionStreak(weeks),
      rolling28: rollingContributionAverage(weeks, 28),
      ytd,
      fullYearCurrent,
      fullYearPrev,
    }
  }, [weeks, years])

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      <StatCard
        label="Current streak"
        value={`${stats.streak}d`}
        hint={`Longest ${stats.longest}d`}
      />
      <StatCard
        label="28-day avg"
        value={stats.rolling28 < 10 ? stats.rolling28.toFixed(1) : Math.round(stats.rolling28).toString()}
        hint="contributions / day"
      />
      <StatCard
        label={`${stats.ytd.year} YTD`}
        value={stats.ytd.current.toLocaleString()}
        hint={
          stats.ytd.previous > 0
            ? `${stats.ytd.delta >= 0 ? "+" : ""}${stats.ytd.delta.toLocaleString()} vs ${stats.ytd.prevYear} (${stats.ytd.deltaPct >= 0 ? "+" : ""}${stats.ytd.deltaPct}%)`
            : "vs same period last year"
        }
      />
      <StatCard
        label="Full years"
        value={
          stats.fullYearCurrent != null
            ? `${stats.ytd.year} ${stats.fullYearCurrent.toLocaleString()}`
            : "—"
        }
        hint={
          stats.fullYearPrev != null
            ? `${stats.ytd.prevYear} ${stats.fullYearPrev.toLocaleString()}`
            : undefined
        }
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-black/[0.02] px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-bold tabular-nums tracking-tight">{value}</p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-black/40 dark:text-white/40">{hint}</p>
      ) : null}
    </div>
  )
}
