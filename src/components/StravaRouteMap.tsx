import { useId } from "react"
import type { StravaActivitySummary } from "../lib/strava"
import { polylineToSvgPath } from "../lib/strava"
import { cn } from "../lib/utils"

type Props = {
  activity: StravaActivitySummary | null
  className?: string
  height?: number
}

export function StravaRouteMap({ activity, className, height = 140 }: Props) {
  const gridId = useId()
  const path = activity?.polyline
    ? polylineToSvgPath(activity.polyline, 320, height, 10)
    : null

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-black/8 bg-gradient-to-br from-[#1a1a1c] to-[#0d0d0f] dark:border-white/10",
        className,
      )}
      style={{ height }}
    >
      <svg
        viewBox={`0 0 320 ${height}`}
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <defs>
          <pattern id={gridId} width="16" height="16" patternUnits="userSpaceOnUse">
            <path
              d="M 16 0 L 0 0 0 16"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="320" height={height} fill={`url(#${gridId})`} />
        {path ? (
          <>
            <path
              d={path}
              fill="none"
              stroke="#fc4c02"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.35"
            />
            <path
              d={path}
              fill="none"
              stroke="#fc4c02"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <text
            x="160"
            y={height / 2}
            textAnchor="middle"
            className="fill-white/35 text-[11px]"
          >
            No GPS route
          </text>
        )}
      </svg>
    </div>
  )
}
