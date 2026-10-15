const settingsStore = require("./settings-store.cjs")

const COINGECKO = "https://api.coingecko.com/api/v3"
const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart"
const BINANCE = "https://api.binance.com/api/v3"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

function marketErrorMessage(err) {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return "markets_error"
}

function cryptoSymbolKey(symbol) {
  return String(symbol).replace(/-USD$/i, "").toUpperCase()
}

function yahooChartSymbol(quote) {
  if (quote.type === "stock") return quote.symbol
  return `${cryptoSymbolKey(quote.symbol)}-USD`
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      ...headers,
    },
  })
  if (!res.ok) throw new Error(`http_${res.status}`)
  return res.json()
}

async function fetchCryptoQuotes(items) {
  const ids = items.map((i) => i.id).filter(Boolean)
  if (!ids.length) return []
  const params = new URLSearchParams({
    vs_currency: "usd",
    ids: ids.join(","),
    order: "market_cap_desc",
    per_page: String(Math.min(250, ids.length)),
    page: "1",
    sparkline: "false",
    price_change_percentage: "24h",
  })
  const rows = await fetchJson(`${COINGECKO}/coins/markets?${params}`)
  const byId = new Map(rows.map((row) => [row.id, row]))
  return items.map((item) => {
    const row = byId.get(item.id)
    if (!row) {
      return {
        id: item.id,
        symbol: item.symbol,
        type: "crypto",
        name: item.name || item.symbol,
        price: null,
        changePercent24h: null,
        imageUrl: null,
      }
    }
    return {
      id: item.id,
      symbol: item.symbol,
      type: "crypto",
      name: row.name || item.name || item.symbol,
      price: row.current_price ?? null,
      changePercent24h: row.price_change_percentage_24h ?? null,
      imageUrl: row.image ?? null,
    }
  })
}

async function fetchStockQuote(item) {
  const symbol = encodeURIComponent(item.symbol)
  const data = await fetchJson(`${YAHOO_CHART}/${symbol}?interval=1d&range=1d`)
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta) {
    return {
      id: item.id,
      symbol: item.symbol,
      type: "stock",
      name: item.name || item.symbol,
      price: null,
      changePercent24h: null,
      imageUrl: null,
    }
  }
  const price = meta.regularMarketPrice ?? null
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? null
  let changePercent24h = null
  if (price != null && prev != null && prev !== 0) {
    changePercent24h = ((price - prev) / prev) * 100
  }
  return {
    id: item.id,
    symbol: item.symbol,
    type: "stock",
    name: meta.shortName || item.name || item.symbol,
    price,
    changePercent24h,
    imageUrl: null,
  }
}

function seriesStats(points) {
  if (!points.length) {
    return { changePercent: null, high: null, low: null }
  }
  const values = points.map((p) => p.value)
  const first = values[0]
  const last = values[values.length - 1]
  const high = Math.max(...values)
  const low = Math.min(...values)
  const changePercent =
    first != null && first !== 0 && last != null ? ((last - first) / first) * 100 : null
  return { changePercent, high, low }
}

function downsample(points, maxPoints = 120) {
  if (points.length <= maxPoints) return points
  const step = (points.length - 1) / (maxPoints - 1)
  const out = []
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * step)
    out.push(points[idx])
  }
  return out
}

function yahooRangeConfig(range) {
  const rangeByKey = {
    "1d": { range: "1d", interval: "5m" },
    "1w": { range: "5d", interval: "1h" },
    "1m": { range: "1mo", interval: "1d" },
    "3m": { range: "3mo", interval: "1d" },
    "1y": { range: "1y", interval: "1wk" },
  }
  return rangeByKey[range] ?? rangeByKey["1w"]
}

function parseYahooChart(data) {
  const result = data?.chart?.result?.[0]
  if (!result) return []
  const timestamps = result.timestamp ?? []
  const quote = result.indicators?.quote?.[0] ?? {}
  const closes = quote.close ?? []
  const adj = result.indicators?.adjclose?.[0]?.adjclose ?? []
  const points = []
  for (let i = 0; i < timestamps.length; i++) {
    const value = closes[i] ?? adj[i]
    if (value == null || !Number.isFinite(value)) continue
    points.push({
      time: new Date(timestamps[i] * 1000).toISOString(),
      value,
    })
  }
  return points
}

async function fetchYahooChart(symbol, range) {
  const cfg = yahooRangeConfig(range)
  const encoded = encodeURIComponent(symbol)
  const data = await fetchJson(
    `${YAHOO_CHART}/${encoded}?interval=${cfg.interval}&range=${cfg.range}`,
  )
  const points = parseYahooChart(data)
  const sampled = downsample(points)
  const stats = seriesStats(sampled)
  return { points: sampled, ...stats }
}

