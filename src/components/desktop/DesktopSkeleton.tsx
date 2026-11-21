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

type RefreshableSkeletonProps = {
  refreshing?: boolean
  onRefresh?: () => void
}

function PanelRefreshButton({ refreshing, onRefresh, label }: RefreshableSkeletonProps & { label: string }) {
  if (!onRefresh) return null
  return (
    <PanelHeaderActions>
      <button
        type="button"
        aria-label={label}
        disabled={refreshing}
        onClick={onRefresh}
        className="rounded-full p-2 text-black/40 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-50 dark:text-white/40 dark:hover:bg-white/10"
      >
        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
      </button>
    </PanelHeaderActions>
  )
}

/** Generic bento shell for lazy-loaded desktop routes. */
export function GenericDesktopPanelSkeleton({ label = "Loading panel" }: { label?: string }) {
  return (
    <div
      className="min-h-[50vh] space-y-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="flex items-start gap-3">
        <SkeletonBlock className="size-11 shrink-0 rounded-full" />
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="h-3.5 w-56 max-w-full" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} bare />
        ))}
      </div>
      <SkeletonBlock className="h-52 w-full rounded-2xl" />
      <ListSectionSkeleton />
    </div>
  )
}

/** Bento-shaped loading shell for the Strava fullscreen page. */
export function StravaPanelDesktopSkeleton({ refreshing, onRefresh }: RefreshableSkeletonProps) {
  return (
    <div
      className="min-h-[50vh] space-y-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading Strava"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <SkeletonBlock className="size-11 shrink-0 rounded-full" />
          <div className="space-y-2">
            <SkeletonBlock className="h-6 w-28" />
            <SkeletonBlock className="h-3.5 w-36" />
          </div>
        </div>
        <PanelRefreshButton refreshing={refreshing} onRefresh={onRefresh} label="Refresh Strava" />
      </header>

      <div className="grid gap-6 border-b border-black/8 pb-8 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} tall bare />
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          <SectionLabelSkeleton />
          <SkeletonBlock className="h-56 w-full rounded-2xl" />
        </div>
        <div className="space-y-3 lg:col-span-7">
          <SectionLabelSkeleton />
          <SkeletonBlock className="h-[380px] w-full rounded-2xl" />
        </div>
      </div>

      <div className="space-y-3">
        <SectionLabelSkeleton />
        <SkeletonBlock className="h-44 w-full rounded-2xl" />
      </div>

      <ListSectionSkeleton />

      <p className="flex items-center justify-center gap-2 text-[12px] text-black/40 dark:text-white/40">
        <Icon icon="simple-icons:strava" className="size-3.5 text-[#fc4c02]/80" aria-hidden />
        Loading athlete, routes, and activity history…
      </p>
    </div>
  )
}

/** Watchlist grid placeholder for the Markets desktop page. */
export function MarketsPanelDesktopSkeleton({ refreshing, onRefresh }: RefreshableSkeletonProps) {
  return (
    <div
      className="min-h-[40vh]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading markets"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-28" />
          <SkeletonBlock className="h-3.5 w-52 max-w-full" />
        </div>
        <PanelRefreshButton refreshing={refreshing} onRefresh={onRefresh} label="Refresh markets" />
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.07] px-3.5 py-3 dark:border-white/10"
          >
            <div className="flex min-w-0 items-center gap-3">
              <SkeletonBlock className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 space-y-1.5">
                <SkeletonBlock className="h-3.5 w-16" />
                <SkeletonBlock className="h-3 w-24" />
              </div>
            </div>
            <MarketQuotePriceSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

function MarketQuotePriceSkeleton() {
  return (
    <div className="shrink-0 space-y-1.5 text-right">
      <SkeletonBlock className="ml-auto h-3.5 w-14" />
      <SkeletonBlock className="ml-auto h-3 w-10" />
    </div>
  )
}

/** Month grid + agenda placeholder for Calendar desktop. */
export function CalendarPanelDesktopSkeleton({ refreshing, onRefresh }: RefreshableSkeletonProps) {
  return (
    <div
      className="min-h-[50vh] space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading calendar"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-36" />
          <SkeletonBlock className="h-3.5 w-48" />
        </div>
        <PanelRefreshButton refreshing={refreshing} onRefresh={onRefresh} label="Refresh calendar" />
      </header>
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-8 w-32" />
            <div className="flex gap-2">
              <SkeletonBlock className="size-8 rounded-full" />
              <SkeletonBlock className="size-8 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => (
              <SkeletonBlock key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-4 space-y-3">
          <SectionLabelSkeleton />
          <ListSectionSkeleton />
        </div>
      </div>
    </div>
  )
}

/** Cursor bento placeholder while usage / analytics load. */
export function CursorPanelDesktopSkeleton({ refreshing, onRefresh }: RefreshableSkeletonProps) {
  return (
    <div
      className="min-h-[50vh]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading Cursor usage"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <SkeletonBlock className="size-11 rounded-full" />
          <div className="space-y-2">
            <SkeletonBlock className="h-6 w-32" />
            <SkeletonBlock className="h-3 w-44" />
          </div>
        </div>
        <PanelRefreshButton refreshing={refreshing} onRefresh={onRefresh} label="Refresh Cursor" />
      </div>
      <SkeletonBlock className="mb-6 h-36 w-full rounded-2xl" />
      <BentoGrid>
        <BentoTile col={4} className={bentoPad()}>
          <SkeletonBlock className="h-5 w-24" />
          <SkeletonBlock className="mt-2 h-3 w-44" />
        </BentoTile>
        <BentoTile col={6} className={bentoPad()}>
          <SectionLabelSkeleton />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <SkeletonBlock key={i} className="h-8 w-full rounded-full" />
            ))}
          </div>
        </BentoTile>
        <BentoTile col={6} className={bentoPad()}>
          <SectionLabelSkeleton />
          <SkeletonBlock className="mt-4 h-32 w-full rounded-xl" />
        </BentoTile>
        <BentoTile col={12} className={bentoPad()}>
          <SectionLabelSkeleton />
          <SkeletonBlock className="mt-4 h-36 w-full rounded-xl" />
        </BentoTile>
      </BentoGrid>
      <p className="mt-6 flex items-center justify-center gap-2 text-[12px] text-black/40 dark:text-white/40">
        <Icon icon="simple-icons:cursor" className="size-3.5 opacity-60" aria-hidden />
        Loading usage history, quota, and models…
      </p>
    </div>
  )
}

