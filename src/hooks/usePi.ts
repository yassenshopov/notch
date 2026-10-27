import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import { emptyServerStats } from "../lib/server-stats"
import {
  emptyServerStatsHistory,
  historyAfterServerStatus,
  type ServerStatsHistory,
} from "../lib/server-stats-history"
import { fetchPiStatus, type PiServerStatus } from "../lib/pi"

export function usePi(active = true) {
  const settings = useSettings()
  const host = settings.pi?.sshHost ?? "pi"
  const [status, setStatus] = useState<PiServerStatus>(() => emptyServerStats(host))
  const [history, setHistory] = useState<ServerStatsHistory>(() => emptyServerStatsHistory())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(
    async (force = false) => {
      if (force) setRefreshing(true)
      try {
        const data = await fetchPiStatus({ force, host })
        setStatus(data)
        if (data.connected) {
          setHistory((h) => historyAfterServerStatus(data, h))
        } else {
          setHistory(emptyServerStatsHistory())
        }
      } catch {
        setStatus({ ...emptyServerStats(host), error: "pi_error" })
        setHistory(emptyServerStatsHistory())
      } finally {
        setLoading(false)
        if (force) setRefreshing(false)
      }
    },
    [host],
  )

  useEffect(() => {
    setHistory(emptyServerStatsHistory())
    setStatus(emptyServerStats(host))
  }, [host])

  useEffect(() => {
    if (!active) return
    setLoading(true)
    void refresh()
    const id = window.setInterval(() => void refresh(), settings.pi?.pollIntervalMs ?? 30_000)
    return () => window.clearInterval(id)
  }, [active, refresh, settings.pi?.pollIntervalMs])

  return { status, history, loading, refreshing, refresh: () => void refresh(true) }
}
