import { Suspense, lazy, type ReactNode } from "react"
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
import type { WifiSenseLiveState } from "../lib/wifi-sense"
import { PanelLayoutContext } from "../lib/panel-layout"
import { OpenFullScaleButton } from "./OpenFullScaleButton"
import { PanelPageTransition } from "./PanelPageTransition"
import { PanelLazyFallback } from "./PanelLazyFallback"
import { ClockPanel } from "./ClockPanel"

const SettingsPanel = lazy(() =>
  import("./SettingsPanel").then((m) => ({ default: m.SettingsPanel })),
)
const CursorPanel = lazy(() => import("./CursorPanel").then((m) => ({ default: m.CursorPanel })))
const MarketsPanel = lazy(() => import("./MarketsPanel").then((m) => ({ default: m.MarketsPanel })))
const GitHubPanel = lazy(() => import("./GitHubPanel").then((m) => ({ default: m.GitHubPanel })))
const StravaPanel = lazy(() => import("./StravaPanel").then((m) => ({ default: m.StravaPanel })))
const ApartmentPanel = lazy(() =>
  import("./ApartmentPanel").then((m) => ({ default: m.ApartmentPanel })),
)
const CarPanel = lazy(() => import("./CarPanel").then((m) => ({ default: m.CarPanel })))
const MintPanel = lazy(() => import("./MintPanel").then((m) => ({ default: m.MintPanel })))
const WifiSensePanel = lazy(() =>
  import("./WifiSensePanel").then((m) => ({ default: m.WifiSensePanel })),
)
const PiPanel = lazy(() => import("./PiPanel").then((m) => ({ default: m.PiPanel })))
const AirQualityPanel = lazy(() =>
  import("./AirQualityPanel").then((m) => ({ default: m.AirQualityPanel })),
)
const CalendarPanel = lazy(() =>
  import("./CalendarPanel").then((m) => ({ default: m.CalendarPanel })),
)
const BrowserMediaPanel = lazy(() =>
  import("./BrowserMediaPanel").then((m) => ({ default: m.BrowserMediaPanel })),
)
const ControlsPanel = lazy(() =>
  import("./ControlsPanel").then((m) => ({ default: m.ControlsPanel })),
)
const SpotifyPanel = lazy(() => import("./SpotifyPanel").then((m) => ({ default: m.SpotifyPanel })))
const WeatherPanel = lazy(() => import("./WeatherPanel").then((m) => ({ default: m.WeatherPanel })))
const PacmanPanel = lazy(() => import("./PacmanPanel").then((m) => ({ default: m.PacmanPanel })))
const DesktopOverviewPanel = lazy(() =>
  import("./desktop/DesktopOverviewPanel").then((m) => ({ default: m.DesktopOverviewPanel })),
)

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
  cursorLoading: boolean
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
  wifiSenseAgentUrl: string
  wifiSenseState: WifiSenseLiveState
  wifiSenseToken?: string
  refreshWifiSense: () => void
  piStatus: PiServerStatus
  piHistory: ServerStatsHistory
  piLoading: boolean
  piRefreshing: boolean
  refreshPi: () => void
  calendarSnapshot: CalendarSnapshot
  calendarLoading: boolean
  calendarRefreshing: boolean
  refreshCalendar: (force?: boolean) => void
  calendarConnecting: boolean
  connectCalendar: () => Promise<unknown>
  disconnectCalendar: () => Promise<unknown>
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
    wifiSenseToken,
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
    connectCalendar,
    disconnectCalendar,
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
        calendarConnected={calendarSnapshot.connected}
        calendarConfigured={calendarSnapshot.configured}
        calendarConnecting={calendarConnecting}
        onConnectCalendar={() => {
          void connectCalendar().catch(() => undefined)
        }}
        onDisconnectCalendar={() => void disconnectCalendar()}
      />
    )
  } else if (activePanel === "cursor") {
    body = (
      <CursorPanel
        status={cursorStatus}
        loading={cursorLoading}
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
        expanded={expanded}
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
  } else if (activePanel === "car") {
    body = <CarPanel />
  } else if (activePanel === "home") {
    body = (
      <ApartmentPanel
        mintStatus={mintStatus}
        piStatus={piStatus}
        onNavigatePanel={props.onNavigatePanel}
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
  } else if (activePanel === "wifi-sense") {
    body = (
      <WifiSensePanel
        agentUrl={wifiSenseAgentUrl}
        token={wifiSenseToken?.trim() || undefined}
        state={wifiSenseState}
        onRefreshStatus={() => void refreshWifiSense()}
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
        loading={calendarLoading}
        refreshing={calendarRefreshing}
        onRefresh={() => void refreshCalendar(true)}
        connecting={calendarConnecting}
        onConnect={() => {
          void connectCalendar().catch(() => undefined)
        }}
        onDisconnect={() => void disconnectCalendar()}
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
      className={
        layout === "compact"
          ? "flex h-full min-h-0 flex-col"
          : "min-h-0 w-full shrink-0"
      }
    >
      <Suspense fallback={<PanelLazyFallback />}>{wrap(body)}</Suspense>
    </PanelPageTransition>
  )
}