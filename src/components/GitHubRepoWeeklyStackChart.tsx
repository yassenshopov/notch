import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { GitHubRepoWeekBucket, GitHubRepoWeeklyStack } from "../lib/github"
import {
  formatContributionCount,
  formatRepoMonthLabel,
  formatWeekStartLabel,
  shortRepoName,
} from "../lib/github"
import { clampFixedTooltipPosition } from "../lib/chart-tooltip-position"
import { GitHubDayRepoPieChart } from "./GitHubDayRepoPieChart"
import { useSettings } from "../config/settings-store"
import {
  GITHUB_REPO_OTHER_COLOR,
  resolveRepoColor,
} from "../lib/github-repo-colors"
import {
  bucketsForRepoStackGranularity,
  type RepoStackGranularity,
} from "../lib/github-repo-stack-granularity"
import { SegmentedControl } from "./SegmentedControl"
import { cn } from "../lib/utils"

type StackMode = "count" | "mix"

type Props = {
  data: GitHubRepoWeeklyStack
  loading?: boolean
  className?: string
}

const OTHER_KEY = "__other__"

type HoverState = {
  index: number
  anchorX: number
  anchorY: number
}

const GRANULARITY_META: Record<
  RepoStackGranularity,
  { title: string; subtitle: string; aria: string; loading: string }
> = {
  daily: {
    title: "Repo mix",
    subtitle: "Daily commit split · last 45 days",
    aria: "Daily stacked bar chart of repository commits",
    loading: "Loading daily repo breakdown…",
  },
  weekly: {
    title: "Repo mix",
    subtitle: "Weekly commit split · last 365 days",
    aria: "Weekly stacked bar chart of repository commits",
    loading: "Loading weekly repo breakdown… (first load can take about a minute)",
  },
  monthly: {
    title: "Repo mix",
    subtitle: "Monthly commit split · last 12 months",
    aria: "Monthly stacked bar chart of repository commits",
    loading: "Loading monthly view…",
  },
}

