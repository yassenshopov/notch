import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { MoreVertical } from "lucide-react"
import { clampFixedTooltipPosition } from "../lib/chart-tooltip-position"
import type {
  GitHubContributionDay,
  GitHubContributionWeek,
  GitHubTodayBreakdown,
} from "../lib/github"
import { padContributionWeeksToCalendarYear } from "../lib/contribution-calendar-year"
import { isSpotifyListeningDay } from "../lib/spotify-listening"
import {
  dayBreakdownMatchesCalendar,
  fetchGitHubDayBreakdown,
  formatContributionCount,
  maxContributionCount,
  sumGitHubRepoCounts,
} from "../lib/github"
import { GitHubDayRepoPieChart } from "./GitHubDayRepoPieChart"
import { GitHubHeatmapPaletteModal } from "./GitHubHeatmapPaletteModal"
import {
  heatmapCellFill,
  heatmapLevelColor,
  resolveGitHubHeatmapPalette,
} from "../lib/github-heatmap-palettes"
import { useSettings } from "../config/settings-store"
import { useTheme } from "../hooks/useTheme"
import { cn } from "../lib/utils"

type Props = {
  weeks?: GitHubContributionWeek[]
  variant: "mini" | "panel" | "desktop" | "year" | "year"
  /** Override default week column cap (e.g. full calendar year). */
  weekLimit?: number
  className?: string
  /** Avoid refetch for today when status poll already has repo splits. */
  dayBreakdownSeed?: GitHubTodayBreakdown | null
  /** Skip per-day GitHub API drilldown (e.g. Spotify listening graph). */
  disableDayBreakdown?: boolean
  /** Cover-art grid (Spotify hero) vs green intensity cells. */
  cellPresentation?: "heatmap" | "cover"
  formatCount?: (count: number) => string
  ariaDescription?: string
  /** Pad through Dec 31 (incl. future empty days) before building columns. */
  calendarYear?: number
}

const dayBreakdownCache = new Map<string, GitHubTodayBreakdown>()

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

  if (!Number.isFinite(weekCount) || weekCount >= sorted.length) return sorted
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

const DESKTOP_WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""] as const
const DESKTOP_GAP_PX = 4
const DESKTOP_FIT_MAX_WEEKS = 54
const DESKTOP_SCROLL_CELL_PX = 12

function firstDayInColumn(col: GitHubContributionDay[]) {
  return col.find((d) => d.date) ?? null
}

function monthLabelsForColumns(columns: GitHubContributionDay[][]) {
  const labels: { col: number; text: string }[] = []
  let prevMonth = -1
  for (let i = 0; i < columns.length; i++) {
    const day = firstDayInColumn(columns[i]!)
    if (!day?.date) continue
    const d = new Date(`${day.date}T12:00:00`)
    const month = d.getMonth()
    if (i === 0 || month !== prevMonth) {
      labels.push({
        col: i,
        text: d.toLocaleDateString(undefined, { month: "short" }),
      })
      prevMonth = month
    }
  }
  return labels
}

