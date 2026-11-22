import type { AppSettings } from "../config/settings"
import type { NotchPanel } from "./panel-routing"

export type NotchUiMode = "desktop" | "expanded" | "collapsed"

/** When the island or a panel should poll its backing service. */
export function pollPanel(
  panel: NotchPanel,
  active: NotchPanel,
  mode: NotchUiMode,
  islandOn: boolean,
): boolean {
  if (mode === "desktop") return active === panel
  if (mode === "expanded") return active === panel
  return islandOn
}

export function notchIntegrationPolls(
  mode: NotchUiMode,
  activePanel: NotchPanel,
  settings: AppSettings,
) {
  const overviewPoll = mode === "desktop" && activePanel === "overview"
  const faces = settings.island.faces
  const wifiSensePoll =
    (settings.wifiSense?.enabled ?? true) && pollPanel("wifi-sense", activePanel, mode, false)

  return {
    overviewPoll,
    calendarPoll: pollPanel("calendar", activePanel, mode, faces.calendar ?? true) || overviewPoll,
    marketsPoll: pollPanel("markets", activePanel, mode, faces.markets) || overviewPoll,
    githubPoll: pollPanel("github", activePanel, mode, faces.github) || overviewPoll,
    stravaPoll: pollPanel("strava", activePanel, mode, faces.strava ?? true) || overviewPoll,
    wifiSensePoll,
    mintPoll:
      pollPanel("mint", activePanel, mode, faces.mint ?? true) ||
      overviewPoll ||
      (wifiSensePoll && !settings.wifiSense?.agentUrl?.trim()),
    piPoll: pollPanel("pi", activePanel, mode, faces.pi ?? true) || overviewPoll,
    cursorPoll: pollPanel("cursor", activePanel, mode, false) || overviewPoll,
  }
}