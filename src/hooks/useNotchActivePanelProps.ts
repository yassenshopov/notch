import { useMemo, useState } from "react"
import { useSettings } from "../config/settings-store"
import type { NotchPanel } from "../lib/panel-routing"
import { useAlbumPalette } from "./useAlbumPalette"
import { useCalendar } from "./useCalendar"
import { useCursor } from "./useCursor"
import { useGithub } from "./useGithub"
import { useMarkets } from "./useMarkets"
import { useMediaSession } from "./useMediaSession"
import { useMint } from "./useMint"
import { usePi } from "./usePi"
import { useSpotify } from "./useSpotify"
import { useStrava } from "./useStrava"
import { useWeather } from "./useWeather"
import type { ComponentProps } from "react"
import type { NotchActivePanel } from "../components/NotchActivePanel"

type PanelProps = ComponentProps<typeof NotchActivePanel>

function pollPanel(
  panel: NotchPanel,
  active: NotchPanel,
  mode: "desktop" | "expanded" | "collapsed",
  islandOn: boolean,
): boolean {
  if (mode === "desktop") return active === panel
  if (mode === "expanded") return active === panel
  return islandOn
}

export function useNotchActivePanelProps(
  activePanel: NotchPanel,
  mode: "desktop" | "expanded" | "collapsed",
): PanelProps {
  const settings = useSettings()
  const [connecting, setConnecting] = useState(false)
  const [stravaConnecting, setStravaConnecting] = useState(false)
  const { data, error } = useWeather()
  const { status, playing, connect, action, playUri, disconnect } = useSpotify()
  const mediaPoll = settings.media.enabled && !playing
  const { status: mediaStatus, action: mediaAction } = useMediaSession(mediaPoll)

  const calendarPoll =
    mode === "desktop"
      ? activePanel === "calendar"
      : Boolean(settings.calendar.icsUrl.trim()) &&
        (mode === "expanded"
          ? activePanel === "calendar"
          : (settings.island.faces.calendar ?? true))

  const {
    snapshot: calendarSnapshot,
    refreshing: calendarRefreshing,
    refresh: refreshCalendar,
  } = useCalendar(calendarPoll)

  const faces = settings.island.faces
  const marketsPoll = pollPanel("markets", activePanel, mode, faces.markets)
  const githubPoll = pollPanel("github", activePanel, mode, faces.github)
  const stravaPoll = pollPanel("strava", activePanel, mode, faces.strava ?? true)
  const mintPoll = pollPanel("mint", activePanel, mode, faces.mint ?? true)
  const piPoll = pollPanel("pi", activePanel, mode, faces.pi ?? true)

  const {
    snapshot: marketsSnapshot,
    loading: marketsLoading,
    refreshing: marketsRefreshing,
    refresh: refreshMarkets,
  } = useMarkets(marketsPoll)
  const {
    status: githubStatus,
    loading: githubLoading,
    refreshing: githubRefreshing,
    refresh: refreshGithub,
  } = useGithub(githubPoll)
  const {
    status: stravaStatus,
    loading: stravaLoading,
    refreshing: stravaRefreshing,
    refresh: refreshStrava,
    connect: connectStrava,
    disconnect: disconnectStrava,
  } = useStrava(stravaPoll)
  const {
    status: mintStatus,
    history: mintHistory,
    loading: mintLoading,
    refreshing: mintRefreshing,
    refresh: refreshMint,
  } = useMint(mintPoll)
  const {
    status: piStatus,
    history: piHistory,
    loading: piLoading,
    refreshing: piRefreshing,
    refresh: refreshPi,
  } = usePi(piPoll)

  const cursorPoll = pollPanel("cursor", activePanel, mode, true)
  const {
    status: cursorStatus,
    analyticsLoading: cursorAnalyticsLoading,
    refreshing: cursorRefreshing,
    refresh: refreshCursor,
  } = useCursor(cursorPoll)

  const spotifyPanelThemed = (mode === "expanded" || mode === "desktop") && activePanel === "spotify"
  const albumPalette = useAlbumPalette(
    playing || spotifyPanelThemed ? status.track?.artUrl : null,
  )

  const expanded = mode !== "collapsed"

  return useMemo(
    () => ({
      activePanel,
      expanded,
      settings,
      data,
      error,
      status,
      connecting,
      connect: async () => {
        setConnecting(true)
        try {
          return await connect()
        } finally {
          setConnecting(false)
        }
      },
      disconnect,
      stravaStatus,
      stravaConnecting,
      connectStrava: async () => {
        setStravaConnecting(true)
        try {
          return await connectStrava()
        } finally {
          setStravaConnecting(false)
        }
      },
      disconnectStrava,
      cursorStatus,
      cursorAnalyticsLoading,
      cursorRefreshing,
      refreshCursor,
      marketsSnapshot,
      marketsLoading,
      marketsRefreshing,
      refreshMarkets,
      githubStatus,
      githubLoading,
      githubRefreshing,
      refreshGithub,
      stravaLoading,
      stravaRefreshing,
      refreshStrava,
      mintStatus,
      mintHistory,
      mintLoading,
      mintRefreshing,
      refreshMint,
      piStatus,
      piHistory,
      piLoading,
      piRefreshing,
      refreshPi,
      calendarSnapshot,
      calendarRefreshing,
      refreshCalendar,
      mediaStatus,
      mediaAction,
      albumPalette,
      spotifyPanelThemed,
      action,
      playUri,
    }),
    [
      activePanel,
      expanded,
      settings,
      data,
      error,
      status,
      connecting,
      connect,
      disconnect,
      stravaStatus,
      stravaConnecting,
      connectStrava,
      disconnectStrava,
      cursorStatus,
      cursorAnalyticsLoading,
      cursorRefreshing,
      refreshCursor,
      marketsSnapshot,
      marketsLoading,
      marketsRefreshing,
      refreshMarkets,
      githubStatus,
      githubLoading,
      githubRefreshing,
      refreshGithub,
      stravaLoading,
      stravaRefreshing,
      refreshStrava,
      mintStatus,
      mintHistory,
      mintLoading,
      mintRefreshing,
      refreshMint,
      piStatus,
      piHistory,
      piLoading,
      piRefreshing,
      refreshPi,
      calendarSnapshot,
      calendarRefreshing,
      refreshCalendar,
      mediaStatus,
      mediaAction,
      albumPalette,
      spotifyPanelThemed,
      action,
      playUri,
    ],
  )
}
