import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import { fetchMintStatus, type MintServerStatus } from "../lib/mint"
import {
  emptyServerStatsHistory,
  historyAfterServerStatus,
  type ServerStatsHistory,
} from "../lib/server-stats-history"
import { emptyServerStats } from "../lib/server-stats"

export function useMint(active = true) {
  const settings = useSettings()
  const host = settings.mint?.sshHost ?? "mint"
  const [status, setStatus] = useState<MintServerStatus>(() => emptyServerStats(host))
  const [history, setHistory] = useState<ServerStatsHistory>(() => emptyServerStatsHistory())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(
    async (force = false) => {
      if (force) setRefreshing(true)
      try {
        const data = await fetchMintStatus({
          force,
          host,
        })
        setStatus(data)
        if (data.connected) {
          setHistory((h) => historyAfterServerStatus(data, h))
        } else {
          setHistory(emptyServerStatsHistory())
        }
      } catch {
        setStatus({ ...emptyServerStats(host), error: "mint_error" })
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
    const id = window.setInterval(() => void refresh(), settings.mint?.pollIntervalMs ?? 30_000)
    return () => window.clearInterval(id)
  }, [active, refresh, settings.mint?.pollIntervalMs])

  return { status, history, loading, refreshing, refresh: () => void refresh(true) }
}
