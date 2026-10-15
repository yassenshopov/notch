import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import { fetchCursorStatus, type CursorStatus } from "../lib/cursor"

const idle: CursorStatus = {
  connected: false,
  configured: false,
}

export function useCursor(active = true) {
  const settings = useSettings()
  const [status, setStatus] = useState<CursorStatus>(idle)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const next = await fetchCursorStatus()
      setStatus(next)
    } catch {
      setStatus({ ...idle, error: "cursor_error", message: "Could not load Cursor usage." })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    setLoading(true)
    void refresh()
    const id = window.setInterval(() => void refresh(), settings.cursor.pollIntervalMs)
    return () => window.clearInterval(id)
  }, [active, refresh, settings.cursor.pollIntervalMs])

  return { status, loading, refresh }
}
