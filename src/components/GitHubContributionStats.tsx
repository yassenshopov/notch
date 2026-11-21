import { useMemo, type ReactNode } from "react"
import type {
  GitHubContributionWeek,
  GitHubContributionYear,
  GitHubReposCreatedStats,
} from "../lib/github"
import {
  activeContributionDays,
  bestContributionDay,
  currentContributionStreak,
  iterContributionDays,
  longestContributionStreak,
  sumContributionsInDays,
} from "../lib/github-contribution-stats"
import { cn, formatShortDate } from "../lib/utils"
import { AnimatedNumber } from "./AnimatedNumber"

type Props = {
  weeks: GitHubContributionWeek[]
  years?: GitHubContributionYear[]
  /** GitHub profile graph total for the rolling year window. */
  total12Months?: number
  reposCreated?: GitHubReposCreatedStats
  className?: string
  /** Looser tiles without heavy card chrome (fullscreen hero layout). */
  bare?: boolean
  /** Contribution stats window; omit or 365 = trailing year; Infinity = all days in `weeks`. */
  statsWindowDays?: number
}

function reposCreatedHint(created: GitHubReposCreatedStats | undefined) {
  if (created?.count == null) {
    return { count: null as number | null, hint: "Public repos you created this calendar year" }
  }
  const { count, year, priorYear, priorCount, delta } = created
  let hint = `${count} ${count === 1 ? "repo" : "repos"} created in ${year}`
  if (delta != null && priorCount != null) {
    const sign = delta >= 0 ? "+" : ""
    hint += ` · ${sign}${delta} vs ${priorCount} in ${priorYear}`
  }
  return { count, hint }
}

export function GitHubContributionStats({
  weeks,
  years: _years = [],
  total12Months,
  reposCreated,
  className,
  bare,
  statsWindowDays = 365,
}: Props) {
  const stats = useMemo(() => {
    const windowDays = statsWindowDays
    const activeDays = activeContributionDays(weeks, windowDays)
    const best = bestContributionDay(weeks, windowDays)
    const streak = currentContributionStreak(weeks)
    const longest = longestContributionStreak(weeks)
    const allDays = iterContributionDays(weeks)
    const total =
      total12Months ??
      (Number.isFinite(windowDays)
        ? sumContributionsInDays(weeks, windowDays)
        : allDays.reduce((sum, d) => sum + d.count, 0))
    const dayCount = Number.isFinite(windowDays)
      ? Math.min(windowDays, allDays.length)
      : allDays.length
    return { activeDays, best, streak, longest, total, dayCount }
  }, [weeks, total12Months, statsWindowDays])

  const createdKpi = reposCreatedHint(reposCreated)

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      <StatCard
        bare={bare}
        label="Contributions"
        value={
          <AnimatedNumber value={stats.total} format={(n) => n.toLocaleString()} className="text-[20px] font-bold tracking-tight" />
        }
        hint={
          stats.best
            ? `${stats.activeDays} active days · peak ${formatShortDate(stats.best.date)} (${stats.best.count})`
            : `${stats.activeDays} active days in this period`
        }
      />
      <StatCard
        bare={bare}
        label="Active days"
        value={
          <AnimatedNumber
            value={stats.activeDays}
            format={(n) => n.toLocaleString()}
            className="text-[20px] font-bold tracking-tight"
          />
        }
        hint={
          stats.total > 0 && stats.dayCount > 0
            ? `${Math.round((stats.activeDays / stats.dayCount) * 100)}% of days with activity`
            : "Days with at least one contribution"
        }
      />
      <StatCard
        bare={bare}
        label="Streak"
        value={
          <AnimatedNumber
            value={stats.streak}
            suffix="d"
            className="text-[20px] font-bold tracking-tight"
          />
        }
        hint={
          stats.longest > stats.streak
            ? `Personal best ${stats.longest}d`
            : stats.streak > 0
              ? "Current run — keep it going"
              : "No active streak"
        }
      />
      <StatCard
        bare={bare}
        label="Repos created"
        value={
          <AnimatedNumber
            value={createdKpi.count}
            prefix={createdKpi.count != null && createdKpi.count > 0 ? "+" : ""}
            format={(n) => String(n)}
            className="text-[20px] font-bold tracking-tight"
          />
        }
        hint={createdKpi.hint}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  bare,
}: {
  label: string
  value: ReactNode
  hint?: string
  bare?: boolean
}) {
  return (
    <div
      className={cn(
        bare
          ? "border-t border-black/10 pt-4 dark:border-white/10"
          : "rounded-2xl border border-black/[0.07] bg-black/[0.02] px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
        {label}
      </p>
      <p className="mt-1">{value}</p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-black/40 dark:text-white/40">{hint}</p>
      ) : null}
    </div>
  )
}