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
  | "air"
  | "calendar"
  | "controls"
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
    case "air":
      return "air"
    case "calendar":
      return "calendar"
    default:
      return "weather"
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
