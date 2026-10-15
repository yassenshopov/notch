import { useMemo } from "react"
import type { ChartStyle } from "../config/settings"
import { cn, formatHour } from "../lib/utils"

type Point = { time: string; value: number }

type Props = {
  points: Point[]
  variant?: ChartStyle
  formatValue?: (v: number) => string
  formatTime?: (iso: string) => string
  className?: string
  accent?: string
}

export function MetricChart({
  points,
  variant = "line",
  formatValue = (v) => String(Math.round(v)),
  formatTime = formatHour,
  className,
  accent = "currentColor",
}: Props) {
  const chart = useMemo(() => {
    if (points.length === 0) {
      return {
        path: "",
        area: "",
        bars: [] as { x: number; y: number; w: number; h: number }[],
        labels: [] as Point[],
        minLabel: "",
        maxLabel: "",
      }
    }

    const values = points.map((p) => p.value)
    const min = variant === "bar" ? 0 : Math.min(...values)
    const max = Math.max(...values)
    const span = Math.max(0.0001, max - min)
    const w = 100
    const h = 56
    const padY = 4
    const plotH = h - padY * 2

    const coords = points.map((p, i) => {
      const x = points.length === 1 ? w / 2 : (i / (points.length - 1)) * w
      const y = padY + (1 - (p.value - min) / span) * plotH
      return { x, y, ...p }
    })

    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ")
    const areaPath = `${line} L ${coords[coords.length - 1].x.toFixed(2)} ${h} L ${coords[0].x.toFixed(2)} ${h} Z`

    const n = points.length
    const gap = Math.min(2.2, 18 / Math.max(n, 1))
    const barW = Math.max(1.5, (w - gap * (n + 1)) / n)
    const bars = points.map((p, i) => {
      const barH = Math.max(0.5, ((p.value - min) / span) * plotH)
      const x = gap + i * (barW + gap)
      const y = h - padY - barH
      return { x, y, w: barW, h: barH }
    })

    const labelIdx =
      points.length <= 4
        ? points.map((_, i) => i)
        : [0, Math.floor((points.length - 1) / 2), points.length - 1]

    return {
      path: line,
      area: areaPath,
      bars,
      labels: labelIdx.map((i) => points[i]),
      minLabel: formatValue(min),
      maxLabel: formatValue(max),
    }
  }, [points, formatValue, variant])

  const timeLabel = formatTime

  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[9rem] flex-1 items-center justify-center text-[12px] text-black/35 dark:text-white/35",
          className,
        )}
      >
        No data
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid w-full min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] gap-x-2 gap-y-1",
        className,
      )}
    >
      <div className="flex flex-col justify-between py-0.5 text-right text-[10px] leading-none tabular-nums text-black/35 dark:text-white/35">
        <span>{chart.maxLabel}</span>
        <span>{chart.minLabel}</span>
      </div>
      <svg
        viewBox="0 0 100 56"
        className="min-h-[9rem] h-full w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        aria-label={variant === "bar" ? "Bar chart" : "Line chart"}
      >
        {variant === "bar" ? (
          chart.bars.map((bar, i) => (
            <rect
              key={points[i].time}
              x={bar.x}
              y={bar.y}
              width={bar.w}
              height={bar.h}
              rx={1.2}
              fill={accent}
              opacity={0.35 + (i / Math.max(chart.bars.length - 1, 1)) * 0.55}
            />
          ))
        ) : (
          <>
            <path d={chart.area} fill={accent} opacity="0.12" />
            <path
              d={chart.path}
              fill="none"
              stroke={accent}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>
      <div aria-hidden className="col-start-1" />
      <div className="flex justify-between text-[10px] text-black/35 dark:text-white/35">
        {chart.labels.map((l) => (
          <span key={l.time}>{timeLabel(l.time)}</span>
        ))}
      </div>
    </div>
  )
}
