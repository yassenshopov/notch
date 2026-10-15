import type { MarketAssetType } from "./markets"

export const CRYPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  DOGE: "dogecoin",
  XRP: "ripple",
  ADA: "cardano",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  LINK: "chainlink",
  MATIC: "matic-network",
}

export function cryptoSymbolKey(symbol: string): string {
  return symbol.replace(/-USD$/i, "").toUpperCase()
}

/** Yahoo Finance ticker for chart history (crypto uses CCC pairs). */
export function marketYahooChartSymbol(quote: {
  symbol: string
  type: MarketAssetType
}): string {
  if (quote.type === "stock") return quote.symbol
  return `${cryptoSymbolKey(quote.symbol)}-USD`
}

const MARKET_ACCENT_BY_TYPE: Record<MarketAssetType, string> = {
  crypto: "#E8B923",
  stock: "#22C55E",
}

export function marketAccentColor(quote: { symbol: string; type: MarketAssetType }): string {
  const isCrypto =
    quote.type === "crypto" || Boolean(CRYPTO_IDS[cryptoSymbolKey(quote.symbol)])
  return isCrypto ? MARKET_ACCENT_BY_TYPE.crypto : MARKET_ACCENT_BY_TYPE.stock
}

export function marketLogoUrl(quote: {
  symbol: string
  type: MarketAssetType
  imageUrl?: string | null
}): string | null {
  if (quote.imageUrl) return quote.imageUrl
  if (quote.type === "stock") {
    return `https://assets.parqet.com/logos/symbol/${encodeURIComponent(quote.symbol)}?format=png&size=64`
  }
  const key = cryptoSymbolKey(quote.symbol).toLowerCase()
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${key}.png`
}
