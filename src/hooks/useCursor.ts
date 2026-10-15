import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import {
  fetchCursorAnalytics,
  fetchCursorStatus,
  type CursorStatus,
} from "../lib/cursor"

const idle: CursorStatus = {
  connected: false,
  configured: false,
}

export function useCursor(active = true) {
  const settings = useSettings()
  const [status, setStatus] = useState<CursorStatus>(idle)
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async (force = false) => {
    if (force) setRefreshing(true)
    try {
      const quick = await fetchCursorStatus({ force })
      setStatus(quick)
      setLoading(false)

      if (!quick.connected) return

      setAnalyticsLoading(true)
      const extra = await fetchCursorAnalytics({ force })
      if (extra) {
        setStatus((prev) => ({
          ...prev,
          limits: extra.limits ?? prev.limits,
          analytics: extra.analytics ?? prev.analytics,
          cloud: extra.cloud ?? prev.cloud,
        }))
      }
    } catch {
      setStatus({ ...idle, error: "cursor_error", message: "Could not load Cursor usage." })
      setLoading(false)
    } finally {
      setAnalyticsLoading(false)
      if (force) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    setLoading(true)
    void refresh()
    const id = window.setInterval(() => void refresh(), settings.cursor.pollIntervalMs)
    return () => window.clearInterval(id)
  }, [active, refresh, settings.cursor.pollIntervalMs])

  return { status, loading, analyticsLoading, refreshing, refresh: () => void refresh(true) }
}
