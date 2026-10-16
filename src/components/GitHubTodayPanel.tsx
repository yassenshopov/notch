import { useMemo } from "react"
import type { GitHubContributionWeek, GitHubTodayBreakdown } from "../lib/github"
import {
  contributionCountForDate,
  localContributionDateKey,
  openGitHubUrl,
} from "../lib/github"
import { cn } from "../lib/utils"

type Props = {
  weeks?: GitHubContributionWeek[]
  breakdown: GitHubTodayBreakdown | null
  loading?: boolean
  className?: string
}

export function GitHubTodayPanel({ weeks = [], breakdown, loading, className }: Props) {
  const todayKey = localContributionDateKey()

  const total = useMemo(
    () => contributionCountForDate(weeks, todayKey),
    [weeks, todayKey],
  )

  const repos = breakdown?.repos ?? []
  const listed = useMemo(
    () => repos.reduce((sum, row) => sum + row.count, 0),
    [repos],
  )
  const other = Math.max(0, total - listed)
  const stale = Boolean(breakdown && breakdown.date !== todayKey)

  return (
    <section
      className={cn(
        "rounded-2xl border border-black/[0.07] bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.03]",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          Today
        </p>
        <span className="text-[11px] tabular-nums text-black/35 dark:text-white/35">
          {total}
        </span>
      </div>

      {loading && !breakdown ? (
        <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
          Loading today&apos;s activity…
        </p>
      ) : breakdown?.error ? (
        <p className="mt-2 text-[12px] text-red-400/90">
          Couldn&apos;t load repo breakdown ({breakdown.error}). Try refresh.
        </p>
      ) : stale ? (
        <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
          Updating today&apos;s activity…
        </p>
      ) : total === 0 && repos.length === 0 ? (
        <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
          No contributions yet today.
        </p>
      ) : repos.length === 0 ? (
        <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
          No public repo activity listed for today (private repos or other contribution types).
        </p>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-0.5">
          {repos.map((row) => (
            <li key={row.repo}>
              <button
                type="button"
                onClick={() => openGitHubUrl(row.url)}
                className="flex w-full items-baseline gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
              >
                <span
                  className="shrink-0 text-[12px] leading-none text-black/35 dark:text-white/35"
                  aria-hidden
                >
                  •
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                  {row.repo}
                </span>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-black/55 dark:text-white/55">
                  {row.count}
                </span>
              </button>
            </li>
          ))}
          {other > 0 ? (
            <li className="px-1 py-1 text-[11px] leading-snug text-black/38 dark:text-white/38">
              • Other / private / not listed — {other}
            </li>
          ) : null}
        </ul>
      )}
    </section>
  )
}
