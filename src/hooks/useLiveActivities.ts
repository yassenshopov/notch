import { useEffect, useMemo, useState } from "react"
import { updateSettings, useSettings } from "../config/settings-store"
import { fetchCursorStatus, type CursorStatus } from "../lib/cursor"
import {
  collectLiveActivities,
  type LiveActivity,
} from "../lib/live-activities"
import type { WeatherSnapshot } from "../lib/weather"

const cursorIdle: CursorStatus = { connected: false }

type Options = {
  /** Collapsed notch and live activities enabled in settings */
  active: boolean
  weather: WeatherSnapshot | null
}

function useCursorForLiveActivities(enabled: boolean) {
  const settings = useSettings()
  const [status, setStatus] = useState<CursorStatus>(cursorIdle)

  useEffect(() => {
    if (!enabled) {
      setStatus(cursorIdle)
      return
    }

    let cancelled = false
    const tick = async () => {
      try {
        const next = await fetchCursorStatus()
        if (!cancelled) setStatus(next)
      } catch {
        if (!cancelled) setStatus(cursorIdle)
      }
    }

    void tick()
    const pollMs = Math.min(settings.cursor.pollIntervalMs, settings.cursor.trayPollIntervalMs)
    const id = window.setInterval(() => void tick(), Math.max(60_000, pollMs))
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [
    enabled,
    settings.cursor.pollIntervalMs,
    settings.cursor.trayPollIntervalMs,
  ])

  useEffect(() => {
    if (!enabled || !status.connected || !status.usage?.enabled) return
    const pct = Math.round(status.usage.totalPercentUsed)
    const threshold = settings.cursor.usageWarningPercent
    const snoozed = settings.liveActivities.cursor.snoozedUntilMs
    if (snoozed > 0 && pct < threshold - 5) {
      void updateSettings({
        liveActivities: {
          ...settings.liveActivities,
          cursor: { ...settings.liveActivities.cursor, snoozedUntilMs: 0 },
        },
      })
    }
  }, [
    enabled,
    status,
    settings.cursor.usageWarningPercent,
    settings.liveActivities,
  ])

  return status
}

function useLiveActivityRotation(
  enabled: boolean,
  activities: LiveActivity[],
  dwellMs: number,
): LiveActivity | null {
  const key = activities.map((a) => a.id).join("|")
  const list = useMemo(() => activities, [key])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [key])

  useEffect(() => {
    if (!enabled || list.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length)
    }, Math.max(3_000, dwellMs))
    return () => window.clearInterval(id)
  }, [enabled, list, dwellMs, key])

  if (list.length === 0) return null
  return list[index % list.length] ?? list[0]
}

/** Priority queue for transient collapsed-pill states (music wins in Notch.tsx). */
export function useLiveActivities({ active, weather }: Options) {
  const settings = useSettings()
  const cursorEnabled =
    active && settings.liveActivities.enabled && settings.liveActivities.cursor.enabled
  const cursor = useCursorForLiveActivities(cursorEnabled)

  const activities = useMemo(
    () => collectLiveActivities(weather, cursorEnabled ? cursor : null, settings),
    [weather, cursor, cursorEnabled, settings],
  )

  const rotateEnabled = active && activities.length > 0
  const current = useLiveActivityRotation(
    rotateEnabled,
    activities,
    settings.liveActivities.dwellMs,
  )

  return { current, activities, cursorStatus: cursorEnabled ? cursor : null }
}
