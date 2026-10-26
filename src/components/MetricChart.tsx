import { useEffect, useMemo, useState, type MouseEvent } from "react"
import type { ChartStyle } from "../config/settings"
import { useSettings } from "../config/settings-store"
import {
  formatAxisMid,
  formatSeriesAxisTickLabels,
  resolveChartYDomain,
  type ChartYAxisKind,
} from "../lib/chart-axis"
import { cn, formatHour } from "../lib/utils"

type Point = { time: string; value: number }

type Coord = Point & { x: number; y: number }

export type MetricChartVariant = ChartStyle | "area"

type Props = {
  points: Point[]
  variant?: MetricChartVariant
  formatValue?: (v: number) => string
  formatTime?: (iso: string) => string
  className?: string
  accent?: string
  gradientId?: string
  /** Dotted vertical line at the current time when it falls within the series. */
  markNow?: boolean
  /** Shorter embed for dense panels (no min-height overflow). */
  compact?: boolean
  /** Nice-rounded Y axis for server / metric panels */
  yAxis?: ChartYAxisKind
}

function interpolateTimeX(
  nowMs: number,
  points: Point[],
  xs: number[],
): number | null {
  if (points.length === 0 || xs.length !== points.length) return null
  const start = new Date(points[0].time).getTime()
  const end = new Date(points[points.length - 1].time).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || nowMs < start || nowMs > end) {
    return null
  }
  if (points.length === 1) return xs[0]

  for (let i = 0; i < points.length - 1; i++) {
    const ta = new Date(points[i].time).getTime()
    const tb = new Date(points[i + 1].time).getTime()
    if (!Number.isFinite(ta) || !Number.isFinite(tb)) continue
    if (nowMs < ta || nowMs > tb) continue
    const frac = tb === ta ? 0 : (nowMs - ta) / (tb - ta)
    return xs[i] + frac * (xs[i + 1] - xs[i])
  }
  return null
}

const VIEW_W = 100
const VIEW_H = 56

