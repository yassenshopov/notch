import { polylineToSvgPath } from "../lib/strava"
import { cn } from "../lib/utils"

const W = 76
const H = 52

type Props = {
  polyline: string | null
  className?: string
}

export function StravaRouteThumbnail({ polyline, className }: Props) {
  const path = polyline ? polylineToSvgPath(polyline, W, H, 5) : null

  return (
    <div
      className={cn(
        "flex w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-black/[0.04] dark:border-white/12 dark:bg-white/[0.06]",
        className,
      )}
      style={{ height: H }}
      aria-hidden
    >
      {path ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="size-full" preserveAspectRatio="xMidYMid meet">
          <path
            d={path}
            fill="none"
            stroke="#fc4c02"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span className="text-[9px] text-black/30 dark:text-white/30">—</span>
      )}
    </div>
  )
}
