import type { GitHubContributionDay } from "./github"

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