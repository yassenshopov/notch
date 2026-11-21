import { useCallback, useEffect, useState } from "react"
import {
  fetchCursorInsights,
  idleCursorInsights,
  type CursorActivityInsights,
} from "../lib/cursor-insights"

export function useCursorInsights(active: boolean, chartYear?: number) {
  const [insights, setInsights] = useState<CursorActivityInsights>(idleCursorInsights)
  const [loading, setLoading] = useState(() => active)

  const refresh = useCallback(
    async (force = false) => {
      if (!active) return
      setLoading(true)
      try {
        const data = await fetchCursorInsights({ force, year: chartYear })
        setInsights(data)
      } catch {
        setInsights({ ...idleCursorInsights, error: "cursor_insights_error" })
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

  return { insights, loading, refresh: () => void refresh(true) }
}