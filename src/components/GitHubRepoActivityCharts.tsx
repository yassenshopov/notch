import { useMemo, useState } from "react"
import type { GitHubRepoSeries, GitHubRepoTotal } from "../lib/github"
import { formatRepoMonthLabel, openGitHubUrl, shortRepoName } from "../lib/github"
import { cn } from "../lib/utils"
import { MetricChart } from "./MetricChart"

const SERIES_COLORS = [
  "rgba(17,17,17,0.85)",
  "rgba(17,17,17,0.62)",
  "rgba(17,17,17,0.48)",
  "rgba(17,17,17,0.36)",
  "rgba(17,17,17,0.28)",
]

const SERIES_COLORS_DARK = [
  "rgba(255,255,255,0.9)",
  "rgba(255,255,255,0.68)",
  "rgba(255,255,255,0.52)",
  "rgba(255,255,255,0.4)",
  "rgba(255,255,255,0.3)",
]

type ChartMode = "bar" | "line"

type Props = {
  year: number
  repoTotals: GitHubRepoTotal[]
  repoSeries: GitHubRepoSeries[]
  monthLabels: string[]
  dark?: boolean
  loading?: boolean
  error?: string
  onYearChange?: (year: number) => void
  yearOptions?: number[]
  className?: string
}

const VIEW_W = 100
const VIEW_H = 56

function MultiRepoLineChart({
  series,
  monthLabels,
  dark,
}: {
  series: GitHubRepoSeries[]
  monthLabels: string[]
  dark?: boolean
}) {
  const palette = dark ? SERIES_COLORS_DARK : SERIES_COLORS
  const paths = useMemo(() => {
    if (!series.length || !monthLabels.length) return []
    const max = Math.max(
      1,
      ...series.flatMap((s) => s.months.map((m) => m.count)),
    )
    const padY = 4
    const plotH = VIEW_H - padY * 2
    const n = monthLabels.length

    return series.slice(0, 5).map((row, si) => {
      const coords = monthLabels.map((key, i) => {
        const point = row.months.find((m) => m.month === key)
        const value = point?.count ?? 0
        const x = n === 1 ? VIEW_W / 2 : (i / (n - 1)) * VIEW_W
        const t = value / max
        const y = padY + (1 - t) * plotH
        return { x, y }
      })
      const d = coords
        .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
        .join(" ")
      return { repo: row.repo, url: row.url, d, color: palette[si % palette.length] }
    })
  }, [series, monthLabels, palette])

  if (!paths.length) {
    return (
      <p className="text-[12px] text-black/45 dark:text-white/45">No repo activity for this year.</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-36 w-full text-black/80 dark:text-white/85"
        role="img"
        aria-label="Monthly contributions by repository"
      >
        {paths.map((row) => (
          <path
            key={row.repo}
            d={row.d}
            fill="none"
            stroke={row.color}
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {paths.map((row, i) => (
          <li key={row.repo}>
            <button
              type="button"
              onClick={() => openGitHubUrl(row.url)}
              className="inline-flex items-center gap-1.5 text-[11px] text-black/55 hover:text-black/80 dark:text-white/55 dark:hover:text-white/85"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: palette[i % palette.length] }}
                aria-hidden
              />
              <span className="max-w-[9rem] truncate">{shortRepoName(row.repo)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex justify-between text-[10px] tabular-nums text-black/35 dark:text-white/35">
        {monthLabels.length > 0 ? (
          <>
            <span>{formatRepoMonthLabel(monthLabels[0])}</span>
            {monthLabels.length > 2 ? (
              <span>{formatRepoMonthLabel(monthLabels[Math.floor(monthLabels.length / 2)])}</span>
            ) : null}
            <span>{formatRepoMonthLabel(monthLabels[monthLabels.length - 1])}</span>
          </>
        ) : null}
      </div>
    </div>
  )
}

function RepoTotalsBarList({ totals }: { totals: GitHubRepoTotal[] }) {
  const max = Math.max(1, ...totals.map((r) => r.count))
  if (!totals.length) {
    return (
      <p className="text-[12px] text-black/45 dark:text-white/45">No repo activity for this year.</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {totals.map((row) => {
        const pct = Math.round((row.count / max) * 100)
        return (
          <li key={row.repo}>
            <button
              type="button"
              onClick={() => openGitHubUrl(row.url)}
              className="group flex w-full flex-col gap-1 text-left"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12px] font-medium group-hover:underline">
                  {row.repo}
                </span>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-black/55 dark:text-white/55">
                  {row.count}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-black/55 transition-[width] dark:bg-white/65"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function GitHubRepoActivityCharts({
  year,
  repoTotals,
  repoSeries,
  monthLabels,
  dark,
  loading,
  error,
  onYearChange,
  yearOptions,
  className,
}: Props) {
  const [mode, setMode] = useState<ChartMode>("bar")

  const lineAggregate = useMemo(() => {
    if (!repoSeries.length) return []
    const keys = monthLabels.length ? monthLabels : repoSeries[0]?.months.map((m) => m.month) ?? []
    return keys.map((key) => ({
      time: `${key}-15T12:00:00.000Z`,
      value: repoSeries.reduce((sum, row) => {
        const hit = row.months.find((m) => m.month === key)
        return sum + (hit?.count ?? 0)
      }, 0),
    }))
  }, [repoSeries, monthLabels])

  return (
    <section className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          Activity by repo
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {yearOptions && yearOptions.length > 1 && onYearChange ? (
            <select
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="rounded-lg border border-black/10 bg-transparent px-2 py-1 text-[11px] dark:border-white/15"
              aria-label="Chart year"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          ) : (
            <span className="text-[11px] tabular-nums text-black/35 dark:text-white/35">{year}</span>
          )}
          <div className="flex rounded-lg border border-black/10 p-0.5 dark:border-white/15">
            {(["bar", "line"] as ChartMode[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-medium capitalize",
                  mode === id
                    ? "bg-black/8 text-black/80 dark:bg-white/12 dark:text-white/90"
                    : "text-black/45 dark:text-white/45",
                )}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-[12px] text-black/45 dark:text-white/45">
          Loading repo charts… (first load can take ~30s)
        </p>
      ) : error && repoTotals.length === 0 && repoSeries.length === 0 ? (
        <p className="text-[12px] text-red-400/90">
          Couldn&apos;t load repo activity ({error}). Restart the app if you just updated, then
          refresh.
        </p>
      ) : mode === "bar" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <RepoTotalsBarList totals={repoTotals} />
          {lineAggregate.length > 1 ? (
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-black/35 dark:text-white/35">
                Monthly total (top repos)
              </p>
              <MetricChart
                points={lineAggregate}
                variant="bar"
                yAxis="auto"
                formatTime={(iso) => formatRepoMonthLabel(iso.slice(0, 7))}
                formatValue={(v) => String(Math.round(v))}
                className="min-h-[9rem]"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <MultiRepoLineChart series={repoSeries} monthLabels={monthLabels} dark={dark} />
      )}
    </section>
  )
}