export function MetricChart({
  points,
  variant = "line",
  formatValue = (v) => String(Math.round(v)),
  formatTime: formatTimeProp,
  className,
  accent = "currentColor",
  gradientId = "metric-chart-fill",
  markNow = false,
  compact = false,
  yAxis = "auto",
}: Props) {
  const clockFormat = useSettings().clock.format
  const formatTime = formatTimeProp ?? ((iso: string) => formatHour(iso, clockFormat))
  const [hovered, setHovered] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    setHovered(null)
  }, [points, variant])

  useEffect(() => {
    if (!markNow) return
    setNowMs(Date.now())
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [markNow, points])

  const chart = useMemo(() => {
    if (points.length === 0) {
      return {
        path: "",
        area: "",
        bars: [] as { x: number; y: number; w: number; h: number; cx: number; fillOpacity: number }[],
        coords: [] as Coord[],
        labels: [] as Point[],
        labelTexts: null as string[] | null,
        minLabel: "",
        maxLabel: "",
        midLabel: "",
        padY: 4,
        nowX: null as number | null,
      }
    }

    const values = points.map((p) => p.value)
    const domain =
      yAxis === "auto" && variant === "bar"
        ? { min: 0, max: Math.max(...values) }
        : yAxis === "auto"
          ? { min: Math.min(...values), max: Math.max(...values) }
          : resolveChartYDomain(yAxis, values)
    const min = domain.min
    const max = domain.max
    const span = Math.max(0.0001, max - min)
    const padY = 4
    const plotH = VIEW_H - padY * 2

    const coords: Coord[] = points.map((p, i) => {
      const x = points.length === 1 ? VIEW_W / 2 : (i / (points.length - 1)) * VIEW_W
      const t = Math.min(1, Math.max(0, (p.value - min) / span))
      const y = padY + (1 - t) * plotH
      return { x, y, ...p }
    })

    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ")
    const areaPath = `${line} L ${coords[coords.length - 1].x.toFixed(2)} ${VIEW_H} L ${coords[0].x.toFixed(2)} ${VIEW_H} Z`

    const n = points.length
    const gap = Math.min(2.2, 18 / Math.max(n, 1))
    const barW = Math.max(1.5, (VIEW_W - gap * (n + 1)) / n)
    const bars = points.map((p, i) => {
      const t = (p.value - min) / span
      const barH = Math.max(0.5, t * plotH)
      const x = gap + i * (barW + gap)
      const y = VIEW_H - padY - barH
      const fillOpacity = 0.35 + t * 0.55
      return { x, y, w: barW, h: barH, cx: x + barW / 2, fillOpacity }
    })

    const labelIdx =
      points.length <= 4
        ? points.map((_, i) => i)
        : [0, Math.floor((points.length - 1) / 2), points.length - 1]

    const lineXs = coords.map((c) => c.x)
    const barXs = bars.map((b) => b.cx)
    const nowX =
      markNow
        ? variant === "bar"
          ? interpolateTimeX(nowMs, points, barXs)
          : interpolateTimeX(nowMs, points, lineXs)
        : null

    return {
      path: line,
      area: areaPath,
      bars,
      coords,
      labels: labelIdx.map((i) => points[i]),
      labelTexts: compact ? formatSeriesAxisTickLabels(points, labelIdx, clockFormat) : null,
      minLabel: formatValue(min),
      maxLabel: formatValue(max),
      midLabel: (() => {
        if (!compact || max - min <= 0.0001) return ""
        const mid = formatAxisMid(min, max)
        const midText = formatValue(mid)
        const minText = formatValue(min)
        const maxText = formatValue(max)
        if (midText === minText || midText === maxText) return ""
        return midText
      })(),
      padY,
      nowX,
    }
  }, [points, formatValue, variant, markNow, nowMs, yAxis, compact, clockFormat])

  const timeLabel = formatTime

  const pickNearest = (clientX: number, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0 || chart.coords.length === 0) return
    const x = ((clientX - rect.left) / rect.width) * VIEW_W
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < chart.coords.length; i++) {
      const d = Math.abs(chart.coords[i].x - x)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    setHovered(best)
  }

  const onChartMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    pickNearest(e.clientX, e.currentTarget)
  }

  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-[12px] text-black/35 dark:text-white/35",
          compact ? "h-16 flex-none" : "min-h-[9rem] flex-1",
          className,
        )}
      >
        No data
      </div>
    )
  }

  const hoverCoord = hovered != null ? chart.coords[hovered] : null
  const hoverBar = hovered != null ? chart.bars[hovered] : null
  const tooltipLeftPct = hoverCoord
    ? variant === "bar" && hoverBar
      ? (hoverBar.cx / VIEW_W) * 100
      : (hoverCoord.x / VIEW_W) * 100
    : 0
  const tooltipTopPct = hoverCoord
    ? variant === "bar" && hoverBar
      ? (hoverBar.y / VIEW_H) * 100
      : (hoverCoord.y / VIEW_H) * 100
    : 0

  return (
    <div
      className={cn(
        "grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-2",
        compact
          ? "grid-rows-[4.25rem_auto] flex-none gap-y-0.5"
          : "grid-rows-[minmax(0,1fr)_auto] min-h-0 flex-1 gap-y-1",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col justify-between py-0.5 text-right leading-none tabular-nums text-black/35 dark:text-white/35",
          compact ? "text-[9px]" : "text-[10px]",
        )}
      >
        <span>{chart.maxLabel}</span>
        {chart.midLabel ? <span>{chart.midLabel}</span> : null}
        <span>{chart.minLabel}</span>
      </div>
      <div
        className={cn(
          "relative w-full overflow-hidden",
          compact ? "h-[4.25rem] min-h-0" : "min-h-[9rem] h-full",
        )}
      >
        {hoverCoord ? (
          <div
            className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5 rounded-lg bg-[#111111] px-2 py-1 text-center shadow-md dark:bg-white"
            style={{
              left: `${tooltipLeftPct}%`,
              top: `calc(${tooltipTopPct}% - 6px)`,
            }}
          >
            <span className="text-[9px] font-medium leading-none text-white/55 dark:text-black/45">
              {timeLabel(hoverCoord.time)}
            </span>
            <span className="text-[11px] font-semibold leading-none tabular-nums text-white dark:text-black">
              {formatValue(hoverCoord.value)}
            </span>
          </div>
        ) : null}
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className={cn(
            "h-full w-full cursor-crosshair",
            compact ? "overflow-hidden" : "overflow-visible",
          )}
          preserveAspectRatio={compact && variant === "bar" ? "xMidYMid meet" : "none"}
          role="img"
          aria-label={
            variant === "bar" ? "Bar chart" : variant === "area" ? "Area chart" : "Line chart"
          }
          onMouseMove={onChartMouseMove}
          onMouseLeave={() => setHovered(null)}
        >
          {variant === "area" ? (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.42" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
              </linearGradient>
            </defs>
          ) : null}
          {variant === "bar" ? (
            chart.bars.map((bar, i) => {
              const dimmed = hovered !== null && hovered !== i
              const baseOpacity = bar.fillOpacity
              return (
                <rect
                  key={points[i].time}
                  x={bar.x}
                  y={bar.y}
                  width={bar.w}
                  height={bar.h}
                  rx={1.2}
                  fill={accent}
                  opacity={dimmed ? baseOpacity * 0.45 : Math.min(1, baseOpacity + 0.15)}
                  pointerEvents="none"
                />
              )
            })
          ) : variant === "area" ? (
            <>
              <path d={chart.area} fill={`url(#${gradientId})`} pointerEvents="none" />
              <path
                d={chart.path}
                fill="none"
                stroke={accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
              {hoverCoord ? (
                <>
                  <line
                    x1={hoverCoord.x}
                    x2={hoverCoord.x}
                    y1={chart.padY}
                    y2={VIEW_H}
                    stroke={accent}
                    strokeWidth="1"
                    opacity="0.25"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                  <circle
                    cx={hoverCoord.x}
                    cy={hoverCoord.y}
                    r={5}
                    fill={accent}
                    opacity={0.2}
                    pointerEvents="none"
                  />
                  <circle
                    cx={hoverCoord.x}
                    cy={hoverCoord.y}
                    r={3}
                    fill={accent}
                    pointerEvents="none"
                  />
                </>
              ) : null}
            </>
          ) : (
            <>
              <path d={chart.area} fill={accent} opacity="0.12" pointerEvents="none" />
              <path
                d={chart.path}
                fill="none"
                stroke={accent}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
              {hoverCoord ? (
                <>
                  <circle
                    cx={hoverCoord.x}
                    cy={hoverCoord.y}
                    r={5}
                    fill={accent}
                    opacity={0.2}
                    pointerEvents="none"
                  />
                  <circle
                    cx={hoverCoord.x}
                    cy={hoverCoord.y}
                    r={3}
                    fill={accent}
                    pointerEvents="none"
                  />
                </>
              ) : null}
            </>
          )}
          {chart.nowX != null ? (
            <line
              x1={chart.nowX}
              x2={chart.nowX}
              y1={chart.padY}
              y2={VIEW_H}
              stroke={accent}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ) : null}
        </svg>
      </div>
      <div aria-hidden className="col-start-1" />
      <div
        className={cn(
          "flex min-w-0 justify-between overflow-hidden text-black/35 dark:text-white/35",
          compact ? "text-[8px] leading-tight" : "text-[10px]",
        )}
      >
        {chart.labels.map((l, i) => (
          <span key={l.time} className="truncate">
            {chart.labelTexts?.[i] ?? timeLabel(l.time)}
          </span>
        ))}
      </div>
    </div>
  )
}
