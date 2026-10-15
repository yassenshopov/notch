export type GitHubNotification = {
  id: string
  title: string
  repo: string
  url: string
  updatedAt: string
  unread: boolean
}

export type GitHubPullRequest = {
  number: number
  title: string
  repo: string
  url: string
  updatedAt: string
  draft: boolean
}

export type GitHubContributionDay = {
  date: string
  count: number
}

/** One calendar week column from GitHub — Sun (0) through Sat (6). */
export type GitHubContributionWeek = GitHubContributionDay[]

export type GitHubContributions = {
  total: number
  /** Flat list (legacy); prefer `weeks` for the heatmap grid. */
  days: GitHubContributionDay[]
  weeks: GitHubContributionWeek[]
}

export function normalizeGitHubContributions(
  raw: GitHubContributions | null | undefined,
): GitHubContributions | null {
  if (!raw) return null
  if (raw.weeks?.length) return raw
  const days = raw.days ?? []
  const weeks: GitHubContributionWeek[] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return { total: raw.total ?? 0, days, weeks }
}

export type GitHubStatus = {
  configured: boolean
  connected: boolean
  login: string | null
  avatarUrl: string | null
  notifications: GitHubNotification[]
  pullRequests: GitHubPullRequest[]
  contributions: GitHubContributions | null
  error?: string
  message?: string
}

export async function fetchGitHubStatus(options?: { force?: boolean }): Promise<GitHubStatus> {
  const bridge = window.notch?.github
  if (!bridge) {
    return {
      configured: false,
      connected: false,
      login: null,
      avatarUrl: null,
      notifications: [],
      pullRequests: [],
      contributions: null,
      error: "no_electron",
    }
  }
  const status = await bridge.status(options)
  if (status.contributions) {
    status.contributions = normalizeGitHubContributions(status.contributions) ?? null
  }
  return status
}

export function openGitHubUrl(url: string) {
  void window.notch?.github?.openUrl(url)
}
