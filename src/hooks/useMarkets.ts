import { useCallback, useEffect, useState } from "react"
import { getSettings, useSettings } from "../config/settings-store"
import { fetchMarkets, type MarketsSnapshot } from "../lib/markets"

const empty: MarketsSnapshot = { quotes: [] }

export function useMarkets(active = true) {
  const settings = useSettings()
  const [snapshot, setSnapshot] = useState<MarketsSnapshot>(empty)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const watchlistKey = settings.markets.watchlist.map((w) => w.symbol).join(",")

  const refresh = useCallback(async () => {
    try {
      const data = await fetchMarkets(getSettings().markets.watchlist)
      setSnapshot(data)
    } catch (err) {
      setSnapshot({
        quotes: [],
        error: err instanceof Error ? err.message : "markets_error",
      })
    } finally {
      setLoading(false)
    }
  }, [watchlistKey])

  useEffect(() => {
    if (!active) return
    setLoading(true)
    void refresh()
    const id = window.setInterval(() => void refresh(), settings.markets.pollIntervalMs)
    return () => window.clearInterval(id)
  }, [
    active,
    refresh,
    settings.markets.pollIntervalMs,
    watchlistKey,
  ])

  const refreshManual = useCallback(() => {
    setRefreshing(true)
    void refresh().finally(() => setRefreshing(false))
  }, [refresh])

  return { snapshot, loading, refreshing, refresh: refreshManual }
}
