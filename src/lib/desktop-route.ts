import type { NotchPanel } from "./panel-routing"

const PANEL_IDS = new Set<NotchPanel>([
  "overview",
  "weather",
  "spotify",
  "media",
  "cursor",
  "clock",
  "markets",
  "github",
  "strava",
  "mint",
  "wifi-sense",
  "pi",
  "air",
  "calendar",
  "controls",
  "pacman",
  "settings",
])

export function parsePanelId(raw: string | null | undefined): NotchPanel | null {
  if (!raw) return null
  const id = decodeURIComponent(raw).trim() as NotchPanel
  return PANEL_IDS.has(id) ? id : null
}

export function desktopHashForPanel(panel: NotchPanel) {
  return `#/desktop/${encodeURIComponent(panel)}`
}

export function readDesktopRouteFromLocation(): { isDesktop: boolean; panel: NotchPanel } {
  const hash = window.location.hash.replace(/^#/, "")
  const match = hash.match(/^\/desktop\/([^/?]+)/)
  const panel = parsePanelId(match?.[1]) ?? "overview"
  return { isDesktop: Boolean(match), panel }
}
