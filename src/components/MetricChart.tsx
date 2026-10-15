import { useMemo } from "react"
import { cn, formatHour } from "../lib/utils"

type Point = { time: string; value: number }

type Props = {
  points: Point[]
  formatValue?: (v: number) => string
  formatTime?: (iso: string) => string
  className?: string
  accent?: string
}

export function MetricChart({
  points,
  formatValue = (v) => String(Math.round(v)),
  formatTime = formatHour,
  className,
  accent = "currentColor",
}: Props) {
  const { path, area, labels, minLabel, maxLabel } = useMemo(() => {
    if (points.length === 0) {
      return { path: "", area: "", labels: [] as Point[], minLabel: "", maxLabel: "" }
    }

    const values = points.map((p) => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = Math.max(0.0001, max - min)
    const w = 100
    const h = 56
    const padY = 4

    const coords = points.map((p, i) => {
      const x = points.length === 1 ? w / 2 : (i / (points.length - 1)) * w
      const y = padY + (1 - (p.value - min) / span) * (h - padY * 2)
      return { x, y, ...p }
    })

    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ")
    const areaPath = `${line} L ${coords[coords.length - 1].x.toFixed(2)} ${h} L ${coords[0].x.toFixed(2)} ${h} Z`

    const labelIdx =
      points.length <= 4
        ? points.map((_, i) => i)
        : [0, Math.floor((points.length - 1) / 2), points.length - 1]

    return {
      path: line,
      area: areaPath,
      labels: labelIdx.map((i) => points[i]),
      minLabel: formatValue(min),
      maxLabel: formatValue(max),
    }
  }, [points, formatValue])

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
        <span>{maxLabel}</span>
        <span>{minLabel}</span>
      </div>
      <svg
        viewBox="0 0 100 56"
        className="min-h-[9rem] h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <path d={area} fill={accent} opacity="0.12" />
        <path
          d={path}
          fill="none"
          stroke={accent}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div aria-hidden className="col-start-1" />
      <div className="flex justify-between text-[10px] text-black/35 dark:text-white/35">
        {labels.map((l) => (
          <span key={l.time}>{timeLabel(l.time)}</span>
        ))}
      </div>
    </div>
  )
}
