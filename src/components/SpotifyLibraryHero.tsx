import { useMemo, useState, type ReactNode } from "react"
import type { SpotifyActivityInsights } from "../lib/spotify-insights"
import { formatListeningMinutes } from "../lib/spotify-insights"
import { padContributionWeeksToCalendarYear } from "../lib/contribution-calendar-year"
import { formatListeningHeatmapCount, type SpotifyListeningDay } from "../lib/spotify-listening"
import { GitHubContributionHeatmap } from "./GitHubContributionHeatmap"
import { SpotifyListeningStats } from "./SpotifyListeningStats"
import { SpotifyTopLists } from "./SpotifyTopLists"
import { SpotifyProfileHeader } from "./SpotifyProfileHeader"
import { SpotifyMonthlyListeningChart } from "./SpotifyMonthlyListening"
import { AnimatedNumber } from "./AnimatedNumber"
import { cn } from "../lib/utils"

type GridMode = "covers" | "heatmap"

type Props = {
  insights: SpotifyActivityInsights
  chartYear: number
  onChartYearChange: (year: number) => void
  loading?: boolean
  onPlayUri?: (uri: string) => void
  className?: string
}

export function SpotifyLibraryHero({
  insights,
  chartYear,
  onChartYearChange,
  loading,
  onPlayUri,
  className,
}: Props) {
  const currentYear = new Date().getFullYear()
  const [gridMode, setGridMode] = useState<GridMode>("covers")
  const years = useMemo(() => {
    const fromDb = insights.years?.length ? insights.years : [currentYear]
    return [...fromDb].sort((a, b) => b - a)
  }, [insights.years, currentYear])

  const heroMinutes =
    insights.totalMinutes > 0
      ? insights.totalMinutes
      : Math.max(0, Math.round(insights.totalMs / 60_000))

  const heroWeeks = useMemo(
    () =>
      padContributionWeeksToCalendarYear<SpotifyListeningDay>(
        insights.weeks,
        chartYear,
        (date) => ({ date, count: 0 }),
      ),
    [insights.weeks, chartYear],
  )

  if (!insights.ready || insights.totalStreams === 0) {
    return (
      <section className={cn("rounded-2xl border border-dashed border-black/10 p-5 dark:border-white/15", className)}>
        <p className="text-[14px] font-semibold">Listening library</p>
        <p className="mt-2 text-[13px] leading-relaxed text-black/45 dark:text-white/45">
          Import your Spotify Extended Streaming History into Neon to unlock heatmaps and top tracks.
          Run{" "}
          <code className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[12px] dark:bg-white/10">
            npm run import:spotify-history
          </code>{" "}
          (or set <span className="font-medium">SPOTIFY_EXTENDED_HISTORY_DIR</span>).
        </p>
      </section>
    )
  }

  const showHero = Boolean(heroWeeks.length || insights.weeks.length || loading)

  return (
    <section className={cn("min-w-0 space-y-6", className)} aria-label="Spotify listening history">
      <SpotifyProfileHeader insights={insights} className="pb-1" />

      {showHero ? (
        <div className="w-full min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[28px] font-bold tracking-tight">
                <AnimatedNumber
                  value={heroMinutes}
                  format={(n) => n.toLocaleString()}
                  className="text-[28px] font-bold tracking-tight"
                />
                <span className="ml-2 text-[13px] font-medium text-black/40 dark:text-white/40">
                  minutes listened · {chartYear}
                </span>
              </p>
              <p className="mt-1 text-[12px] text-black/40 dark:text-white/40">
                {formatListeningMinutes(insights.totalMs)} total
                {insights.totalPlays > 0
                  ? ` · ${insights.totalPlays.toLocaleString()} plays`
                  : null}
                {insights.lastPlayed
                  ? ` · through ${new Date(insights.lastPlayed).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                  : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GridModeToggle value={gridMode} onChange={setGridMode} />
              <label className="flex items-center gap-2 text-[12px] text-black/50 dark:text-white/50">
                <span className="font-medium">Year</span>
                <select
                  value={chartYear}
                  onChange={(e) => onChartYearChange(Number(e.target.value))}
                  className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[13px] dark:border-white/15 dark:bg-black/40"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <p className="text-[12px] text-black/45 dark:text-white/45">Loading listening graph…</p>
          ) : insights.ready ? (
            <GitHubContributionHeatmap
              weeks={insights.weeks}
              calendarYear={chartYear}
              variant="desktop"
              disableDayBreakdown
              cellPresentation={gridMode === "covers" ? "cover" : "heatmap"}
              formatCount={formatListeningHeatmapCount}
              ariaDescription="Listening activity by day"
            />
          ) : insights.error ? (
            <p className="text-[12px] text-red-400/90">{insights.error}</p>
          ) : null}

          {heroWeeks.length ? (
            <div className="mt-8 space-y-8">
              <SpotifyListeningStats
                weeks={heroWeeks}
                totalMinutes={heroMinutes}
                totalMs={insights.totalMs}
                totalPlays={insights.totalPlays}
                bare
              />
              <SpotifyMonthlyListeningChart
                year={chartYear}
                monthly={insights.monthly ?? []}
              />
              <SpotifyTopLists
                topArtists={insights.topArtists}
                topTracks={insights.topTracks}
                onPlayUri={onPlayUri}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function GridModeToggle({
  value,
  onChange,
}: {
  value: GridMode
  onChange: (mode: GridMode) => void
}) {
  return (
    <div
      className="flex rounded-lg border border-black/10 p-0.5 text-[12px] dark:border-white/15"
      role="group"
      aria-label="Calendar view"
    >
      <ToggleChip active={value === "covers"} onClick={() => onChange("covers")}>
        Covers
      </ToggleChip>
      <ToggleChip active={value === "heatmap"} onClick={() => onChange("heatmap")}>
        Heatmap
      </ToggleChip>
    </div>
  )
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        "rounded-md px-2.5 py-1 font-medium transition-colors",
        active
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "text-black/50 hover:text-black/75 dark:text-white/50 dark:hover:text-white/75",
      )}
    >
      {children}
    </button>
  )
}