/** SSH server stats placeholder (Mint / Pi desktop). */
export function ServerStatsPanelDesktopSkeleton({
  title,
  refreshing,
  onRefresh,
}: RefreshableSkeletonProps & { title: string }) {
  return (
    <div
      className="min-h-[40vh] space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`Loading ${title}`}
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-3 w-48" />
        </div>
        <PanelRefreshButton refreshing={refreshing} onRefresh={onRefresh} label={`Refresh ${title}`} />
      </header>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-2.5 w-16" />
        <SkeletonBlock className="h-3 w-full rounded-full" />
        <SkeletonBlock className="h-2.5 w-16" />
        <SkeletonBlock className="h-3 w-full rounded-full" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <SkeletonBlock className="h-28 rounded-xl" />
        <SkeletonBlock className="h-28 rounded-xl" />
      </div>
    </div>
  )
}

type OverviewSkeletonProps = {
  cards?: import("../../lib/overview-panels").OverviewCardsConfig
}

/** Bento-shaped shell for the Today / overview desktop page. */
export function DesktopOverviewPanelSkeleton({ cards }: OverviewSkeletonProps) {
  const show = (key: keyof NonNullable<OverviewSkeletonProps["cards"]>) =>
    !cards || cards[key] !== false

  const mediaTiles = [show("github"), show("cursor"), show("spotify")].filter(Boolean).length

  return (
    <div
      className="min-h-[50vh] space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading Today overview"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="space-y-2">
        <SkeletonBlock className="h-3 w-40" />
        <SkeletonBlock className="h-8 w-52" />
        <SkeletonBlock className="h-3.5 w-72 max-w-full" />
      </header>

      <SkeletonBlock className="h-24 w-full rounded-2xl" />

      <BentoGrid>
        {show("weather") ? (
          <BentoTile col={show("calendar") ? 8 : 6} className={bentoPad()}>
            <SectionLabelSkeleton />
            <div className="mt-4 flex justify-between gap-3">
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-10 w-20" />
                <SkeletonBlock className="h-3 w-36" />
              </div>
              <SkeletonBlock className="size-11 rounded-xl" />
            </div>
          </BentoTile>
        ) : null}

        {show("calendar") ? (
          <BentoTile col={show("weather") ? 4 : 6} className={bentoPad()}>
            <SectionLabelSkeleton />
            <SkeletonBlock className="mt-4 h-4 w-4/5" />
            <SkeletonBlock className="mt-2 h-3 w-1/2" />
          </BentoTile>
        ) : null}

        {Array.from({ length: Math.max(mediaTiles, 0) }, (_, i) => (
          <BentoTile
            key={`media-${i}`}
            col={mediaTiles <= 1 ? 12 : mediaTiles === 2 ? 6 : 4}
            className={bentoPad()}
          >
            <SectionLabelSkeleton />
            <StatCardSkeleton className="mt-4" tall bare />
          </BentoTile>
        ))}

        {show("strava") ? (
          <BentoTile col={6} className={bentoPad()}>
            <SectionLabelSkeleton />
            <StatCardSkeleton className="mt-4" tall bare />
          </BentoTile>
        ) : null}

        {show("homelab") ? (
          <BentoTile col={6} className={bentoPad()}>
            <SectionLabelSkeleton />
            <HomelabServerSkeleton />
          </BentoTile>
        ) : null}

        {show("markets") ? (
          <BentoTile col={6} className={bentoPad()}>
            <SectionLabelSkeleton />
            <ListSectionSkeleton />
          </BentoTile>
        ) : null}

        {show("air") ? (
          <BentoTile col={6} className={bentoPad()}>
            <SectionLabelSkeleton />
            <StatCardSkeleton className="mt-4" tall bare />
          </BentoTile>
        ) : null}
      </BentoGrid>

      <p className="text-center text-[12px] text-black/40 dark:text-white/40">
        Syncing integrations for your day…
      </p>
    </div>
  )
}

function HomelabServerSkeleton() {
  return (
    <div className="mt-3 grid gap-2">
      <SkeletonBlock className="h-12 w-full rounded-xl" />
      <SkeletonBlock className="h-12 w-full rounded-xl" />
    </div>
  )
}