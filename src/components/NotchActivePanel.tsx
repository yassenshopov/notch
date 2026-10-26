import type { AppSettings } from "../config/settings"
import type { WeatherSnapshot } from "../lib/weather"
import type { NotchPanel } from "../lib/panel-routing"
import type { SpotifyStatus } from "../lib/spotify"
import type { CursorStatus } from "../lib/cursor"
import type { MarketsSnapshot } from "../lib/markets"
import type { GitHubStatus } from "../lib/github"
import type { StravaStatus } from "../lib/strava"
import type { MintServerStatus } from "../lib/mint"
import type { MediaSessionAction } from "../lib/media-session"
import type { SpotifyAction } from "../lib/spotify"
import type { PiServerStatus } from "../lib/pi"
import type { CalendarSnapshot } from "../lib/calendar"
import type { MediaSessionStatus } from "../lib/media-session"
import type { AlbumPalette } from "../lib/album-color"
import { SettingsPanel } from "./SettingsPanel"
import { CursorPanel } from "./CursorPanel"
import { ClockPanel } from "./ClockPanel"
import { MarketsPanel } from "./MarketsPanel"
import { GitHubPanel } from "./GitHubPanel"
import { StravaPanel } from "./StravaPanel"
import { MintPanel } from "./MintPanel"
import { PiPanel } from "./PiPanel"
import { AirQualityPanel } from "./AirQualityPanel"
import { CalendarPanel } from "./CalendarPanel"
import { BrowserMediaPanel } from "./BrowserMediaPanel"
import { ControlsPanel } from "./ControlsPanel"
import { SpotifyPanel } from "./SpotifyPanel"
import { WeatherPanel } from "./WeatherPanel"

type Props = {
  activePanel: NotchPanel
  expanded: boolean
  settings: AppSettings
  data: WeatherSnapshot | null
  error: string | null
  status: SpotifyStatus
  connecting: boolean
  connect: () => Promise<unknown>
  disconnect: () => void
  stravaStatus: StravaStatus
  stravaConnecting: boolean
  connectStrava: () => Promise<unknown>
  disconnectStrava: () => void
  cursorStatus: CursorStatus
  cursorAnalyticsLoading: boolean
  cursorRefreshing: boolean
  refreshCursor: () => void
  marketsSnapshot: MarketsSnapshot
  marketsLoading: boolean
  marketsRefreshing: boolean
  refreshMarkets: () => void
  githubStatus: GitHubStatus
  githubLoading: boolean
  githubRefreshing: boolean
  refreshGithub: () => void
  stravaLoading: boolean
  stravaRefreshing: boolean
  refreshStrava: () => void
  mintStatus: MintServerStatus
  mintLoading: boolean
  mintRefreshing: boolean
  refreshMint: () => void
  piStatus: PiServerStatus
  piLoading: boolean
  piRefreshing: boolean
  refreshPi: () => void
  calendarSnapshot: CalendarSnapshot
  calendarRefreshing: boolean
  refreshCalendar: (force?: boolean) => void
  mediaStatus: MediaSessionStatus
  mediaAction: (action: MediaSessionAction) => void
  albumPalette: AlbumPalette | null
  spotifyPanelThemed: boolean
  action: (a: SpotifyAction) => Promise<unknown>
}

export function NotchActivePanel(props: Props) {
  const {
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
    mintLoading,
    mintRefreshing,
    refreshMint,
    piStatus,
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
  } = props

  if (activePanel === "settings") {
    return (
      <SettingsPanel
        spotifyConnected={status.connected}
        spotifyConfigured={Boolean(status.configured)}
        connecting={connecting}
        onConnectSpotify={() => {
          void connect().catch(() => undefined)
        }}
        onDisconnectSpotify={() => void disconnect()}
        stravaConnected={stravaStatus.connected}
        stravaConfigured={stravaStatus.configured}
        stravaConnecting={stravaConnecting}
        onConnectStrava={() => {
          void connectStrava().catch(() => undefined)
        }}
        onDisconnectStrava={() => void disconnectStrava()}
      />
    )
  }
  if (activePanel === "cursor") {
    return (
      <CursorPanel
        status={cursorStatus}
        analyticsLoading={cursorAnalyticsLoading}
        refreshing={cursorRefreshing}
        onRefresh={() => void refreshCursor()}
      />
    )
  }
  if (activePanel === "clock") return <ClockPanel />
  if (activePanel === "markets") {
    return (
      <MarketsPanel
        snapshot={marketsSnapshot}
        loading={marketsLoading}
        refreshing={marketsRefreshing}
        hasWatchlist={settings.markets.watchlist.length > 0}
        onRefresh={() => void refreshMarkets()}
      />
    )
  }
  if (activePanel === "github") {
    return (
      <GitHubPanel
        status={githubStatus}
        loading={githubLoading}
        refreshing={githubRefreshing}
        onRefresh={() => void refreshGithub()}
      />
    )
  }
  if (activePanel === "strava") {
    return (
      <StravaPanel
        status={stravaStatus}
        loading={stravaLoading}
        refreshing={stravaRefreshing}
        connecting={stravaConnecting}
        onRefresh={() => void refreshStrava()}
        onConnect={() => {
          void connectStrava().catch(() => undefined)
        }}
        onDisconnect={() => void disconnectStrava()}
      />
    )
  }
  if (activePanel === "mint") {
    return (
      <MintPanel
        status={mintStatus}
        loading={mintLoading}
        refreshing={mintRefreshing}
        onRefresh={() => void refreshMint()}
      />
    )
  }
  if (activePanel === "pi") {
    return (
      <PiPanel
        status={piStatus}
        loading={piLoading}
        refreshing={piRefreshing}
        onRefresh={() => void refreshPi()}
      />
    )
  }
  if (activePanel === "air" && data) return <AirQualityPanel data={data} />
  if (activePanel === "calendar") {
    return (
      <CalendarPanel
        snapshot={calendarSnapshot}
        refreshing={calendarRefreshing}
        onRefresh={() => void refreshCalendar(true)}
      />
    )
  }
  if (activePanel === "media") {
    return (
      <BrowserMediaPanel status={mediaStatus} onAction={(a) => void mediaAction(a)} />
    )
  }
  if (activePanel === "controls") {
    return <ControlsPanel active={expanded && activePanel === "controls"} />
  }
  if (activePanel === "spotify") {
    return (
      <SpotifyPanel
        status={status}
        connecting={connecting}
        palette={spotifyPanelThemed ? albumPalette : null}
        onAction={(a) => void action(a)}
        onConnect={() => {
          void connect().catch(() => undefined)
        }}
      />
    )
  }
  if (data) return <WeatherPanel data={data} />
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-black/40 dark:text-white/40">
      {error ?? "Loading…"}
    </div>
  )
}
