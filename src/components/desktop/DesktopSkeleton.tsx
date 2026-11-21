import type { CSSProperties } from "react"
import { Icon } from "@iconify/react"
import { RefreshCw } from "lucide-react"
import { BentoGrid, BentoTile, bentoPad } from "./DesktopBento"
import { PanelHeaderActions } from "../PanelHeaderActions"
import { cn } from "../../lib/utils"

type BlockProps = {
  className?: string
  style?: CSSProperties
}

/** Pulsing placeholder bar for desktop fullscreen panel skeletons. */
export function SkeletonBlock({ className, style }: BlockProps) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-black/[0.07] dark:bg-white/[0.09]", className)}
      style={style}
      aria-hidden
    />
  )
}

function SectionLabelSkeleton() {
  return <SkeletonBlock className="h-3 w-24" />
}

function ListRowSkeleton() {
  return (
    <div className="flex items-start justify-between gap-2 px-1 py-2">
      <div className="min-w-0 flex-1 space-y-1.5">
        <SkeletonBlock className="h-3.5 w-[88%]" />
        <SkeletonBlock className="h-3 w-1/3" />
      </div>
      <SkeletonBlock className="mt-0.5 size-3.5 shrink-0 rounded-md" />
    </div>
  )
}

type GitHubProps = {
  refreshing?: boolean
  onRefresh?: () => void
}

/** Bento-shaped loading shell for the GitHub fullscreen page. */
export function GitHubPanelDesktopSkeleton({ refreshing, onRefresh }: GitHubProps) {
  return (
    <div
      className="min-h-[50vh]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading GitHub"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-6 flex items-start justify-between gap-4 pb-2">
        <div className="flex min-w-0 items-start gap-3">
          <SkeletonBlock className="size-11 shrink-0 rounded-full" />
          <div className="space-y-2">
            <SkeletonBlock className="h-6 w-36" />
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="h-3 w-52 max-w-full" />
          </div>
        </div>
        {onRefresh ? (
          <PanelHeaderActions>
            <button
              type="button"
              aria-label="Refresh GitHub"
              disabled={refreshing}
              onClick={onRefresh}
              className="rounded-full p-2 text-black/40 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-50 dark:text-white/40 dark:hover:bg-white/10"
            >
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            </button>
          </PanelHeaderActions>
        ) : null}
      </div>

      <div className="mb-8 w-full space-y-4">
        <SkeletonBlock className="h-9 w-40" />
        <SkeletonBlock className="h-36 w-full rounded-xl" />
        <div className="grid gap-3 border-t border-black/10 pt-4 dark:border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatCardSkeleton key={i} bare />
          ))}
        </div>
      </div>

      <BentoGrid>
        <BentoTile col={12} className={bentoPad()}>
          <SectionLabelSkeleton />
          <StatCardSkeleton className="mt-4" tall />
        </BentoTile>

        <BentoTile col={12} className={bentoPad()}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SectionLabelSkeleton />
            <SkeletonBlock className="h-8 w-40 rounded-full" />
          </div>
          <SkeletonBlock className="h-44 w-full rounded-xl" />
        </BentoTile>

        <BentoTile col={6} className={bentoPad()}>
          <div className="mb-2 flex items-baseline justify-between">
            <SectionLabelSkeleton />
            <SkeletonBlock className="h-3 w-5" />
          </div>
          <ListSectionSkeleton />
        </BentoTile>

        <BentoTile col={6} className={bentoPad()}>
          <div className="mb-2 flex items-baseline justify-between">
            <SectionLabelSkeleton />
            <SkeletonBlock className="h-3 w-5" />
          </div>
          <ListSectionSkeleton />
        </BentoTile>
      </BentoGrid>

      <p className="mt-6 flex items-center justify-center gap-2 text-[12px] text-black/40 dark:text-white/40">
        <Icon icon="simple-icons:github" className="size-3.5 opacity-60" aria-hidden />
        Loading your profile, contributions, and inbox…
      </p>
    </div>
  )
}

function StatCardSkeleton({
  className,
  tall,
  bare,
}: {
  className?: string
  tall?: boolean
  bare?: boolean
}) {
  return (
    <div
      className={cn(
        bare
          ? "pt-1"
          : "rounded-xl border border-black/[0.05] bg-black/[0.02] p-3 dark:border-white/8 dark:bg-white/[0.02]",
        className,
      )}
    >
      <SkeletonBlock className="h-2.5 w-16" />
      <SkeletonBlock className={cn("mt-2", tall ? "h-8 w-28" : "h-6 w-14")} />
      <SkeletonBlock className="mt-2 h-2 w-20" />
    </div>
  )
}

function ListSectionSkeleton() {
  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: 4 }, (_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  )
}