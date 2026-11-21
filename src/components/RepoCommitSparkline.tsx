import { useMemo } from "react"
import { cn } from "../lib/utils"

type Props = {
  points: number[]
  color?: string
  className?: string
  width?: number
  height?: number
}

const VIEW_W = 100
const VIEW_H = 24
const MIN_BAR_H = 1.15
const ZERO_OPACITY = 0.22
const ACTIVE_OPACITY = 0.9

export function RepoCommitSparkline({
  points,
  color = "currentColor",
  className,
  width = 112,
  height = 28,
}: Props) {
  const bars = useMemo(() => {
    if (!points.length) return []
    const max = Math.max(1, ...points)
    const padY = 1.5
    const plotH = VIEW_H - padY * 2
    const n = points.length
    const gap = Math.min(0.8, VIEW_W / n / 4)
    const barW = Math.max(0.5, (VIEW_W - gap * (n - 1)) / n)
    return points.map((value, i) => {
      const scaled = value > 0 ? (value / max) * plotH : MIN_BAR_H
      const h = Math.max(MIN_BAR_H, scaled)
      const x = i * (barW + gap)
      const y = padY + plotH - h
      return { x, y, w: barW, h, value, opacity: value > 0 ? ACTIVE_OPACITY : ZERO_OPACITY }
    })
  }, [points])

  if (!bars.length) {
    return (
      <span
        className={cn("inline-block shrink-0 opacity-25", className)}
        style={{ width, height }}
        aria-hidden
      />
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Commit activity over the last year"
    >
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={bar.y}
          width={bar.w}
          height={bar.h}
          rx={0.6}
          fill={color}
          opacity={bar.opacity}
        />
      ))}
    </svg>
  )
}