import type { ReactNode } from "react"
import type { AppSettings } from "../config/settings"
import type { WeatherSnapshot } from "../lib/weather"
import type { PanelLayout } from "../lib/panel-layout"
import type { NotchPanel } from "../lib/panel-routing"
import type { SpotifyStatus } from "../lib/spotify"
import type { CursorStatus } from "../lib/cursor"
import type { MarketsSnapshot } from "../lib/markets"
import type { GitHubStatus } from "../lib/github"
import type { StravaStatus } from "../lib/strava"
import type { MintServerStatus } from "../lib/mint"
import type { ServerStatsHistory } from "../lib/server-stats-history"
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
import { PanelLayoutContext } from "../lib/panel-layout"
import { OpenFullScaleButton } from "./OpenFullScaleButton"
import { WeatherPanel } from "./WeatherPanel"
import { PacmanPanel } from "./PacmanPanel"
import { PanelPageTransition } from "./PanelPageTransition"
import { DesktopOverviewPanel } from "./desktop/DesktopOverviewPanel"

type Props = {
  activePanel: NotchPanel
  onNavigatePanel?: (panel: NotchPanel) => void
  expanded: boolean
  layout?: PanelLayout
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
  mintHistory: ServerStatsHistory
  mintLoading: boolean
  mintRefreshing: boolean
  refreshMint: () => void
  piStatus: PiServerStatus
  piHistory: ServerStatsHistory
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
  action: (a: SpotifyAction, options?: { targetPi?: boolean }) => Promise<unknown>
  playUri: (uri: string) => Promise<unknown>
}

export function NotchActivePanel(props: Props) {
  const layout = props.layout ?? "compact"
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
  } = props

  const wrap = (node: ReactNode) => (
    <PanelLayoutContext.Provider value={layout}>
      {layout === "compact" ? (
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-1 flex shrink-0 justify-end">
            <OpenFullScaleButton panel={activePanel} />
          </div>
          <div className="min-h-0 flex-1">{node}</div>
        </div>
      ) : (
        node
      )}
    </PanelLayoutContext.Provider>
  )

  let body: ReactNode
  if (activePanel === "overview" && layout === "desktop") {
    if (!props.onNavigatePanel) {
      body = (
        <div className="text-[13px] text-black/45 dark:text-white/45">Today overview is desktop-only.</div>
      )
    } else {
    body = (
      <DesktopOverviewPanel
        onNavigate={props.onNavigatePanel}
        weather={data}
        weatherError={error}
        spotify={status}
        github={githubStatus}
        cursor={cursorStatus}
        strava={stravaStatus}
        mint={mintStatus}
        pi={piStatus}
        calendar={calendarSnapshot}
      />
    )
    }
  } else if (activePanel === "settings") {
    body = (
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
  } else if (activePanel === "cursor") {
    body = (
      <CursorPanel
        status={cursorStatus}
        analyticsLoading={cursorAnalyticsLoading}
        refreshing={cursorRefreshing}
        onRefresh={() => void refreshCursor()}
      />
    )
  } else if (activePanel === "clock") {
    body = <ClockPanel />
  } else if (activePanel === "pacman") {
    body = <PacmanPanel />
  } else if (activePanel === "markets") {
    body = (
      <MarketsPanel
        snapshot={marketsSnapshot}
        loading={marketsLoading}
        refreshing={marketsRefreshing}
        hasWatchlist={settings.markets.watchlist.length > 0}
        onRefresh={() => void refreshMarkets()}
      />
    )
  } else if (activePanel === "github") {
    body = (
      <GitHubPanel
        status={githubStatus}
        loading={githubLoading}
        refreshing={githubRefreshing}
        onRefresh={() => void refreshGithub()}
      />
    )
  } else if (activePanel === "strava") {
    body = (
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
  } else if (activePanel === "mint") {
    body = (
      <MintPanel
        status={mintStatus}
        history={mintHistory}
        loading={mintLoading}
        refreshing={mintRefreshing}
        onRefresh={() => void refreshMint()}
      />
    )
  } else if (activePanel === "pi") {
    body = (
      <PiPanel
        status={piStatus}
        history={piHistory}
        loading={piLoading}
        refreshing={piRefreshing}
        onRefresh={() => void refreshPi()}
        spotify={status}
        onTvAction={(a) => void action(a, { targetPi: true })}
      />
    )
  } else if (activePanel === "air" && data) {
    body = <AirQualityPanel data={data} />
  } else if (activePanel === "calendar") {
    body = (
      <CalendarPanel
        snapshot={calendarSnapshot}
        refreshing={calendarRefreshing}
        onRefresh={() => void refreshCalendar(true)}
      />
    )
  } else if (activePanel === "media") {
    body = <BrowserMediaPanel status={mediaStatus} onAction={(a) => void mediaAction(a)} />
  } else if (activePanel === "controls") {
    body = (
      <ControlsPanel active={(expanded || layout === "desktop") && activePanel === "controls"} />
    )
  } else if (activePanel === "spotify") {
    body = (
      <SpotifyPanel
        status={status}
        connecting={connecting}
        palette={spotifyPanelThemed ? albumPalette : null}
        onAction={(a) => void action(a)}
        onPlayUri={(uri) => void playUri(uri)}
        onConnect={() => {
          void connect().catch(() => undefined)
        }}
      />
    )
  } else if (data) {
    body = <WeatherPanel data={data} />
  } else {
    body = (
      <div className="flex flex-1 items-center justify-center text-sm text-black/40 dark:text-white/40">
        {error ?? "Loading…"}
      </div>
    )
  }

  return (
    <PanelPageTransition
      panelKey={activePanel}
      className={layout === "compact" ? "flex h-full min-h-0 flex-col" : undefined}
    >
      {wrap(body)}
    </PanelPageTransition>
  )
}
