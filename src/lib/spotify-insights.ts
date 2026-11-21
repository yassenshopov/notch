import type { SpotifyListeningWeek } from "./spotify-listening"

export type SpotifyLibraryStatus = {
  configured: boolean
  ready: boolean
  totalStreams: number
  firstPlayed?: string | null
  lastPlayed?: string | null
  lastImport?: {
    id: number
    sourcePath: string
    finishedAt: string | null
    rowsInserted: number
    rowsRead: number
    filesProcessed: number
  } | null
  error?: string
}

export type SpotifyTopArtist = {
  name: string
  plays: number
  ms: number
  artUrl?: string | null
}

export type SpotifyTopTrack = {
  id: string | null
  name: string
  artist: string | null
  uri: string | null
  plays: number
  ms: number
  artUrl?: string | null
}

export type SpotifyMonthlyListening = {
  month: string
  plays: number
  ms: number
}

export type SpotifyProfile = {
  displayName: string | null
  imageUrl: string | null
  id: string | null
  product: string | null
}

export type SpotifyActivityInsights = SpotifyLibraryStatus & {
  connected: boolean
  years: number[]
  chartYear: number
  weeks: SpotifyListeningWeek[]
  days: { date: string; count: number; msPlayed?: number; plays?: number }[]
  totalPlays: number
  totalMs: number
  /** Minutes in chart year (heatmap intensity). */
  totalMinutes: number
  profile?: SpotifyProfile | null
  monthly?: SpotifyMonthlyListening[]
  topArtists: SpotifyTopArtist[]
  topTracks: SpotifyTopTrack[]
  error?: string
}

export async function fetchSpotifyLibraryStatus(): Promise<SpotifyLibraryStatus> {
  if (!window.notch?.spotify?.libraryStatus) {
    return { configured: false, ready: false, totalStreams: 0 }
  }
  return window.notch.spotify.libraryStatus()
}

export async function fetchSpotifyInsights(options?: {
  year?: number
}): Promise<SpotifyActivityInsights> {
  if (!window.notch?.spotify?.insights) {
    return {
      configured: false,
      ready: false,
      connected: false,
      totalStreams: 0,
      years: [],
      chartYear: new Date().getFullYear(),
      weeks: [],
      days: [],
      totalPlays: 0,
      totalMs: 0,
      totalMinutes: 0,
      profile: null,
      monthly: [],
      topArtists: [],
      topTracks: [],
    }
  }
  return window.notch.spotify.insights(options)
}

export function formatListeningMinutes(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes.toLocaleString()} min`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (hours < 48) return rem ? `${hours}h ${rem}m` : `${hours}h`
  return `${Math.round(minutes / 60).toLocaleString()}h`
}