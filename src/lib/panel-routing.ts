import type { IslandFace } from "../config/settings"
import type { LiveActivity } from "./live-activities"

export type NotchPanel =
  | "weather"
  | "spotify"
  | "media"
  | "cursor"
  | "clock"
  | "markets"
  | "github"
  | "strava"
  | "mint"
  | "pi"
  | "air"
  | "calendar"
  | "controls"
  | "pacman"
  | "settings"

export function panelForCollapsedTap(args: {
  spotifyPlaying: boolean
  browserMediaActive: boolean
  liveActivity: LiveActivity | null
  timerShowing: boolean
  islandFace: IslandFace | null
}): NotchPanel {
  if (args.spotifyPlaying) return "spotify"
  if (args.browserMediaActive) return "media"
  if (args.liveActivity) return args.liveActivity.panel
  if (args.timerShowing) return "clock"

  switch (args.islandFace) {
    case "weather":
      return "weather"
    case "battery":
      return "controls"
    case "clock":
      return "clock"
    case "markets":
      return "markets"
    case "github":
      return "github"
    case "strava":
      return "strava"
    case "mint":
      return "mint"
    case "pi":
      return "pi"
    case "air":
      return "air"
    case "calendar":
      return "calendar"
    default:
      return "weather"
  }
}

export const DESKTOP_NAV_PANELS: NotchPanel[] = [
  "weather",
  "spotify",
  "media",
  "air",
  "calendar",
  "cursor",
  "clock",
  "markets",
  "github",
  "strava",
  "mint",
  "pi",
  "controls",
  "pacman",
  "settings",
]

export function panelLabel(panel: NotchPanel): string {
  switch (panel) {
    case "weather":
      return "Weather"
    case "spotify":
      return "Spotify"
    case "media":
      return "Browser media"
    case "cursor":
      return "Cursor"
    case "clock":
      return "Clock"
    case "markets":
      return "Markets"
    case "github":
      return "GitHub"
    case "strava":
      return "Strava"
    case "mint":
      return "Mint server"
    case "pi":
      return "Pi server"
    case "air":
      return "Air quality"
    case "calendar":
      return "Calendar"
    case "controls":
      return "Controls"
    case "pacman":
      return "Pac-Man"
    case "settings":
      return "Settings"
    default:
      return panel
  }
}

export function islandFaceToPanel(face: IslandFace): NotchPanel {
  switch (face) {
    case "battery":
      return "controls"
    case "air":
      return "air"
    case "calendar":
      return "calendar"
    default:
      return face
  }
}
