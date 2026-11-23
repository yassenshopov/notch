import type { AppSettings } from "../config/settings"
import type { NotchPanel } from "./panel-routing"

export type NotchUiMode = "desktop" | "expanded" | "collapsed"

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

  const calendarPoll =
    pollPanel("calendar", activePanel, mode, faces.calendar ?? true) || overviewPoll
  const marketsPoll = pollPanel("markets", activePanel, mode, faces.markets) || overviewPoll
  const githubPoll = pollPanel("github", activePanel, mode, faces.github) || overviewPoll
  const stravaPoll = pollPanel("strava", activePanel, mode, faces.strava ?? true) || overviewPoll
  const wifiSensePoll =
    (settings.wifiSense?.enabled ?? true) && pollPanel("wifi-sense", activePanel, mode, false)
  const mintPoll =
    pollPanel("mint", activePanel, mode, faces.mint ?? true) ||
    overviewPoll ||
    (wifiSensePoll && !settings.wifiSense?.agentUrl?.trim())
  const piPoll = pollPanel("pi", activePanel, mode, faces.pi ?? true) || overviewPoll
  const cursorPoll = pollPanel("cursor", activePanel, mode, false) || overviewPoll

  return {
    overviewPoll,
    calendarPoll,
    marketsPoll,
    githubPoll,
    stravaPoll,
    wifiSensePoll,
    mintPoll,
    piPoll,
    cursorPoll,
  }
}