async function fetchCryptoChart(item, range) {
  const daysByRange = { "1d": 1, "1w": 7, "1m": 30, "3m": 90, "1y": 365 }
  const days = daysByRange[range] ?? 7
  const data = await fetchJson(
    `${COINGECKO}/coins/${encodeURIComponent(item.id)}/market_chart?vs_currency=usd&days=${days}`,
  )
  const raw = data?.prices ?? []
  const points = raw
    .filter((row) => Array.isArray(row) && row.length >= 2)
    .map(([ts, value]) => ({
      time: new Date(ts).toISOString(),
      value: Number(value),
    }))
    .filter((p) => Number.isFinite(p.value))
  const sampled = downsample(points)
  const stats = seriesStats(sampled)
  return { points: sampled, ...stats }
}

async function fetchBinanceChart(symbol, range) {
  const base = cryptoSymbolKey(symbol)
  const pair = `${base}USDT`
  const cfgByRange = {
    "1d": { interval: "5m", limit: 288 },
    "1w": { interval: "1h", limit: 168 },
    "1m": { interval: "4h", limit: 180 },
    "3m": { interval: "1d", limit: 90 },
    "1y": { interval: "1d", limit: 365 },
  }
  const cfg = cfgByRange[range] ?? cfgByRange["1w"]
  const params = new URLSearchParams({
    symbol: pair,
    interval: cfg.interval,
    limit: String(cfg.limit),
  })
  const rows = await fetchJson(`${BINANCE}/klines?${params}`)
  if (!Array.isArray(rows)) {
    return { points: [], changePercent: null, high: null, low: null }
  }
  const points = rows
    .map((row) => ({
      time: new Date(row[0]).toISOString(),
      value: Number(row[4]),
    }))
    .filter((p) => Number.isFinite(p.value))
  const sampled = downsample(points)
  const stats = seriesStats(sampled)
  return { points: sampled, ...stats }
}

async function chart(quote, range) {
  if (!quote?.symbol || !quote?.type) {
    return { points: [], changePercent: null, high: null, low: null, error: "markets_error" }
  }
  const safeRange = ["1d", "1w", "1m", "3m", "1y"].includes(range) ? range : "1w"
  const errors = []

  try {
    const yahoo = await fetchYahooChart(yahooChartSymbol(quote), safeRange)
    if (yahoo.points.length > 0) return yahoo
  } catch (err) {
    errors.push(err)
  }

  if (quote.type === "crypto" && quote.id) {
    try {
      const gecko = await fetchCryptoChart(quote, safeRange)
      if (gecko.points.length > 0) return gecko
    } catch (err) {
      errors.push(err)
    }

    try {
      const binance = await fetchBinanceChart(quote.symbol, safeRange)
      if (binance.points.length > 0) return binance
    } catch (err) {
      errors.push(err)
    }
  }

  return {
    points: [],
    changePercent: null,
    high: null,
    low: null,
    error: marketErrorMessage(errors[0]),
  }
}

async function snapshot(watchlistOverride) {
  const settings = settingsStore.readSettings()
  const watchlist = Array.isArray(watchlistOverride)
    ? watchlistOverride
    : settings?.markets?.watchlist ?? []
  if (!watchlist.length) {
    return { quotes: [], configured: true }
  }

  const crypto = watchlist.filter((w) => w.type === "crypto")
  const stocks = watchlist.filter((w) => w.type === "stock")

  try {
    const [cryptoQuotes, stockSettled] = await Promise.all([
      fetchCryptoQuotes(crypto),
      Promise.allSettled(stocks.map((s) => fetchStockQuote(s))),
    ])
    const stockQuotes = stockSettled.map((result, index) => {
      if (result.status === "fulfilled") return result.value
      const item = stocks[index]
      return {
        id: item.id,
        symbol: item.symbol,
        type: "stock",
        name: item.name || item.symbol,
        price: null,
        changePercent24h: null,
        imageUrl: null,
      }
    })
    const quotes = [...cryptoQuotes, ...stockQuotes]
    const allFailed =
      quotes.length > 0 && quotes.every((q) => q.price === null && q.changePercent24h === null)
    if (allFailed) {
      const firstRejection = stockSettled.find((r) => r.status === "rejected")
      const reason = firstRejection?.reason
      return {
        quotes: [],
        configured: true,
        error: marketErrorMessage(reason),
      }
    }
    return { quotes, configured: true }
  } catch (err) {
    return {
      quotes: [],
      configured: true,
      error: marketErrorMessage(err),
    }
  }
}

module.exports = { snapshot, chart }
