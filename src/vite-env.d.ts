/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CARTO_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "country-flag-icons/react/3x2" {
  import type { FC, SVGProps } from "react"
  const flags: Record<string, FC<SVGProps<SVGSVGElement>>>
  export default flags
}

interface BatteryManager extends EventTarget {
  charging: boolean
  chargingTime: number
  dischargingTime: number
  level: number
}

interface Navigator {
  getBattery?: () => Promise<BatteryManager>
}

type SpotifyBridgeStatus = {
  connected: boolean
  configured?: boolean
  isPlaying: boolean
  progressMs?: number
  durationMs?: number
  track: {
    id: string
    name: string
    artists: string
    album: string
    artUrl: string | null
    uri: string
  } | null
  error?: string
}

type ControlsPlaybackDevice = {
  id: string
  name: string
  friendlyId?: string
  isDefault: boolean
}

type ControlsBluetoothDevice = {
  id: string
  name: string
  connected: boolean
  status?: string
}

type CursorBridgeStatus = import("./lib/cursor").CursorStatus

type MarketQuote = import("./lib/markets").MarketQuote
type MarketsSnapshot = import("./lib/markets").MarketsSnapshot
type GitHubBridgeStatus = import("./lib/github").GitHubStatus
type MintBridgeStatus = import("./lib/mint").MintServerStatus
type PiBridgeStatus = import("./lib/pi").PiServerStatus
type StravaBridgeStatus = import("./lib/strava").StravaStatus
type MediaSessionStatus = import("./lib/media-session").MediaSessionStatus
type CalendarSnapshot = import("./lib/calendar").CalendarSnapshot

type ControlsBridgeStatus = {
  platform: string
  supported: boolean
  volume: number
  muted: boolean
  micMuted: boolean
  brightness: number | null
  brightnessSupported: boolean
  playback: ControlsPlaybackDevice[]
  bluetooth: ControlsBluetoothDevice[]
  error?: string
}

type NotchPlacementBridge = import("./config/settings").NotchPlacement