function ContributionIntensityLegend({
  cellPx,
  paletteId,
  dark,
}: {
  cellPx: number
  paletteId: string
  dark: boolean
}) {
  const levels = [0, 1, 2, 3, 4] as const
  return (
    <div className="flex flex-wrap items-center justify-start gap-1.5 text-[11px] text-black/45 dark:text-white/45">
      <span>Less</span>
      <div className="flex items-center gap-[3px]" aria-hidden>
        {levels.map((level) => (
          <span
            key={level}
            className="shrink-0 rounded-[2px]"
            style={{
              width: cellPx,
              height: cellPx,
              minWidth: cellPx,
              minHeight: cellPx,
              backgroundColor: heatmapLevelColor(level, paletteId, dark),
            }}
          />
        ))}
      </div>
      <span>More</span>
    </div>
  )
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
  dayBreakdownSeed,
  disableDayBreakdown,
  formatCount,
}: {
  day: GitHubContributionDay
  anchorX: number
  anchorY: number
  variant: "mini" | "panel" | "desktop" | "year"
  dayBreakdownSeed?: GitHubTodayBreakdown | null
  disableDayBreakdown?: boolean
  formatCount?: (count: number) => string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<{ left: number; top: number; transform: string } | null>(null)
  const [breakdown, setBreakdown] = useState<GitHubTodayBreakdown | null>(null)
  const [loading, setLoading] = useState(false)
  const showPie = !disableDayBreakdown && variant !== "mini" && day.count > 0

  useEffect(() => {
    if (!showPie || !day.date) {
      setBreakdown(null)
      setLoading(false)
      return
    }
    const cached = dayBreakdownCache.get(day.date)
    if (cached && dayBreakdownMatchesCalendar(cached, day.date, day.count)) {
      setBreakdown(cached)
      setLoading(false)
      return
    }
    if (
      dayBreakdownSeed?.date === day.date &&
      !dayBreakdownSeed.error &&
      dayBreakdownMatchesCalendar(dayBreakdownSeed, day.date, day.count)
    ) {
      dayBreakdownCache.set(day.date, dayBreakdownSeed)
      setBreakdown(dayBreakdownSeed)
      setLoading(false)
      return
    }
    let cancelled = false
    const needsFresh =
      !dayBreakdownMatchesCalendar(cached, day.date, day.count) &&
      !dayBreakdownMatchesCalendar(dayBreakdownSeed, day.date, day.count)
    setLoading(true)
    void fetchGitHubDayBreakdown(day.date, day.count, { force: needsFresh }).then((data) => {
      if (cancelled) return
      if (dayBreakdownMatchesCalendar(data, day.date, day.count)) {
        dayBreakdownCache.set(day.date, data)
      }
      setBreakdown(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [day.date, day.count, dayBreakdownSeed, showPie])

  useLayoutEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setStyle(
      clampFixedTooltipPosition(anchorX, anchorY, rect, {
        preferAbove: false,
        gap: variant === "mini" ? 6 : 8,
      }),
    )
  }, [anchorX, anchorY, variant, day.date, day.count, breakdown, loading, showPie])

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
        {formatCount ? formatCount(day.count) : formatContributionCount(day.count)}
      </span>
      {disableDayBreakdown && day.count > 0 && isSpotifyListeningDay(day) && day.trackName ? (
        <p className="mt-1 text-[10px] leading-snug text-black/55 dark:text-white/55">
          Top track · {day.trackName}
          {day.trackArtist ? ` — ${day.trackArtist}` : null}
        </p>
      ) : null}
      {showPie && loading ? (
        <p className="mt-1 text-[10px] text-black/40 dark:text-white/40">Loading repos…</p>
      ) : null}
      {showPie && !loading && breakdown && !breakdown.error && breakdown.repos.length > 0 ? (
        <>
          {sumGitHubRepoCounts(breakdown.repos) !== day.count ? (
            <p className="mt-1 text-[10px] leading-snug text-black/40 dark:text-white/40">
              {sumGitHubRepoCounts(breakdown.repos)} commits by repo · {day.count} on calendar
            </p>
          ) : null}
          <GitHubDayRepoPieChart
            total={day.count}
            repos={breakdown.repos}
            className="mt-1.5 border-t border-black/8 pt-1.5 dark:border-white/10"
            size={variant === "desktop" ? 68 : 58}
          />
        </>
      ) : null}
      {showPie && !loading && breakdown && breakdown.repos.length === 0 && !breakdown.error ? (
        <p className="mt-1 text-[10px] leading-snug text-black/40 dark:text-white/40">
          No public repo activity for this day.
        </p>
      ) : null}
    </div>
  )
}

export function GitHubContributionHeatmap({
  weeks = [],
  variant,
  weekLimit,
  className,
  dayBreakdownSeed,
  disableDayBreakdown,
  cellPresentation = "heatmap",
  formatCount,
  ariaDescription,
  calendarYear,
}: Props) {
  const defaultWeekCount =
    variant === "mini" ? 12 : variant === "desktop" || variant === "year" ? 53 : 26
  const weekCount = weekLimit ?? defaultWeekCount
  const isDesktopHero = variant === "desktop"
  const measureRef = useRef<HTMLDivElement>(null)
  const [fluidCellPx, setFluidCellPx] = useState(12)

  const resolvedWeeks = useMemo(() => {
    const list = weeks ?? []
    if (!Number.isFinite(calendarYear)) return list
    return padContributionWeeksToCalendarYear(list, calendarYear as number)
  }, [weeks, calendarYear])

  const columnWeekLimit = useMemo(() => {
    if (Number.isFinite(calendarYear)) return Number.POSITIVE_INFINITY
    return weekCount
  }, [calendarYear, weekCount])

  const columns = useMemo(() => {
    if (!resolvedWeeks.length) return []
    return buildIsoWeekColumns(resolvedWeeks, columnWeekLimit)
  }, [resolvedWeeks, columnWeekLimit])

  const desktopScroll = isDesktopHero && columns.length > DESKTOP_FIT_MAX_WEEKS
  const desktopFit = isDesktopHero && !desktopScroll

  const cellPx =
    variant === "mini"
      ? 2
      : desktopScroll
        ? DESKTOP_SCROLL_CELL_PX
        : isDesktopHero
          ? fluidCellPx
          : variant === "year"
            ? 9
            : 9
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
  const [paletteOpen, setPaletteOpen] = useState(false)

  const maxCount = useMemo(() => maxContributionCount(weeks ?? []), [weeks])
  const settings = useSettings()
  const dark = useTheme()
  const paletteId = resolveGitHubHeatmapPalette(settings.github.heatmapPalette)
  const coverGrid = cellPresentation === "cover"

  const monthLabels = useMemo(
    () => (isDesktopHero ? monthLabelsForColumns(columns) : []),
    [columns, isDesktopHero],
  )

  const desktopGapPx = desktopScroll ? DESKTOP_GAP_PX : DESKTOP_GAP_PX
  const desktopGridWidthPx =
    desktopScroll && columns.length > 0
      ? columns.length * cellPx + Math.max(0, columns.length - 1) * desktopGapPx
      : undefined

  useLayoutEffect(() => {
    if (!desktopFit) return
    const el = measureRef.current
    if (!el) return
    const update = () => {
      const width = el.clientWidth
      const n = columns.length
      if (n <= 0 || width <= 0) return
      const next = Math.min(
        18,
        Math.max(10, Math.floor((width - (n - 1) * DESKTOP_GAP_PX) / n)),
      )
      setFluidCellPx(next)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [desktopFit, columns.length])

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
  const gridBlock = (
    <div
      className={cn(
        variant === "mini" ? "grid grid-flow-col" : "inline-grid w-full grid-flow-col",
        "leading-none",
        gap,
      )}
      style={
        desktopFit
          ? {
              gridTemplateRows: "repeat(7, minmax(0, 1fr))",
              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
              aspectRatio: `${columns.length} / 7`,
              width: "100%",
            }
          : desktopScroll
            ? {
                gridTemplateRows: `repeat(7, ${cellPx}px)`,
                gridTemplateColumns: `repeat(${columns.length}, ${cellPx}px)`,
                width: desktopGridWidthPx,
              }
            : {
                gridTemplateRows: `repeat(7, ${cellPx}px)`,
                gridTemplateColumns: `repeat(${columns.length}, ${cellPx}px)`,
              }
      }
      role="img"
      aria-label={ariaDescription ?? "Contribution activity by day"}
    >
      {columns.flatMap((col, ci) =>
        col.map((day, ri) => {
          const isPad = !day.date
          const active = !isPad && hover?.day.date === day.date
          const interactive =
            !isPad && (variant === "panel" || variant === "year" || variant === "desktop")
          const spotifyDay = isSpotifyListeningDay(day) ? day : null
          const coverUrl = coverGrid && day.count > 0 ? spotifyDay?.artUrl : null
          const fill =
            isPad || coverGrid
              ? undefined
              : heatmapCellFill(day.count, maxCount, paletteId, dark)
          return (
            <span
              key={isPad ? `pad-${ci}-${ri}` : `${ci}-${ri}-${day.date}`}
              style={{
                ...(desktopFit ? { aspectRatio: "1 / 1", width: "100%" } : cellStyle),
                ...(fill ? { backgroundColor: fill } : {}),
                ...(coverUrl
                  ? {
                      backgroundImage: `url(${coverUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : {}),
              }}
              className={cn(
                "box-border shrink-0 rounded-[2px] transition-[box-shadow,transform]",
                isPad && "bg-transparent",
                coverGrid && !isPad && !coverUrl && day.count > 0 &&
                  "bg-[#1db954]/35 dark:bg-[#1db954]/30",
                coverGrid && !isPad && day.count <= 0 && "bg-black/[0.06] dark:bg-white/[0.08]",
                !coverGrid && active && "ring-1 ring-black/35 dark:ring-white/45",
                coverGrid && active && "ring-2 ring-[#1db954]/70 ring-offset-1 ring-offset-transparent",
                interactive && "cursor-crosshair",
                coverGrid && !isPad && "overflow-hidden",
              )}
              onMouseEnter={(e) => showTip(day, e.currentTarget)}
              onFocus={(e) => showTip(day, e.currentTarget)}
              tabIndex={interactive ? 0 : -1}
            />
          )
        }),
      )}
    </div>
  )

  if (isDesktopHero) {
    const legendPx = Math.min(14, Math.max(10, desktopScroll ? DESKTOP_SCROLL_CELL_PX : fluidCellPx))
    const gridPane = (
      <>
        <LabelRow labels={monthLabels} columns={columns.length} className="relative mb-2 h-4" />
        {gridBlock}
      </>
    )
    return (
      <div
        ref={rootRef}
        className={cn("w-full min-w-0", className)}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => e.stopPropagation()}
      >
        {tip && typeof document !== "undefined" && hover
          ? createPortal(
              <HeatmapTooltip
                day={tip}
                anchorX={hover.anchorX}
                anchorY={hover.anchorY}
                variant={variant}
                dayBreakdownSeed={dayBreakdownSeed}
                disableDayBreakdown={disableDayBreakdown}
                formatCount={formatCount}
              />,
              document.body,
            )
          : null}

        <div className="flex w-full min-w-0 items-stretch gap-2">
          <div className="flex w-7 shrink-0 flex-col" aria-hidden>
            <div className="mb-2 h-4" />
            <div
              className={cn(
                "grid text-[10px] font-medium leading-none text-black/35 dark:text-white/35",
                desktopScroll ? "h-[calc(7*12px+6*4px)] grid-rows-7 gap-1" : "min-h-0 flex-1 grid-rows-7 gap-1",
              )}
            >
              {DESKTOP_WEEKDAY_LABELS.map((label, i) => (
                <span key={i} className="flex items-center">
                  {label}
                </span>
              ))}
            </div>
          </div>
          {desktopScroll ? (
            <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
              <div style={{ width: desktopGridWidthPx }}>{gridPane}</div>
            </div>
          ) : (
            <div ref={measureRef} className="min-w-0 flex-1">
              {gridPane}
            </div>
          )}
        </div>
        {coverGrid ? (
          <p className="mt-4 pl-9 text-[11px] text-black/45 dark:text-white/45">
            Each tile is the album cover for your most-played track that day.
          </p>
        ) : (
          <>
            <div className="mt-4 flex w-full items-center justify-between gap-2 pl-9">
              <ContributionIntensityLegend cellPx={legendPx} paletteId={paletteId} dark={dark} />
              <button
                type="button"
                aria-label="Heatmap color settings"
                aria-haspopup="dialog"
                aria-expanded={paletteOpen}
                onClick={(e) => {
                  e.stopPropagation()
                  setPaletteOpen(true)
                }}
                className="shrink-0 rounded-full p-1.5 text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/10"
              >
                <MoreVertical className="size-4" />
              </button>
            </div>
            <GitHubHeatmapPaletteModal open={paletteOpen} onClose={() => setPaletteOpen(false)} />
          </>
        )}
      </div>
    )
  }

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
      {tip && typeof document !== "undefined" && hover
        ? createPortal(
            <HeatmapTooltip
              day={tip}
              anchorX={hover.anchorX}
              anchorY={hover.anchorY}
              variant={variant}
              dayBreakdownSeed={dayBreakdownSeed}
              disableDayBreakdown={disableDayBreakdown}
            />,
            document.body,
          )
        : null}
      {gridBlock}
    </div>
  )
}

function LabelRow({
  labels,
  columns,
  className,
}: {
  labels: { col: number; text: string }[]
  columns: number
  className?: string
}) {
  return (
    <div className={cn("w-full", className)} aria-hidden>
      {labels.map(({ col, text }) => (
        <span
          key={`${col}-${text}`}
          className="absolute top-0 -translate-x-1/2 text-[11px] font-medium text-black/40 dark:text-white/40"
          style={{ left: `${((col + 0.5) / columns) * 100}%` }}
        >
          {text}
        </span>
      ))}
    </div>
  )
}
