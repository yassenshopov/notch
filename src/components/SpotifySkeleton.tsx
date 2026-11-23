import { Icon } from "@iconify/react"
import { SkeletonBlock } from "./desktop/DesktopSkeleton"
import { cn } from "../lib/utils"

const HEATMAP_COLS = 53

function SectionLabelSkeleton() {
  return <SkeletonBlock className="h-3 w-28" />
}

function ListRowSkeleton({ withArt }: { withArt?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {withArt ? (
        <SkeletonBlock className="size-10 shrink-0 rounded-md" />
      ) : (
        <SkeletonBlock className="size-10 shrink-0 rounded-full" />
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <SkeletonBlock className="h-3.5 w-[72%]" />
        <SkeletonBlock className="h-3 w-[48%]" />
      </div>
    </div>
  )
}

function StatCardSkeleton({ bare }: { bare?: boolean }) {
  return (
    <div className={cn(bare ? "pt-1" : "rounded-xl border border-black/[0.05] p-3 dark:border-white/8")}>
      <SkeletonBlock className="h-2.5 w-16" />
      <SkeletonBlock className="mt-2 h-7 w-24" />
      <SkeletonBlock className="mt-2 h-2 w-20" />
    </div>
  )
}

/** GitHub-style calendar grid placeholder for listening history. */
export function SpotifyListeningHeatmapSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("w-full min-w-0", className)}
      aria-hidden
    >
      <div className="relative mb-2 flex h-4 w-full">
        {Array.from({ length: 8 }, (_, i) => (
          <SkeletonBlock
            key={i}
            className="absolute h-3 w-7"
            style={{ left: `${i * 12.5}%` }}
          />
        ))}
      </div>
      <div
        className="grid w-full gap-1"
        style={{
          gridTemplateColumns: `repeat(${HEATMAP_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: "repeat(7, minmax(0, 1fr))",
          aspectRatio: `${HEATMAP_COLS} / 7`,
        }}
      >
        {Array.from({ length: HEATMAP_COLS * 7 }, (_, i) => (
          <SkeletonBlock
            key={i}
            className={cn(
              "aspect-square w-full rounded-[2px]",
              i % 11 === 0 && "opacity-70",
              i % 17 === 3 && "opacity-50",
            )}
          />
        ))}
      </div>
    </div>
  )
}

function MonthlyBarPlaceholder({ index }: { index: number }) {
  const pct = 28 + (index % 5) * 14
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-end self-stretch">
      <SkeletonBlock className="w-full rounded-sm" style={{ height: `${pct}%` }} />
    </div>
  )
}

function MonthlyChartSkeleton() {
  return (
    <div className="min-w-0">
      <SectionLabelSkeleton />
      <div className="mt-3 flex h-36 items-stretch gap-1.5 sm:gap-2">
        {Array.from({ length: 12 }, (_, i) => (
          <MonthlyBarPlaceholder key={i} index={i} />
        ))}
      </div>
    </div>
  )
}

type HeroSkeletonProps = {
  className?: string
  /** Initial page load — hide footer hint if refreshing inline. */
  showStatusLine?: boolean
}

/** Full desktop listening hero while insights load. */
export function SpotifyLibraryHeroSkeleton({ className, showStatusLine = true }: HeroSkeletonProps) {
  return (
    <section
      className={cn("min-w-0 space-y-6", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading Spotify listening history"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 pb-1">
        <div className="flex min-w-0 gap-3">
          <SkeletonBlock className="size-11 shrink-0 rounded-full" />
          <div className="space-y-2">
            <SkeletonBlock className="h-6 w-40" />
            <SkeletonBlock className="h-3.5 w-28" />
            <SkeletonBlock className="h-3 w-56 max-w-full" />
          </div>
        </div>
      </header>

      <div className="w-full min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBlock className="h-9 w-56" />
            <SkeletonBlock className="h-3 w-72 max-w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBlock className="h-8 w-[132px] rounded-lg" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
          </div>
        </div>

        <SpotifyListeningHeatmapSkeleton />

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatCardSkeleton key={i} bare />
          ))}
        </div>

        <div className="mt-8">
          <MonthlyChartSkeleton />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <SectionLabelSkeleton />
            <div className="mt-3 flex flex-col">
              {Array.from({ length: 5 }, (_, i) => (
                <ListRowSkeleton key={i} withArt />
              ))}
            </div>
          </div>
          <div>
            <SectionLabelSkeleton />
            <div className="mt-3 flex flex-col">
              {Array.from({ length: 5 }, (_, i) => (
                <ListRowSkeleton key={i} withArt />
              ))}
            </div>
          </div>
        </div>
      </div>

      {showStatusLine ? (
        <p className="flex items-center justify-center gap-2 text-[12px] text-black/40 dark:text-white/40">
          <Icon icon="simple-icons:spotify" className="size-3.5 text-[#1db954]/80" aria-hidden />
          Loading your library, calendar, and top tracks…
        </p>
      ) : null}
    </section>
  )
}