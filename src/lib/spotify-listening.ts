import { contributionLevel, type GitHubContributionDay } from "./github"

export type SpotifyListeningDay = GitHubContributionDay & {
  msPlayed?: number
  plays?: number
  artUrl?: string | null
  trackName?: string | null
  trackArtist?: string | null
  trackUri?: string | null
}

export type SpotifyListeningWeek = SpotifyListeningDay[]

export function formatListeningHeatmapCount(count: number) {
  if (count <= 0) return "No listening"
  if (count === 1) return "1 minute listened"
  return `${count.toLocaleString()} minutes listened`
}

export function isSpotifyListeningDay(day: GitHubContributionDay): day is SpotifyListeningDay {
  return Boolean(day.date)
}

const SPOTIFY_LISTENING_BAR = {
  light: ["rgba(17,17,17,0.07)", "#d4f5e2", "#8fe0b0", "#3ccf7e", "#1db954"],
  dark: ["rgba(255,255,255,0.08)", "#0a3d22", "#0f6b3a", "#169c46", "#1ed760"],
} as const

export function spotifyListeningBarColor(ms: number, maxMs: number, dark: boolean): string {
  const ramp = dark ? SPOTIFY_LISTENING_BAR.dark : SPOTIFY_LISTENING_BAR.light
  if (ms <= 0) return ramp[0]
  const level = contributionLevel(ms, maxMs)
  return ramp[level]
}