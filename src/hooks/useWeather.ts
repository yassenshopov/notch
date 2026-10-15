import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import { fetchWeather, type WeatherSnapshot } from "../lib/weather"

type WeatherState = {
  data: WeatherSnapshot | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useWeather(): WeatherState {
  const settings = useSettings()
  const [data, setData] = useState<WeatherSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    try {
      setError(null)
      const snapshot = await fetchWeather({ force })
      setData(snapshot)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weather")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), settings.refreshIntervalMs)
    return () => window.clearInterval(id)
  }, [load, settings.refreshIntervalMs, settings.temperatureUnit, settings.windSpeedUnit, settings.location])

  return { data, loading, error, refresh: () => void load(true) }
}
