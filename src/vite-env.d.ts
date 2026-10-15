/// <reference types="vite/client" />

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

interface NotchBridge {
  setExpanded: (
    payload:
      | boolean
      | { expanded: boolean; music?: boolean; width?: number; height?: number },
  ) => Promise<void>
  setPassthrough: (pass: boolean) => Promise<void>
  reposition: () => Promise<void>
  onBlur: (cb: () => void) => () => void
  platform: string
  cursor: {
    status: () => Promise<CursorBridgeStatus>
    openDashboard: () => Promise<void>
    openUrl: (url: string) => Promise<void>
  }
  spotify: {
    status: () => Promise<SpotifyBridgeStatus>
    connect: () => Promise<SpotifyBridgeStatus>
    disconnect: () => Promise<SpotifyBridgeStatus>
    action: (action: "play" | "pause" | "next" | "previous") => Promise<SpotifyBridgeStatus>
  }
  settings: {
    get: () => Promise<Record<string, unknown>>
    set: (partial: Record<string, unknown>) => Promise<Record<string, unknown>>
    reset: () => Promise<Record<string, unknown>>
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
}

interface Window {
  notch?: NotchBridge
}
