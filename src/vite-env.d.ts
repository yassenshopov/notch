/// <reference types="vite/client" />

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

interface NotchBridge {
  setExpanded: (payload: boolean | { expanded: boolean; music?: boolean }) => Promise<void>
  setPassthrough: (pass: boolean) => Promise<void>
  reposition: () => Promise<void>
  onBlur: (cb: () => void) => () => void
  platform: string
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
}

interface Window {
  notch?: NotchBridge
}
