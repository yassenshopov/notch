import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import { emptyServerStats } from "../lib/server-stats"
import { fetchPiStatus, type PiServerStatus } from "../lib/pi"

export function usePi(active = true) {
  const settings = useSettings()
  const host = settings.pi?.sshHost ?? "pi-home"
  const [status, setStatus] = useState<PiServerStatus>(() => emptyServerStats(host))
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(
    async (force = false) => {
      if (force) setRefreshing(true)
      try {
        setStatus(await fetchPiStatus({ force, host }))
      } catch {
        setStatus({ ...emptyServerStats(host), error: "pi_error" })
      } finally {
        setLoading(false)
        if (force) setRefreshing(false)
      }
    },
    [host],
  )

  useEffect(() => {
    if (!active) return
    setLoading(true)
    void refresh()
    const id = window.setInterval(() => void refresh(), settings.pi?.pollIntervalMs ?? 30_000)
    return () => window.clearInterval(id)
  }, [active, refresh, settings.pi?.pollIntervalMs])

  return { status, loading, refreshing, refresh: () => void refresh(true) }
}
