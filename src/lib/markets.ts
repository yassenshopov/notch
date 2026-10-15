import type { MarketWatchItem } from "../config/settings"

export type MarketAssetType = "crypto" | "stock"

export type MarketQuote = {
  id: string
  symbol: string
  type: MarketAssetType
  name: string
  price: number | null
  changePercent24h: number | null
  imageUrl?: string | null
}

export type MarketChartRange = "1d" | "1w" | "1m" | "3m" | "1y"

export type MarketChartPoint = { time: string; value: number }

export type MarketChartSeries = {
  points: MarketChartPoint[]
  changePercent: number | null
  high: number | null
  low: number | null
  error?: string
}

export type MarketsSnapshot = {
  quotes: MarketQuote[]
  configured?: boolean
  error?: string
}

export async function fetchMarkets(watchlist?: MarketWatchItem[]): Promise<MarketsSnapshot> {
  const bridge = window.notch?.markets
  if (!bridge) {
    return { quotes: [], error: "no_electron", configured: true }
  }
  return bridge.snapshot(watchlist)
}

export async function fetchMarketChart(
  quote: Pick<MarketQuote, "id" | "symbol" | "type">,
  range: MarketChartRange,
): Promise<MarketChartSeries> {
  const bridge = window.notch?.markets
  if (!bridge) {
    return { points: [], changePercent: null, high: null, low: null, error: "no_electron" }
  }
  if (!bridge.chart) {
    return {
      points: [],
      changePercent: null,
      high: null,
      low: null,
      error: "chart_unavailable",
    }
  }
  return bridge.chart(quote, range)
}

export function formatMarketsError(code: string | undefined): string {
  if (!code) return "Could not load market data."
  if (code === "markets_error") return "Could not load market data. Try refresh."
  if (code === "no_electron") return "Markets require the Notch desktop app."
  if (code === "chart_unavailable") {
    return "Chart data needs a full app restart (quit Notch, then run npm run dev again)."
  }
  if (code.startsWith("http_")) {
    const status = code.slice(5)
    if (status === "429") return "Rate limited — wait a moment and refresh."
    return `Market data unavailable (${status}).`
  }
  return code
}

export function formatQuoteChange(changePercent: number | null): string {
  if (changePercent === null || Number.isNaN(changePercent)) return "—"
  const sign = changePercent >= 0 ? "+" : ""
  return `${sign}${changePercent.toFixed(2)}%`
}

export function formatQuotePrice(price: number | null, currency = "USD"): string {
  if (price === null || Number.isNaN(price)) return "—"
  if (price >= 1000) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price)
  }
  if (price >= 1) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price)
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumSignificantDigits: 4,
  }).format(price)
}
