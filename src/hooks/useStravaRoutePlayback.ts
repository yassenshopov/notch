import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  buildStravaRoutePlaybackGeometry,
  playbackDurationMs,
  routePointAtProgress,
  routePositionsThroughProgress,
  STRAVA_ROUTE_PLAYBACK_SPEEDS,
  type StravaRoutePlaybackSpeed,
  type StravaRoutePoint,
} from "../lib/strava-route-playback"

export function useStravaRoutePlayback(routePoints: StravaRoutePoint[]) {
  const geometry = useMemo(
    () => buildStravaRoutePlaybackGeometry(routePoints),
    [routePoints],
  )

  const durationMs = useMemo(
    () => (geometry ? playbackDurationMs(geometry.totalMeters) : 0),
    [geometry],
  )

  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<StravaRoutePlaybackSpeed>(1)
  const progressRef = useRef(0)
  progressRef.current = progress

  const effectiveDurationMs = durationMs > 0 ? durationMs / speed : 0

  const reset = useCallback(() => {
    setPlaying(false)
    setProgress(0)
    progressRef.current = 0
  }, [])

  useEffect(() => {
    reset()
  }, [geometry, reset])

  useEffect(() => {
    if (!playing || !geometry || effectiveDurationMs <= 0) return

    const startAt = performance.now()
    const startProgress = progressRef.current
    let raf = 0

    const tick = (now: number) => {
      const elapsed = now - startAt
      const next = startProgress + elapsed / effectiveDurationMs
      if (next >= 1) {
        setProgress(1)
        progressRef.current = 1
        setPlaying(false)
        return
      }
      setProgress(next)
      progressRef.current = next
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, geometry, effectiveDurationMs])

  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => {
      const i = STRAVA_ROUTE_PLAYBACK_SPEEDS.indexOf(prev)
      const next = STRAVA_ROUTE_PLAYBACK_SPEEDS[(i + 1) % STRAVA_ROUTE_PLAYBACK_SPEEDS.length]
      return next
    })
  }, [])

  const play = useCallback(() => {
    if (!geometry) return
    if (progressRef.current >= 1) {
      setProgress(0)
      progressRef.current = 0
    }
    setPlaying(true)
  }, [geometry])

  const pause = useCallback(() => {
    setPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    if (playing) pause()
    else play()
  }, [playing, pause, play])

  const seek = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next))
    setProgress(clamped)
    progressRef.current = clamped
    if (clamped >= 1) setPlaying(false)
  }, [])

  const markerPosition = useMemo(() => {
    if (!geometry) return null
    return routePointAtProgress(geometry, progress)
  }, [geometry, progress])

  const traveledPositions = useMemo(() => {
    if (!geometry) return [] as StravaRoutePoint[]
    return routePositionsThroughProgress(geometry, progress)
  }, [geometry, progress])

  const elapsedSeconds = Math.round(progress * (durationMs / 1000))

  return {
    geometry,
    progress,
    playing,
    speed,
    cycleSpeed,
    play,
    pause,
    toggle,
    reset,
    seek,
    markerPosition,
    traveledPositions,
    durationMs,
    elapsedSeconds,
  }
}

export type StravaRoutePlaybackController = ReturnType<typeof useStravaRoutePlayback>
