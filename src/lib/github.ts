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

export type GitHubTodayRepoContribution = {
  repo: string
  url: string
  count: number
}

/**
 * GitHub’s per-repo API counts raw commits (and other activity types), while the
 * contribution calendar collapses multiple commits per day into one contribution.
 * Scale listed repo totals down so they sum to the calendar total shown in the UI.
 */
export function scaleRepoCountsToTarget(
  repos: GitHubTodayRepoContribution[],
  targetSum: number,
): GitHubTodayRepoContribution[] {
  if (repos.length === 0 || targetSum <= 0) {
    return repos.map((row) => ({ ...row, count: 0 }))
  }
  const listed = repos.reduce((sum, row) => sum + row.count, 0)
  if (listed <= targetSum) return repos

  let assigned = 0
  return repos.map((row, index) => {
    if (index === repos.length - 1) {
      return { ...row, count: Math.max(0, targetSum - assigned) }
    }
    const count = Math.round((row.count * targetSum) / listed)
    assigned += count
    return { ...row, count }
  })
}

export type GitHubTodayBreakdown = {
  date: string
  repos: GitHubTodayRepoContribution[]
  error?: string
}

export function localContributionDateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function contributionCountForDate(
  weeks: GitHubContributionWeek[],
  dateKey: string,
) {
  for (const week of weeks) {
    for (const day of week) {
      if (day?.date === dateKey) return day.count ?? 0
    }
  }
  return 0
}

export function todayContributionCount(weeks: GitHubContributionWeek[]) {
  return contributionCountForDate(weeks, localContributionDateKey())
}

export function maxContributionCount(weeks: GitHubContributionWeek[]) {
  let max = 0
  for (const week of weeks) {
    for (const day of week) {
      if (day?.count > max) max = day.count
    }
  }
  return max
}

/** Quartile buckets matching github.com’s contribution graph (relative to calendar max). */
export function contributionLevel(
  count: number,
  maxCount: number,
): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (maxCount <= 0) return 0
  if (maxCount <= 1) return 4
  if (count >= maxCount) return 4
  const ratio = count / maxCount
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

export function contributionLevelClass(count: number, maxCount: number) {
  switch (contributionLevel(count, maxCount)) {
    case 0:
      return "bg-black/[0.07] dark:bg-white/10"
    case 1:
      return "bg-black/25 dark:bg-white/28"
    case 2:
      return "bg-black/40 dark:bg-white/44"
    case 3:
      return "bg-black/58 dark:bg-white/62"
    case 4:
      return "bg-black/78 dark:bg-white/82"
  }
}

export function formatContributionCount(count: number) {
  if (count === 0) return "No contributions"
  if (count === 1) return "1 contribution"
  return `${count} contributions`
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
  todayBreakdown: GitHubTodayBreakdown | null
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
      todayBreakdown: null,
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
