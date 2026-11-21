import { useMemo } from "react"
import type { SpotifyActivityInsights } from "../lib/spotify-insights"
import { GitHubContributionHeatmap } from "./GitHubContributionHeatmap"
import { SpotifyListeningStats } from "./SpotifyListeningStats"
import { SpotifyTopLists } from "./SpotifyTopLists"
import { AnimatedNumber } from "./AnimatedNumber"
import { cn } from "../lib/utils"

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
  const years = useMemo(() => {
    const fromDb = insights.years?.length ? insights.years : [currentYear]
    return [...fromDb].sort((a, b) => b - a)
  }, [insights.years, currentYear])

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

  return (
    <section className={cn("min-w-0", className)} aria-label="Spotify listening history">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[28px] font-bold tracking-tight">
            <AnimatedNumber
              value={insights.totalPlays}
              format={(n) => n.toLocaleString()}
              className="text-[28px] font-bold tracking-tight"
            />
            <span className="ml-2 text-[13px] font-medium text-black/40 dark:text-white/40">
              plays in {chartYear}
            </span>
          </p>
          <p className="mt-1 text-[12px] text-black/40 dark:text-white/40">
            {insights.totalStreams.toLocaleString()} streams in library
            {insights.lastPlayed
              ? ` · through ${new Date(insights.lastPlayed).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
              : null}
          </p>
        </div>
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

      {loading ? (
        <p className="text-[12px] text-black/45 dark:text-white/45">Loading listening graph…</p>
      ) : insights.weeks.length ? (
        <GitHubContributionHeatmap weeks={insights.weeks} variant="desktop" disableDayBreakdown />
      ) : insights.error ? (
        <p className="text-[12px] text-red-400/90">{insights.error}</p>
      ) : null}

      {insights.weeks.length ? (
        <div className="mt-8">
          <SpotifyListeningStats
            weeks={insights.weeks}
            totalPlays={insights.totalPlays}
            totalMs={insights.totalMs}
            bare
          />
        </div>
      ) : null}

      <SpotifyTopLists
        className="mt-10"
        topArtists={insights.topArtists}
        topTracks={insights.topTracks}
        onPlayUri={onPlayUri}
      />
    </section>
  )
}