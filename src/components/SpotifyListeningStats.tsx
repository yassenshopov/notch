import { useMemo, type ReactNode } from "react"
import type { GitHubContributionWeek } from "../lib/github"
import {
  activeContributionDays,
  bestContributionDay,
  currentContributionStreak,
  iterContributionDays,
  longestContributionStreak,
} from "../lib/github-contribution-stats"
import { formatListeningMinutes } from "../lib/spotify-insights"
import { cn, formatShortDate } from "../lib/utils"
import { AnimatedNumber } from "./AnimatedNumber"

type Props = {
  weeks: GitHubContributionWeek[]
  totalMinutes: number
  totalPlays: number
  totalMs: number
  className?: string
  bare?: boolean
}

export function SpotifyListeningStats({
  weeks,
  totalMinutes,
  totalPlays,
  totalMs,
  className,
  bare,
}: Props) {
  const stats = useMemo(() => {
    const windowDays = 365
    const activeDays = activeContributionDays(weeks, windowDays)
    const best = bestContributionDay(weeks, windowDays)
    const streak = currentContributionStreak(weeks)
    const longest = longestContributionStreak(weeks)
    const allDays = iterContributionDays(weeks)
    const dayCount = Math.min(windowDays, allDays.length)
    return { activeDays, best, streak, longest, dayCount }
  }, [weeks])

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      <StatCard
        bare={bare}
        label="Listening time"
        value={
          <span className="text-[20px] font-bold tracking-tight">
            {formatListeningMinutes(totalMs)}
          </span>
        }
        hint={`${totalMinutes.toLocaleString()} minutes in this year`}
      />
      <StatCard
        bare={bare}
        label="Active days"
        value={
          <AnimatedNumber
            value={stats.activeDays}
            className="text-[20px] font-bold tracking-tight"
          />
        }
        hint={`Days with at least one minute (${stats.dayCount}d window)`}
      />
      <StatCard
        bare={bare}
        label="Best day"
        value={
          <span className="text-[20px] font-bold tracking-tight">
            {stats.best && stats.best.count > 0
              ? `${stats.best.count.toLocaleString()} min`
              : "—"}
          </span>
        }
        hint={
          stats.best?.date
            ? `${formatShortDate(stats.best.date)} · streak ${stats.streak}d · best ${stats.longest}d`
            : "No listening yet"
        }
      />
      <StatCard
        bare={bare}
        label="Plays"
        value={
          <AnimatedNumber
            value={totalPlays}
            format={(n) => n.toLocaleString()}
            className="text-[20px] font-bold tracking-tight"
          />
        }
        hint="Stream events in export history"
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
  hint: string
  bare?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        !bare && "rounded-2xl border border-black/[0.06] bg-black/[0.02] p-4 dark:border-white/[0.08] dark:bg-white/[0.04]",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
        {label}
      </p>
      {value}
      <p className="text-[11px] leading-snug text-black/40 dark:text-white/40">{hint}</p>
    </div>
  )
}