interface NotchBridge {
  desktop?: {
    open: (panel: import("./lib/panel-routing").NotchPanel) => Promise<{ ok: boolean }>
    onNavigate?: (cb: (panel: string) => void) => () => void
  }
  setExpanded: (
    payload:
      | boolean
      | {
          expanded: boolean
          music?: boolean
          width?: number
          height?: number
          expandedWidth?: number
          expandedHeight?: number
        },
  ) => Promise<{ anchorLeft: number; anchorTop: number }>
  setPassthrough: (pass: boolean) => Promise<void>
  reposition: () => Promise<void>
  getPlacement: () => Promise<NotchPlacementBridge>
  dragStart: (payload: {
    screenX: number
    screenY: number
    width: number
    height: number
  }) => Promise<void>
  dragMove: (payload: { screenX: number; screenY: number }) => void
  dragEnd: () => Promise<NotchPlacementBridge>
  dragCancel: () => Promise<NotchPlacementBridge>
  onPlacement: (cb: (placement: NotchPlacementBridge) => void) => () => void
  onBlur: (cb: () => void) => () => void
  onEscape: (cb: () => void) => () => void
  onTestExpand?: (cb: () => void) => () => void
  platform: string
  mapTiles: {
    cartoApiKey: string
    fetchCartoApiKey: () => Promise<string>
  }
  cursor: {
    status: (options?: { force?: boolean }) => Promise<CursorBridgeStatus>
    analytics: (options?: { force?: boolean }) => Promise<import("./lib/cursor").CursorAnalyticsPayload | null>
    openDashboard: () => Promise<void>
    openUrl: (url: string) => Promise<void>
  }
  spotify: {
    status: () => Promise<SpotifyBridgeStatus>
    connect: () => Promise<SpotifyBridgeStatus>
    disconnect: () => Promise<SpotifyBridgeStatus>
    action: (
      action: "play" | "pause" | "next" | "previous",
      options?: { targetPi?: boolean },
    ) => Promise<SpotifyBridgeStatus>
    recentlyPlayed: (limit?: number) => Promise<
      Array<{
        track: SpotifyBridgeStatus["track"] & { uri: string }
        playedAt: string | null
      }>
    >
    playUri: (uri: string, options?: { targetPi?: boolean }) => Promise<SpotifyBridgeStatus>
    lyrics: (query: {
      trackName: string
      artistName: string
      albumName?: string
      durationMs?: number
    }) => Promise<{
      found: boolean
      instrumental?: boolean
      plainLyrics?: string | null
      syncedLyrics?: string | null
      error?: string
    }>
  }
  settings: {
    get: () => Promise<Record<string, unknown>>
    set: (partial: Record<string, unknown>) => Promise<Record<string, unknown>>
    reset: () => Promise<Record<string, unknown>>
  }
  markets: {
    snapshot: (watchlist?: import("./config/settings").MarketWatchItem[]) => Promise<MarketsSnapshot>
    chart: (
      quote: Pick<MarketQuote, "id" | "symbol" | "type">,
      range: import("./lib/markets").MarketChartRange,
    ) => Promise<import("./lib/markets").MarketChartSeries>
  }
  github: {
    status: (options?: {
      force?: boolean
      includeInsights?: boolean
      year?: number
    }) => Promise<GitHubBridgeStatus>
    insights: (options?: { force?: boolean; year?: number }) => Promise<
      import("./lib/github").GitHubActivityInsights
    >
    openUrl: (url: string) => Promise<void>
  }
  mint: {
    status: (options?: { force?: boolean; host?: string }) => Promise<MintBridgeStatus>
  }
  wifiSense: {
    post: (options: {
      agentUrl: string
      path: string
      token?: string
      body?: unknown
    }) => Promise<import("./lib/wifi-sense").WifiSensePostResult>
  }
  pi: {
    status: (options?: { force?: boolean; host?: string }) => Promise<PiBridgeStatus>
    displayMode?: (options?: { host?: string }) => Promise<import("./lib/pi-display").PiDisplayModeResult>
    displaySetMode?: (
      mode: number,
      options?: { host?: string },
    ) => Promise<import("./lib/pi-display").PiDisplayModeResult>
    displayNowPlaying?: (
      options?: { host?: string },
    ) => Promise<import("./lib/pi-display").PiDisplayNowPlaying>
  }
  piDisplay: {
    mode: (options?: { host?: string }) => Promise<import("./lib/pi-display").PiDisplayModeResult>
    setMode: (
      mode: number,
      options?: { host?: string },
    ) => Promise<import("./lib/pi-display").PiDisplayModeResult>
    nowPlaying: (options?: { host?: string }) => Promise<import("./lib/pi-display").PiDisplayNowPlaying>
  }
  strava: {
    status: (options?: { force?: boolean }) => Promise<StravaBridgeStatus>
    activity: (activityId: number) => Promise<import("./lib/strava").StravaActivitySummary>
    activityStreams: (
      activityId: number,
    ) => Promise<import("./lib/strava").StravaActivityStreams | null>
    connect: () => Promise<StravaBridgeStatus>
    disconnect: () => Promise<StravaBridgeStatus>
    openUrl: (url: string) => Promise<void>
  }
  media: {
    status: () => Promise<MediaSessionStatus>
    action: (
      action: import("./lib/media-session").MediaSessionAction,
    ) => Promise<MediaSessionStatus>
  }
  calendar: {
    snapshot: (options?: { force?: boolean }) => Promise<CalendarSnapshot>
    openUrl: (url: string) => Promise<void>
  }
  controls: {
    status: () => Promise<ControlsBridgeStatus>
    setVolume: (level: number) => Promise<{ volume: number }>
    setMuted: (muted: boolean) => Promise<{ muted: boolean }>
    setMicMuted: (muted: boolean) => Promise<{ micMuted: boolean }>
    setBrightness: (level: number) => Promise<{ supported: boolean; level: number }>
    setPlayback: (id: string) => Promise<{ id: string }>
    setBluetooth: (
      id: string,
      connected: boolean,
    ) => Promise<{ id: string; connected: boolean }>
  }
  wallpaper: {
    pickOutputFolder: () => Promise<
      { ok: true; path: string } | { ok: false; canceled?: boolean }
    >
    regenerate: (options?: {
      year?: number
      apply?: boolean
      outputPath?: string
      style?: Record<string, unknown>
    }) => Promise<
      | {
          ok: true
          path: string
          year: number
          passed: number
          total: number
          weeks: number
          applied: boolean
          applyError?: string
          mintSync?: {
            synced: boolean
            host?: string
            remotePath?: string
            error?: string
            skipped?: boolean
            reason?: string
            hostsTried?: string[]
          }
        }
      | { ok: false; error: string }
    >
  }
}

interface Window {
  notch?: NotchBridge
}