export function GitHubRepoWeeklyStackChart({ data, loading, className }: Props) {
  const [granularity, setGranularity] = useState<RepoStackGranularity>("weekly")
  const [mode, setMode] = useState<StackMode>("count")
  const [hover, setHover] = useState<HoverState | null>(null)
  const settings = useSettings()
  const repoColors = settings.github.repoColors

  const buckets = useMemo(
    () => bucketsForRepoStackGranularity(granularity, data.weeks, data.days),
    [granularity, data.weeks, data.days],
  )

  const topRepos = useMemo(() => {
    const list = [...data.topRepos]
    const hasOther = buckets.some((w) => w.repos.some((r) => r.repo === OTHER_KEY && r.count > 0))
    if (hasOther) list.push(OTHER_KEY)
    return list
  }, [data.topRepos, buckets])

  const repoColor = (repo: string, index: number) =>
    repo === OTHER_KEY ? GITHUB_REPO_OTHER_COLOR : resolveRepoColor(repo, index, repoColors)

  const maxTotal = useMemo(() => Math.max(1, ...buckets.map((w) => w.total)), [buckets])

  const axisTicks = useMemo(() => {
    const ticks = new Map<number, string>()
    if (granularity === "monthly") {
      buckets.forEach((w, i) => {
        ticks.set(i, formatRepoMonthLabel(w.weekStart.slice(0, 7)))
      })
      return ticks
    }
    let prevMonth = ""
    buckets.forEach((w, i) => {
      const month = w.weekStart.slice(0, 7)
      if (month !== prevMonth) {
        ticks.set(
          i,
          new Date(`${w.weekStart}T12:00:00`).toLocaleDateString(undefined, { month: "short" }),
        )
        prevMonth = month
      }
    })
    return ticks
  }, [buckets, granularity])

  const hoverBucket = hover != null ? buckets[hover.index] : null
  const meta = GRANULARITY_META[granularity]
  const waitingDaily = granularity === "daily" && !data.days?.length && (loading || data.weeks.length > 0)
  const showLoading = loading && buckets.length === 0

  if (showLoading || waitingDaily) {
    return (
      <section className={className}>
        <Header
          granularity={granularity}
          onGranularityChange={setGranularity}
          mode={mode}
          onModeChange={setMode}
          subtitle={meta.subtitle}
        />
        <p className="text-[12px] text-black/45 dark:text-white/45">{meta.loading}</p>
      </section>
    )
  }

  if (data.error && buckets.length === 0) {
    return (
      <section className={className}>
        <Header
          granularity={granularity}
          onGranularityChange={setGranularity}
          mode={mode}
          onModeChange={setMode}
          subtitle={meta.subtitle}
        />
        <p className="text-[12px] text-red-400/90">Couldn&apos;t load repo stacks ({data.error}).</p>
      </section>
    )
  }

  if (buckets.length === 0) {
    return (
      <section className={className}>
        <Header
          granularity={granularity}
          onGranularityChange={setGranularity}
          mode={mode}
          onModeChange={setMode}
          subtitle={meta.subtitle}
        />
        <p className="text-[12px] text-black/45 dark:text-white/45">No repo mix data yet.</p>
      </section>
    )
  }

  return (
    <section className={className} aria-labelledby="github-repo-stack-heading">
      <Header
        granularity={granularity}
        onGranularityChange={setGranularity}
        mode={mode}
        onModeChange={setMode}
        subtitle={meta.subtitle}
      />

      {hoverBucket && hover && typeof document !== "undefined"
        ? createPortal(
            <BucketStackTooltip
              bucket={hoverBucket}
              granularity={granularity}
              anchorX={hover.anchorX}
              anchorY={hover.anchorY}
            />,
            document.body,
          )
        : null}

      <div className="relative mt-2">
        <div
          className={cn(
            "flex h-40 items-stretch",
            granularity === "daily" ? "gap-px" : "gap-[2px] sm:gap-0.5",
          )}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label={meta.aria}
        >
          {buckets.map((bucket, bi) => {
            const counts = new Map(bucket.repos.map((r) => [r.repo, r.count]))
            const barHeightPct =
              mode === "count"
                ? bucket.total > 0
                  ? Math.max(4, (bucket.total / maxTotal) * 100)
                  : 0
                : bucket.total > 0
                  ? 100
                  : 0

            return (
              <div
                key={bucket.weekStart}
                className={cn(
                  "flex h-full flex-1 flex-col justify-end",
                  granularity === "daily" ? "min-w-0" : "min-w-[3px]",
                )}
              >
                {barHeightPct > 0 ? (
                  <div
                    className={cn(
                      "flex w-full min-h-[2px] flex-col justify-end rounded-md transition-opacity",
                      "gap-px",
                      hover != null && hover.index !== bi && "opacity-45",
                    )}
                    style={{ height: `${barHeightPct}%` }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHover({
                        index: bi,
                        anchorX: rect.left + rect.width / 2,
                        anchorY: rect.top,
                      })
                    }}
                  >
                    {topRepos.map((repo, ri) => {
                      const count = counts.get(repo) ?? 0
                      if (count <= 0) return null
                      return (
                        <div
                          key={repo}
                          className="w-full shrink-0 rounded-sm"
                          style={{
                            flex: `${count} 0 0`,
                            minHeight: count > 0 ? 2 : 0,
                            backgroundColor: repoColor(repo, ri),
                          }}
                        />
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        <div className={cn("mt-1 flex", granularity === "daily" ? "gap-px" : "gap-0.5")}>
          {buckets.map((w, i) => (
            <div
              key={w.weekStart}
              className={cn("flex-1 text-center", granularity === "daily" ? "min-w-0" : "min-w-[3px]")}
            >
              {axisTicks.has(i) ? (
                <span className="text-[9px] text-black/35 dark:text-white/35">{axisTicks.get(i)}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {topRepos.map((repo, i) => (
          <li key={repo} className="inline-flex items-center gap-1.5 text-[10px] text-black/55 dark:text-white/55">
            <span className="size-2 rounded-full" style={{ backgroundColor: repoColor(repo, i) }} aria-hidden />
            <span className="max-w-[8rem] truncate">
              {repo === OTHER_KEY ? "Other" : shortRepoName(repo)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Header({
  granularity,
  onGranularityChange,
  mode,
  onModeChange,
  subtitle,
}: {
  granularity: RepoStackGranularity
  onGranularityChange: (g: RepoStackGranularity) => void
  mode: StackMode
  onModeChange: (m: StackMode) => void
  subtitle: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2
          id="github-repo-stack-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40"
        >
          {GRANULARITY_META[granularity].title}
        </h2>
        <p className="mt-0.5 text-[11px] text-black/45 dark:text-white/45">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <SegmentedControl
          variant="chart"
          value={granularity}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
          onChange={onGranularityChange}
          aria-label="Time granularity"
        />
        <SegmentedControl
          variant="chart"
          value={mode}
          options={[
            { value: "count", label: "Volume" },
            { value: "mix", label: "Mix %" },
          ]}
          onChange={onModeChange}
          aria-label="Stack scale"
        />
      </div>
    </div>
  )
}

function periodHeading(bucket: GitHubRepoWeekBucket, granularity: RepoStackGranularity) {
  if (granularity === "daily") {
    return formatWeekStartLabel(bucket.weekStart)
  }
  if (granularity === "monthly") {
    const monthKey = bucket.weekStart.slice(0, 7)
    return formatRepoMonthLabel(monthKey)
  }
  return `Week of ${formatWeekStartLabel(bucket.weekStart)}`
}

function BucketStackTooltip({
  bucket,
  granularity,
  anchorX,
  anchorY,
}: {
  bucket: GitHubRepoWeekBucket
  granularity: RepoStackGranularity
  anchorX: number
  anchorY: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<{ left: number; top: number; transform: string } | null>(null)

  const reposForPie = useMemo(
    () => bucket.repos.filter((r) => r.count > 0),
    [bucket.repos],
  )

  useLayoutEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setStyle(
      clampFixedTooltipPosition(anchorX, anchorY, rect, {
        preferAbove: true,
        gap: 8,
      }),
    )
  }, [anchorX, anchorY, bucket.weekStart, bucket.total, reposForPie.length])

  const showPie = bucket.total > 0 && reposForPie.length > 0
  const heading = periodHeading(bucket, granularity)

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none fixed z-[9999] flex flex-col gap-0.5 rounded-xl border border-black/10 bg-[#f7f7f5] px-2.5 py-2 shadow-lg dark:border-white/12 dark:bg-[#111111]",
        showPie ? "max-w-[min(15.5rem,calc(100vw-2rem))]" : "max-w-[min(16rem,calc(100vw-2rem))]",
        !style && "invisible",
      )}
      style={
        style
          ? { left: style.left, top: style.top, transform: style.transform }
          : { left: anchorX, top: anchorY, transform: "translate(-50%, -100%)" }
      }
    >
      <span
        className="absolute -bottom-1.5 left-1/2 size-2.5 -translate-x-1/2 rotate-45 border border-black/10 border-l-0 border-t-0 bg-[#f7f7f5] dark:border-white/12 dark:bg-[#111111]"
        aria-hidden
      />
      <span className="text-[12px] font-semibold leading-snug text-black/85 dark:text-white/90">
        {heading}
      </span>
      <span className="text-[11px] tabular-nums text-black/55 dark:text-white/55">
        {formatContributionCount(bucket.total)}
      </span>
      {showPie ? (
        <GitHubDayRepoPieChart
          total={bucket.total}
          repos={reposForPie}
          className="mt-1.5 border-t border-black/8 pt-1.5 dark:border-white/10"
          size={68}
        />
      ) : (
        <p className="mt-1 text-[10px] leading-snug text-black/40 dark:text-white/40">
          No repo breakdown for this period.
        </p>
      )}
    </div>
  )
}