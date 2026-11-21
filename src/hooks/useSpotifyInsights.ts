import { useCallback, useEffect, useState } from "react"
import {
  fetchSpotifyInsights,
  type SpotifyActivityInsights,
} from "../lib/spotify-insights"

const idle: SpotifyActivityInsights = {
  configured: false,
  ready: false,
  connected: false,
  totalStreams: 0,
  years: [],
  chartYear: new Date().getFullYear(),
  weeks: [],
  days: [],
  totalPlays: 0,
  totalMs: 0,
  totalMinutes: 0,
  profile: null,
  monthly: [],
  topArtists: [],
  topTracks: [],
}

export function useSpotifyInsights(active: boolean, chartYear?: number) {
  const [insights, setInsights] = useState<SpotifyActivityInsights>(idle)
  const [loading, setLoading] = useState(() => active)

  const refresh = useCallback(
    async () => {
      if (!active) return
      setLoading(true)
      try {
        const data = await fetchSpotifyInsights({ year: chartYear })
        setInsights(data)
      } catch {
        setInsights({ ...idle, error: "spotify_insights_error" })
      } finally {
        setLoading(false)
      }
    },
    [active, chartYear],
  )

  useEffect(() => {
    if (!active) return
    void refresh()
  }, [active, refresh])

  return { insights, loading, refresh: () => void refresh() }
}