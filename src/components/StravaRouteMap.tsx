import type { StravaActivitySummary } from "../lib/strava"
import { cn } from "../lib/utils"
import { StravaOsmMap } from "./StravaOsmMap"

type Props = {
  activity: StravaActivitySummary | null
  className?: string
  height?: number
}

export function StravaRouteMap({ activity, className, height = 168 }: Props) {
  return (
    <StravaOsmMap
      polyline={activity?.polyline ?? null}
      activityType={activity?.type ?? null}
      className={cn(className)}
      height={height}
    />
  )
}
