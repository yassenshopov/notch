import type { NotchPanel } from "./panel-routing"

export type DesktopNavGroup = {
  id: string
  label: string
  panels: NotchPanel[]
}

export const DESKTOP_NAV_GROUPS: DesktopNavGroup[] = [
  {
    id: "today",
    label: "Today",
    panels: ["overview", "weather", "air", "calendar", "clock"],
  },
  {
    id: "media",
    label: "Media",
    panels: ["spotify", "media"],
  },
  {
    id: "work",
    label: "Work",
    panels: ["cursor", "github", "markets"],
  },
  {
    id: "life",
    label: "Life",
    panels: ["strava", "pacman"],
  },
  {
    id: "servers",
    label: "Servers",
    panels: ["mint", "wifi-sense", "pi"],
  },
  {
    id: "system",
    label: "System",
    panels: ["controls", "settings"],
  },
]

const SIDEBAR_KEY = "notch.desktop.sidebarCollapsed"

export function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1"
  } catch {
    return false
  }
}

export function writeSidebarCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0")
  } catch {
    /* ignore */
  }
}
