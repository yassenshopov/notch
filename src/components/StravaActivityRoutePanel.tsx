import { useEffect, useMemo, useRef, useState } from "react"
import type { StravaActivitySummary } from "../lib/strava"
import { buildStravaRoutePath, fetchStravaActivity, openStravaUrl } from "../lib/strava"
import { buildStravaActivityTotalStats } from "../lib/strava-playback-stats"
import { useStravaRoutePlayback } from "../hooks/useStravaRoutePlayback"
import { StravaOsmMap } from "./StravaOsmMap"
import { StravaPlaybackStatsWidget } from "./StravaPlaybackStatsWidget"
import { cn } from "../lib/utils"

type Props = {
  activity: StravaActivitySummary
  className?: string
}

export function StravaActivityRoutePanel({ activity, className }: Props) {
  const [detail, setDetail] = useState(activity)

  useEffect(() => {
    setDetail(activity)
  }, [activity])

  useEffect(() => {
    let cancelled = false
    void fetchStravaActivity(activity.id, { force: true }).then((next) => {
      if (!cancelled) setDetail(next)
    })
    return () => {
      cancelled = true
    }
  }, [activity.id])

  const routePoints = useMemo(
    () => (detail.polyline ? buildStravaRoutePath(detail.polyline) : []),
    [detail.polyline],
  )
  const playback = useStravaRoutePlayback(routePoints)
  const resumeAfterScrub = useRef(false)

  const totalStats = useMemo(() => buildStravaActivityTotalStats(detail), [detail])

  const date = new Date(detail.startDate).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  return (
    <div className={cn("grid gap-6 lg:grid-cols-2 lg:items-stretch", className)}>
      <StravaOsmMap
        polyline={detail.polyline}
        activityType={detail.type}
        fillHeight
        className="min-h-[280px] rounded-2xl lg:min-h-0"
        interactive
        playback
        playbackController={playback}
      />
      <div className="flex min-w-0 flex-col">
        <button
          type="button"
          onClick={() => openStravaUrl(detail.url)}
          className="text-left text-[17px] font-semibold tracking-tight text-black hover:text-[#fc4c02] hover:underline dark:text-white"
        >
          {detail.name}
        </button>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-black/45 dark:text-white/45">
            {date} · {detail.type}
          </span>
          {totalStats.map((stat) => (
            <span
              key={stat.label}
              title={stat.label}
              className="inline-flex max-w-full items-center rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-black/70 dark:bg-white/[0.06] dark:text-white/80"
            >
              <span className="sr-only">{stat.label}: </span>
              {stat.value}
            </span>
          ))}
        </div>

        <StravaPlaybackStatsWidget
          className="mt-5"
          activity={detail}
          progress={playback.progress}
          geometry={playback.geometry}
          streams={detail.streams ?? null}
          onSeek={playback.seek}
          onScrubStart={() => {
            resumeAfterScrub.current = playback.playing
            playback.pause()
          }}
          onScrubEnd={() => {
            if (resumeAfterScrub.current) playback.play()
          }}
        />
      </div>
    </div>
  )
}
