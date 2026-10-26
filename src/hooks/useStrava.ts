import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import { fetchStravaStatus, type StravaStatus } from "../lib/strava"

const idle: StravaStatus = {
  configured: false,
  connected: false,
  login: null,
  avatarUrl: null,
  athleteId: null,
  stats: null,
  streak: null,
  calendar: null,
  calendarActivities: [],
  heatmap: null,
  featuredActivity: null,
  activities: [],
  monthDistance: 0,
}

export function useStrava(active = true) {
  const settings = useSettings()
  const [status, setStatus] = useState<StravaStatus>(idle)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async (force = false) => {
    if (force) setRefreshing(true)
    try {
      const data = await fetchStravaStatus({ force })
      setStatus(data)
    } catch {
      setStatus({ ...idle, error: "strava_error" })
    } finally {
      setLoading(false)
      if (force) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    setLoading(true)
    void refresh()
    const ms = settings.strava?.pollIntervalMs ?? 180_000
    const id = window.setInterval(() => void refresh(), ms)
    return () => window.clearInterval(id)
  }, [active, refresh, settings.strava?.pollIntervalMs])

  const connect = useCallback(async () => {
    const data = await window.notch?.strava?.connect()
    if (data) setStatus(data)
    return data
  }, [])

  const disconnect = useCallback(async () => {
    const data = await window.notch?.strava?.disconnect()
    if (data) setStatus(data)
    return data
  }, [])

  return {
    status,
    loading,
    refreshing,
    refresh: () => void refresh(true),
    connect,
    disconnect,
  }
}
