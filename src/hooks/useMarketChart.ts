import { useEffect, useRef, useState } from "react"
import {
  fetchMarketChart,
  type MarketChartRange,
  type MarketChartSeries,
  type MarketQuote,
} from "../lib/markets"

const empty: MarketChartSeries = {
  points: [],
  changePercent: null,
  high: null,
  low: null,
}

export function useMarketChart(
  quote: Pick<MarketQuote, "id" | "symbol" | "type"> | null,
  range: MarketChartRange,
) {
  const [series, setSeries] = useState<MarketChartSeries>(empty)
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)

  const quoteKey = quote ? `${quote.type}:${quote.id}:${quote.symbol}` : ""

  useEffect(() => {
    if (!quote) {
      setSeries(empty)
      setLoading(false)
      return
    }

    const id = ++requestId.current
    setSeries(empty)
    setLoading(true)

    void fetchMarketChart(quote, range)
      .then((data) => {
        if (requestId.current !== id) return
        setSeries(data)
      })
      .catch(() => {
        if (requestId.current !== id) return
        setSeries({ ...empty, error: "markets_error" })
      })
      .finally(() => {
        if (requestId.current !== id) return
        setLoading(false)
      })
  }, [quoteKey, range])

  return {
    series,
    loading,
    refresh: () => {
      if (!quote) return
      const id = ++requestId.current
      setLoading(true)
      void fetchMarketChart(quote, range)
        .then((data) => {
          if (requestId.current !== id) return
          setSeries(data)
        })
        .catch(() => {
          if (requestId.current !== id) return
          setSeries({ ...empty, error: "markets_error" })
        })
        .finally(() => {
          if (requestId.current !== id) return
          setLoading(false)
        })
    },
  }
}
