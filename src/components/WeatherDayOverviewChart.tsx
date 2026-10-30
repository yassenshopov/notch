import { useMemo } from "react"
import type { ClockFormat } from "../config/settings"
import type { DayForecast } from "../lib/weather"
import { cn, formatHour, formatTemp } from "../lib/utils"

type Props = {
  day: DayForecast
  unit: "celsius" | "fahrenheit"
  clockFormat: ClockFormat
  className?: string
}

const W = 100
const H = 48
const PAD = 2

export function WeatherDayOverviewChart({ day, unit, clockFormat, className }: Props) {
  const series = day.series.length > 0 ? day.series : day.hourly
  const { tempPath, precipRects, minT, maxT, labels } = useMemo(() => {
    if (series.length === 0) {
      return { tempPath: "", precipRects: [] as { x: number; h: number }[], minT: 0, maxT: 0, labels: [] as string[] }
    }
    const temps = series.map((p) => p.temp)
    const minT = Math.min(...temps)
    const maxT = Math.max(...temps)
    const span = Math.max(1, maxT - minT)
    const innerW = W - PAD * 2
    const innerH = H - PAD * 2 - 8
    const step = series.length > 1 ? innerW / (series.length - 1) : 0

    const points = series.map((p, i) => {
      const x = PAD + i * step
      const y = PAD + innerH - ((p.temp - minT) / span) * innerH
      return `${x},${y}`
    })
    const tempPath = points.length > 1 ? `M ${points.join(" L ")}` : ""

    const precipRects = series.map((p, i) => {
      const x = PAD + i * step - 0.8
      const h = (Math.min(100, p.precipProbability) / 100) * 6
      return { x, h }
    })

    const labelIdx = [0, Math.floor(series.length / 2), series.length - 1].filter(
      (v, i, a) => a.indexOf(v) === i,
    )
    const labels = labelIdx.map((i) => formatHour(series[i].time, clockFormat))

    return { tempPath, precipRects, minT, maxT, labels }
  }, [series, clockFormat])

  if (series.length < 2) return null

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          Today
        </p>
        <p className="text-[10px] tabular-nums text-black/35 dark:text-white/35">
          {formatTemp(minT, unit)} – {formatTemp(maxT, unit)}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full min-h-[5.5rem] w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        {precipRects.map((r, i) => (
          <rect
            key={i}
            x={r.x}
            y={H - PAD - r.h}
            width={1.6}
            height={r.h}
            className="fill-sky-500/35 dark:fill-sky-400/30"
            rx={0.3}
          />
        ))}
        {tempPath ? (
          <path
            d={tempPath}
            fill="none"
            className="stroke-black/55 dark:stroke-white/70"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] tabular-nums text-black/35 dark:text-white/35">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <p className="mt-0.5 text-[9px] text-black/30 dark:text-white/30">
        Line = temperature · bars = rain chance
      </p>
    </div>
  )
}
