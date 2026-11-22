import { useMemo, useState } from "react"
import { useSettings } from "../config/settings-store"
import type { NotchPanel } from "../lib/panel-routing"
import { notchIntegrationPolls } from "../lib/notch-poll"
import { useAlbumPalette } from "./useAlbumPalette"
import { useMediaSession } from "./useMediaSession"
import { useNotchIntegrations } from "./useNotchIntegrations"
import { useSpotify } from "./useSpotify"
import { useWeather } from "./useWeather"
import type { ComponentProps } from "react"
import type { NotchActivePanel } from "../components/NotchActivePanel"

type PanelProps = ComponentProps<typeof NotchActivePanel>

export function useNotchActivePanelProps(
  activePanel: NotchPanel,
  mode: "desktop" | "expanded" | "collapsed",
): PanelProps {
  const settings = useSettings()
  const [connecting, setConnecting] = useState(false)
  const [stravaConnecting, setStravaConnecting] = useState(false)
  const [calendarConnecting, setCalendarConnecting] = useState(false)
  const { data, error, loading: weatherLoading } = useWeather()
  const { status, playing, connect, action, playUri, disconnect } = useSpotify()
  const mediaPoll = settings.media.enabled && !playing
  const { status: mediaStatus, action: mediaAction } = useMediaSession(mediaPoll)

  const polls = notchIntegrationPolls(mode, activePanel, settings)
  const {
    calendar: {
      snapshot: calendarSnapshot,
      loading: calendarLoading,
      refreshing: calendarRefreshing,
      refresh: refreshCalendar,
      connect: connectCalendar,
      disconnect: disconnectCalendar,
    },
    markets: {
      snapshot: marketsSnapshot,
      loading: marketsLoading,
      refreshing: marketsRefreshing,
      refresh: refreshMarkets,
    },
    github: {
      status: githubStatus,
      loading: githubLoading,
      refreshing: githubRefreshing,
      refresh: refreshGithub,
    },
    strava: {
      status: stravaStatus,
      loading: stravaLoading,
      refreshing: stravaRefreshing,
      refresh: refreshStrava,
      connect: connectStrava,
      disconnect: disconnectStrava,
    },
    mint: {
      status: mintStatus,
      history: mintHistory,
      loading: mintLoading,
      refreshing: mintRefreshing,
      refresh: refreshMint,
    },
    pi: {
      status: piStatus,
      history: piHistory,
      loading: piLoading,
      refreshing: piRefreshing,
      refresh: refreshPi,
    },
    cursor: {
      status: cursorStatus,
      loading: cursorLoading,
      analyticsLoading: cursorAnalyticsLoading,
      refreshing: cursorRefreshing,
      refresh: refreshCursor,
    },
    wifiSense: {
      agentUrl: wifiSenseAgentUrl,
      state: wifiSenseState,
      refreshStatus: refreshWifiSense,
    },
  } = useNotchIntegrations(polls)

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
      weatherLoading,
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
      cursorLoading,
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
      wifiSenseAgentUrl,
      wifiSenseState,
      wifiSenseToken: settings.wifiSense?.token,
      refreshWifiSense,
      piStatus,
      piHistory,
      piLoading,
      piRefreshing,
      refreshPi,
      calendarSnapshot,
      calendarLoading,
      calendarRefreshing,
      refreshCalendar,
      calendarConnecting,
      connectCalendar: async () => {
        setCalendarConnecting(true)
        try {
          return await connectCalendar()
        } finally {
          setCalendarConnecting(false)
        }
      },
      disconnectCalendar,
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
      weatherLoading,
      status,
      connecting,
      connect,
      disconnect,
      stravaStatus,
      stravaConnecting,
      connectStrava,
      disconnectStrava,
      calendarConnecting,
      connectCalendar,
      disconnectCalendar,
      cursorStatus,
      cursorLoading,
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
      wifiSenseAgentUrl,
      wifiSenseState,
      settings.wifiSense?.token,
      refreshWifiSense,
      piStatus,
      piHistory,
      piLoading,
      piRefreshing,
      refreshPi,
      calendarSnapshot,
      calendarLoading,
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