import { useMemo, useState } from "react"
import type { StravaRoutePlaybackGeometry } from "../lib/strava-route-playback"
import { useSmoothedScalar } from "../hooks/useSmoothedScalar"
import { activityRouteColor, type StravaActivityStreams, type StravaActivitySummary } from "../lib/strava"
import { buildStravaPlaybackSnapshot } from "../lib/strava-playback-stats"
import { cn } from "../lib/utils"
import { StravaMetricSparkline } from "./StravaMetricSparkline"

type Props = {
  activity: StravaActivitySummary
  progress: number
  geometry: StravaRoutePlaybackGeometry | null
  streams: StravaActivityStreams | null
  onSeek: (progress: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
  className?: string
}

function PlaybackScrubTrack({
  progress,
  accent,
  onSeek,
  onScrubStart,
  onScrubEnd,
}: {
  progress: number
  accent: string
  onSeek: (progress: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
}) {
  const pct = Math.min(100, Math.max(0, progress * 100))

  return (
    <div className="strava-playback-widget-scrub-track relative mt-3 h-11 w-full">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-3.5 -translate-y-1/2 overflow-hidden rounded-full bg-black/8 dark:bg-white/10"
        aria-hidden
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>
      <div
        className="pointer-events-none absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white shadow-md dark:border-white/95"
        style={{ left: `${pct}%`, backgroundColor: accent }}
        aria-hidden
      />
      <input
        type="range"
        min={0}
        max={1000}
        step={1}
        value={Math.round(progress * 1000)}
        onChange={(e) => onSeek(Number(e.target.value) / 1000)}
        onPointerDown={() => onScrubStart?.()}
        onPointerUp={() => onScrubEnd?.()}
        onPointerCancel={() => onScrubEnd?.()}
        className="strava-playback-widget-scrub-input absolute inset-0 m-0 size-full cursor-pointer appearance-none bg-transparent"
        aria-label="Scrub route playback"
        aria-valuemin={0}
        aria-valuemax={1000}
        aria-valuenow={Math.round(progress * 1000)}
      />
    </div>
  )
}

export function StravaPlaybackStatsWidget({
  activity,
  progress,
  geometry,
  streams,
  onSeek,
  onScrubStart,
  onScrubEnd,
  className,
}: Props) {
  const [scrubbing, setScrubbing] = useState(false)

  const displayProgress = useSmoothedScalar(progress, {
    enabled: !scrubbing,
    durationMs: 360,
  })
  const scrubProgress = scrubbing ? progress : displayProgress

  const snapshot = useMemo(
    () => buildStravaPlaybackSnapshot(activity, displayProgress, geometry, streams),
    [activity, displayProgress, geometry, streams],
  )

  const accent = activityRouteColor(activity.type)
  const pct = Math.round(snapshot.progress * 100)

  return (
    <div
      className={cn(
        "rounded-2xl border border-black/8 bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.03]",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3 text-[12px] transition-opacity duration-300">
        <span className="font-semibold tabular-nums tracking-tight">
          {snapshot.distanceCurrent}
          <span className="font-normal text-black/40 dark:text-white/40">
            {" "}
            / {snapshot.distanceTotal}
          </span>
        </span>
        <span className="shrink-0 font-medium tabular-nums text-black/45 dark:text-white/45">
          {pct}%
        </span>
      </div>

      <PlaybackScrubTrack
        progress={scrubProgress}
        accent={accent}
        onSeek={onSeek}
        onScrubStart={() => {
          setScrubbing(true)
          onScrubStart?.()
        }}
        onScrubEnd={() => {
          setScrubbing(false)
          onScrubEnd?.()
        }}
      />

      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[11px] transition-opacity duration-300">
        <span className="tabular-nums text-black/55 dark:text-white/55">
          <span className="font-semibold text-black/80 dark:text-white/85">
            {snapshot.timeCurrent}
          </span>
          {snapshot.timeTotal !== "—" ? (
            <span className="text-black/40 dark:text-white/40"> / {snapshot.timeTotal}</span>
          ) : null}
          <span className="text-black/40 dark:text-white/40"> moving</span>
        </span>
        {snapshot.clock ? (
          <span className="tabular-nums text-black/45 dark:text-white/45">{snapshot.clock}</span>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-black/6 pt-3 dark:border-white/8 sm:grid-cols-4">
        {snapshot.live.map((metric) => {
          const playhead =
            metric.series && metric.series.length > 1
              ? displayProgress * (metric.series.length - 1)
              : 0
          return (
            <div key={metric.label}>
              <dt className="text-[10px] text-black/40 dark:text-white/40">{metric.label}</dt>
              <dd
                className={cn(
                  metric.value === "—"
                    ? "text-black/25 dark:text-white/25"
                    : "text-black/85 dark:text-white/90",
                )}
              >
                {metric.series && metric.series.length > 1 ? (
                  <StravaMetricSparkline series={metric.series} playhead={playhead} />
                ) : null}
                <span className="block text-[13px] font-semibold tabular-nums transition-[color,opacity] duration-300 ease-out">
                  {metric.value}
                </span>
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
