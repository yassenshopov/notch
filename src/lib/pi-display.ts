export type PiDisplayNowPlaying = {
  connected: boolean
  host: string
  error: string | null
  playing: boolean
  mode: number | null
  track: string | null
  artist: string | null
  album: string | null
  artUrl: string | null
  progressMs: number | null
  durationMs: number | null
}

export type PiDisplayModeResult = {
  connected: boolean
  host: string
  error: string | null
  mode: number | null
  switched?: boolean
}

type PiDisplayBridge = {
  mode: (options?: { host?: string }) => Promise<PiDisplayModeResult>
  setMode: (mode: number, options?: { host?: string }) => Promise<PiDisplayModeResult>
  nowPlaying: (options?: { host?: string }) => Promise<PiDisplayNowPlaying>
}

function piDisplayBridge(): PiDisplayBridge | null {
  const notch = window.notch
  if (!notch) return null

  if (notch.piDisplay) return notch.piDisplay

  const pi = notch.pi
  if (pi?.displayMode && pi.displaySetMode && pi.displayNowPlaying) {
    return {
      mode: pi.displayMode,
      setMode: pi.displaySetMode,
      nowPlaying: pi.displayNowPlaying,
    }
  }

  return null
}

function bridgeUnavailable(host?: string): PiDisplayModeResult {
  return {
    connected: false,
    host: host ?? "pi",
    error: "electron_bridge_stale",
    mode: null,
  }
}

function nowPlayingUnavailable(host?: string): PiDisplayNowPlaying {
  return {
    connected: false,
    host: host ?? "pi",
    error: "electron_bridge_stale",
    playing: false,
    mode: null,
    track: null,
    artist: null,
    album: null,
    artUrl: null,
    progressMs: null,
    durationMs: null,
  }
}

export function piDisplayErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case "electron_bridge_stale":
    case "notch_bridge_unavailable":
      return "Quit Notch completely and start it again (npm run dev or npm start). The TV bridge loads with Electron, not in the browser alone."
    default:
      return code ?? "Could not reach spotify-display on the Pi. Check SSH (pi-ts)."
  }
}

export async function fetchPiDisplayMode(options?: { host?: string }): Promise<PiDisplayModeResult> {
  const bridge = piDisplayBridge()
  if (!bridge) {
    return bridgeUnavailable(options?.host)
  }
  return bridge.mode(options)
}

export async function setPiDisplayMode(
  mode: number,
  options?: { host?: string },
): Promise<PiDisplayModeResult> {
  const bridge = piDisplayBridge()
  if (!bridge) {
    return { ...bridgeUnavailable(options?.host), switched: false }
  }
  return bridge.setMode(mode, options)
}

export async function fetchPiDisplayNowPlaying(
  options?: { host?: string },
): Promise<PiDisplayNowPlaying> {
  const bridge = piDisplayBridge()
  if (!bridge) {
    return nowPlayingUnavailable(options?.host)
  }
  return bridge.nowPlaying(options)
}
