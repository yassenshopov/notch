import type { StravaHeatmap } from "../lib/strava"
import { cn } from "../lib/utils"

type Props = {
  heatmap: StravaHeatmap | null
  className?: string
  height?: number
}

export function StravaRouteHeatmap({ heatmap, className, height = 120 }: Props) {
  const size = heatmap?.gridSize ?? 28
  const cells = heatmap?.cells ?? []

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-black/8 bg-gradient-to-br from-[#1a1a1c] to-[#0d0d0f] dark:border-white/10",
        className,
      )}
      style={{ height }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full" aria-hidden>
        {cells.map((cell) => (
          <rect
            key={`${cell.x}-${cell.y}`}
            x={cell.x}
            y={cell.y}
            width={1}
            height={1}
            fill={`rgba(252, 76, 2, ${0.15 + cell.intensity * 0.85})`}
          />
        ))}
      </svg>
      {cells.length === 0 ? (
        <p className="absolute inset-0 flex items-center justify-center text-[11px] text-white/35">
          Ride or run more to build your heatmap
        </p>
      ) : null}
    </div>
  )
}
