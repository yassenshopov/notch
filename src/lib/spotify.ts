export type SpotifyTrack = {
  id: string
  name: string
  artists: string
  album: string
  artUrl: string | null
  uri: string
}

export type SpotifyStatus = {
  connected: boolean
  configured?: boolean
  isPlaying: boolean
  progressMs?: number
  durationMs?: number
  track: SpotifyTrack | null
  error?: string
}

export type SpotifyAction = "play" | "pause" | "next" | "previous"

export type SpotifyRecentItem = {
  track: SpotifyTrack
  playedAt: string | null
}

export async function fetchSpotifyStatus(): Promise<SpotifyStatus> {
  if (!window.notch?.spotify) {
    return { connected: false, configured: false, isPlaying: false, track: null }
  }
  return window.notch.spotify.status()
}

export async function connectSpotify(): Promise<SpotifyStatus> {
  if (!window.notch?.spotify) {
    throw new Error("Spotify bridge unavailable")
  }
  return window.notch.spotify.connect()
}

export async function spotifyAction(action: SpotifyAction): Promise<SpotifyStatus> {
  if (!window.notch?.spotify) {
    throw new Error("Spotify bridge unavailable")
  }
  return window.notch.spotify.action(action)
}

export async function fetchSpotifyRecentlyPlayed(limit = 6): Promise<SpotifyRecentItem[]> {
  if (!window.notch?.spotify?.recentlyPlayed) return []
  return window.notch.spotify.recentlyPlayed(limit)
}

export async function playSpotifyUri(uri: string): Promise<SpotifyStatus> {
  if (!window.notch?.spotify?.playUri) {
    throw new Error("Spotify bridge unavailable")
  }
  return window.notch.spotify.playUri(uri)
}

export function formatMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
