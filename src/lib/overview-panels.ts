import type { AppSettings } from "../config/settings"

export const OVERVIEW_CARD_IDS = [
  "weather",
  "calendar",
  "spotify",
  "github",
  "cursor",
  "strava",
  "homelab",
  "markets",
  "air",
] as const

export type OverviewCardId = (typeof OVERVIEW_CARD_IDS)[number]

export type OverviewCardsConfig = Record<OverviewCardId, boolean>

export const defaultOverviewCards = (): OverviewCardsConfig =>
  Object.fromEntries(OVERVIEW_CARD_IDS.map((id) => [id, true])) as OverviewCardsConfig

export const OVERVIEW_CARD_LABELS: Record<OverviewCardId, string> = {
  weather: "Weather",
  calendar: "Calendar",
  spotify: "Now playing",
  github: "GitHub",
  cursor: "Cursor",
  strava: "Strava",
  homelab: "Homelab",
  markets: "Markets",
  air: "Air quality",
}

export const OVERVIEW_CARD_HINTS: Record<OverviewCardId, string> = {
  weather: "Current conditions and today’s forecast",
  calendar: "What’s next on your schedule",
  spotify: "Playback from Spotify",
  github: "Contributions, PRs, and inbox",
  cursor: "Included usage this billing cycle",
  strava: "Training volume and streak",
  homelab: "Mint and Pi health at a glance",
  markets: "Watchlist movers",
  air: "AQI, UV, and pollen",
}

export function resolveOverviewCards(settings: AppSettings): OverviewCardsConfig {
  return { ...defaultOverviewCards(), ...settings.overview?.cards }
}

export function enabledOverviewCards(cards: OverviewCardsConfig): OverviewCardId[] {
  return OVERVIEW_CARD_IDS.filter((id) => cards[id])
}

export function countEnabledOverviewCards(cards: OverviewCardsConfig): number {
  return enabledOverviewCards(cards).length
}