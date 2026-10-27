import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { clampFixedTooltipPosition } from "../lib/chart-tooltip-position"
import type { GitHubContributionDay, GitHubContributionWeek } from "../lib/github"
import { contributionLevelClass, formatContributionCount, maxContributionCount } from "../lib/github"
import { cn } from "../lib/utils"

type Props = {
  weeks?: GitHubContributionWeek[]
  variant: "mini" | "panel" | "desktop" | "year" | "year"
  /** Override default week column cap (e.g. full calendar year). */
  weekLimit?: number
  className?: string
}

const PAD: GitHubContributionDay = { date: "", count: 0 }

/** Mon = 0 (top) … Sun = 6 (bottom), matching github.com with Monday-first rows. */
function mondayFirstRowIndex(date: string) {
  const weekday = new Date(`${date}T12:00:00`).getDay()
  return weekday === 0 ? 6 : weekday - 1
}

/** ISO week column key (Monday of that calendar week). */
function mondayWeekKey(date: string) {
  const d = new Date(`${date}T12:00:00`)
  const weekday = d.getDay()
  const toMonday = weekday === 0 ? -6 : 1 - weekday
  d.setDate(d.getDate() + toMonday)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Group days into Mon→Sun columns like GitHub’s profile graph (not raw Sun-start API weeks). */
function buildIsoWeekColumns(weeks: GitHubContributionWeek[], weekCount: number) {
  const columnMap = new Map<string, GitHubContributionDay[]>()

  for (const week of weeks) {
    for (const day of week) {
      if (!day?.date) continue
      const key = mondayWeekKey(day.date)
      let column = columnMap.get(key)
      if (!column) {
        column = Array.from({ length: 7 }, () => PAD)
        columnMap.set(key, column)
      }
      column[mondayFirstRowIndex(day.date)] = day
    }
  }

  const sorted = [...columnMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, column]) => column)

  return sorted.slice(-weekCount)
}

function formatDayHeading(date: string) {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatDayShort(date: string) {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

type HoverState = {
  day: GitHubContributionDay
  anchorX: number
  anchorY: number
}

function HeatmapTooltip({
  day,
  anchorX,
  anchorY,
  variant,
}: {
  day: GitHubContributionDay
  anchorX: number
  anchorY: number
  variant: "mini" | "panel" | "desktop" | "year"
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<{ left: number; top: number; transform: string } | null>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setStyle(
      clampFixedTooltipPosition(anchorX, anchorY, rect, {
        preferAbove: false,
        gap: variant === "mini" ? 6 : 8,
      }),
    )
  }, [anchorX, anchorY, variant, day.date, day.count])

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none fixed z-[9999] flex max-w-[min(16rem,calc(100vw-2rem))] flex-col gap-0.5 rounded-xl border border-black/10 bg-[#f7f7f5] px-2.5 py-2 shadow-lg dark:border-white/12 dark:bg-[#111111]",
        !style && "invisible",
      )}
      style={
        style
          ? { left: style.left, top: style.top, transform: style.transform }
          : { left: anchorX, top: anchorY, transform: "translateX(-50%)" }
      }
    >
      <span
        className="absolute -top-1.5 left-1/2 size-2.5 -translate-x-1/2 rotate-45 border border-black/10 border-b-0 border-r-0 bg-[#f7f7f5] dark:border-white/12 dark:bg-[#111111]"
        aria-hidden
      />
      <span
        className={cn(
          "font-semibold leading-snug text-black/85 dark:text-white/90",
          variant === "mini" ? "text-[10px]" : "text-[12px]",
        )}
      >
        {variant === "mini" ? formatDayShort(day.date) : formatDayHeading(day.date)}
      </span>
      <span
        className={cn(
          "tabular-nums text-black/55 dark:text-white/55",
          variant === "mini" ? "text-[9px]" : "text-[11px]",
        )}
      >
        {formatContributionCount(day.count)}
      </span>
    </div>
  )
}

export function GitHubContributionHeatmap({
  weeks = [],
  variant,
  weekLimit,
  className,
}: Props) {
  const defaultWeekCount =
    variant === "mini" ? 12 : variant === "desktop" || variant === "year" ? 53 : 26
  const weekCount = weekLimit ?? defaultWeekCount
  const cellPx =
    variant === "mini" ? 2 : variant === "year" ? 9 : variant === "desktop" ? 11 : 9
  const gap =
    variant === "mini"
      ? "gap-px"
      : variant === "desktop"
        ? "gap-1"
        : variant === "year"
          ? "gap-[3px]"
          : "gap-[3px]"
  const cellStyle = {
    width: cellPx,
    height: cellPx,
    minWidth: cellPx,
    minHeight: cellPx,
  }
  const rootRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  const columns = useMemo(() => {
    const list = weeks ?? []
    if (!list.length) return []
    return buildIsoWeekColumns(list, weekCount)
  }, [weeks, weekCount])

  const maxCount = useMemo(() => maxContributionCount(weeks ?? []), [weeks])

  const showTip = useCallback((day: GitHubContributionDay, el: HTMLElement) => {
    if (!day.date) return
    const cellBox = el.getBoundingClientRect()
    setHover({
      day,
      anchorX: cellBox.left + cellBox.width / 2,
      anchorY: cellBox.bottom,
    })
  }, [])

  if (!columns.length) return null

  const tip = hover?.day

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative shrink-0",
        variant === "mini"
          ? "block max-h-[14px] max-w-[30px] overflow-hidden leading-none -translate-y-0.5"
          : "inline-block max-w-full overflow-x-auto",
        className,
      )}
      onMouseLeave={() => setHover(null)}
      onClick={(e) => e.stopPropagation()}
    >
      {tip && typeof document !== "undefined"
        ? createPortal(
            <HeatmapTooltip
              day={tip}
              anchorX={hover.anchorX}
              anchorY={hover.anchorY}
              variant={variant}
            />,
            document.body,
          )
        : null}

      <div
        className={cn(
          variant === "mini" ? "grid grid-flow-col" : "inline-grid grid-flow-col",
          "leading-none",
          gap,
        )}
        style={
          variant === "mini"
            ? {
                gridTemplateRows: `repeat(7, ${cellPx}px)`,
                gridTemplateColumns: `repeat(${columns.length}, ${cellPx}px)`,
              }
            : {
                gridTemplateRows: `repeat(7, ${cellPx}px)`,
                gridTemplateColumns: `repeat(${columns.length}, ${cellPx}px)`,
              }
        }
        role="img"
        aria-label="Contribution activity by day"
      >
        {columns.flatMap((col, ci) =>
          col.map((day, ri) => {
            const isPad = !day.date
            const active = !isPad && hover?.day.date === day.date
            return (
              <span
                key={isPad ? `pad-${ci}-${ri}` : `${ci}-${ri}-${day.date}`}
                style={cellStyle}
                className={cn(
                  "box-border shrink-0 rounded-[1px] transition-[box-shadow,transform]",
                  isPad ? "bg-transparent" : contributionLevelClass(day.count, maxCount),
                  active && "ring-1 ring-black/35 dark:ring-white/45",
                  !isPad && (variant === "panel" || variant === "year") && "cursor-crosshair",
                )}
                onMouseEnter={(e) => showTip(day, e.currentTarget)}
                onFocus={(e) => showTip(day, e.currentTarget)}
                tabIndex={!isPad && (variant === "panel" || variant === "year") ? 0 : -1}
              />
            )
          }),
        )}
      </div>
    </div>
  )
}
