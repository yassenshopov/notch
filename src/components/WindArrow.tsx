import { Navigation2 } from "lucide-react"
import { cn } from "../lib/utils"

type Props = {
  /** Meteorological degrees: direction wind comes FROM (0 = N, 90 = E). */
  degrees: number
  className?: string
}

/**
 * Arrow points toward the source of the wind (into the wind).
 * Navigation2 points up by default → rotate by degrees.
 */
export function WindArrow({ degrees, className }: Props) {
  return (
    <Navigation2
      aria-hidden
      className={cn("size-3.5 shrink-0", className)}
      strokeWidth={2.25}
      fill="currentColor"
      style={{ transform: `rotate(${degrees}deg)` }}
    />
  )
}
