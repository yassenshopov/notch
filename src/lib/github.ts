export type GitHubNotification = {
  id: string
  title: string
  repo: string
  url: string
  updatedAt: string
  unread: boolean
  reason?: string | null
  subjectType?: string | null
  actionLabel?: string
  subjectTypeLabel?: string
  ownerLogin?: string
  ownerAvatarUrl?: string | null
  ownerType?: "organization" | "user" | "unknown"
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
  /** Heatmap calendar total when this breakdown was fetched — not scaled onto repos. */
  expectedCount?: number
  error?: string
}

export function sumGitHubRepoCounts(repos: GitHubTodayRepoContribution[]) {
  return repos.reduce((sum, row) => sum + (row.count ?? 0), 0)
}

export function dayBreakdownMatchesCalendar(
  breakdown: GitHubTodayBreakdown | null | undefined,
  dateKey: string,
  calendarCount: number,
) {
  if (!breakdown || breakdown.error) return false
  if (breakdown.date !== dateKey) return false
  if (typeof breakdown.expectedCount === "number") {
    return breakdown.expectedCount === calendarCount
  }
  return false
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
    default:
      return "bg-black/[0.07] dark:bg-white/10"
  }
}

const LEGEND_LEVEL_COUNT = 100

/** Solid swatch classes for the contribution legend (fixed intensity bands). */
export function contributionLegendLevelClass(level: 0 | 1 | 2 | 3 | 4) {
  const count =
    level === 0 ? 0 : level === 4 ? LEGEND_LEVEL_COUNT : level * 25
  return contributionLevelClass(count, LEGEND_LEVEL_COUNT)
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

export type GitHubContributionYear = {
  year: number
  total: number
  weeks: GitHubContributionWeek[]
}

export type GitHubRepoTotal = {
  repo: string
  url: string
  count: number
}

export type GitHubRepoOwnerType = "user" | "organization"

export type GitHubRepoProfile = {
  repo: string
  description: string | null
  stars: number
  forks: number
  openIssues: number
  ownerLogin: string
  ownerType: GitHubRepoOwnerType
  ownerAvatarUrl: string | null
  createdAt: string | null
  pushedAt: string | null
  updatedAt: string | null
  language: string | null
  isFork: boolean
  isArchived: boolean
  isPrivate: boolean
}

export type GitHubRepoCatalogItem = GitHubRepoTotal & {
  profile: GitHubRepoProfile | null
}

export type GitHubRepoMonthPoint = {
  month: string
  count: number
}

export type GitHubRepoSeries = {
  repo: string
  url: string
  total: number
  months: GitHubRepoMonthPoint[]
}

export type GitHubReposCreatedStats = {
  year: number
  count: number | null
  priorYear: number
  priorCount: number | null
  delta: number | null
}

export type GitHubRepoWeekBucket = {
  weekStart: string
  total: number
  repos: GitHubTodayRepoContribution[]
}

export type GitHubRepoWeeklyStack = {
  configured: boolean
  connected: boolean
  topRepos: string[]
  repoUrls: Record<string, string>
  weeks: GitHubRepoWeekBucket[]
  days?: GitHubRepoWeekBucket[]
  error?: string
  message?: string
}

export type GitHubActivityInsights = {
  configured: boolean
  connected: boolean
  years: GitHubContributionYear[]
  chartYear: number
  repoTotals: GitHubRepoTotal[]
  repoCatalog: GitHubRepoCatalogItem[]
  repoSeries: GitHubRepoSeries[]
  monthLabels: string[]
  reposCreated?: GitHubReposCreatedStats
  error?: string
  message?: string
}

export type GitHubProfile = {
  name: string | null
  bio: string | null
  company: string | null
  location: string | null
  blog: string | null
  followers: number
  following: number
  publicRepos: number
  url: string
  twitterUsername: string | null
}

export type GitHubStatus = {
  configured: boolean
  connected: boolean
  login: string | null
  avatarUrl: string | null
  profile: GitHubProfile | null
  notifications: GitHubNotification[]
  pullRequests: GitHubPullRequest[]
  contributions: GitHubContributions | null
  todayBreakdown: GitHubTodayBreakdown | null
  insights?: GitHubActivityInsights
  error?: string
  message?: string
}

export async function fetchGitHubStatus(options?: {
  force?: boolean
  includeInsights?: boolean
  year?: number
}): Promise<GitHubStatus> {
  const bridge = window.notch?.github
  if (!bridge) {
    return {
      configured: false,
      connected: false,
      login: null,
      avatarUrl: null,
      profile: null,
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

export async function fetchGitHubDayBreakdown(
  date: string,
  count?: number,
  options?: { force?: boolean },
): Promise<GitHubTodayBreakdown> {
  const bridge = window.notch?.github
  if (!bridge?.dayBreakdown) {
    return { date, repos: [], error: "no_electron" }
  }
  return bridge.dayBreakdown({ date, count, force: options?.force })
}

const defaultReposCreated = (): GitHubReposCreatedStats => {
  const year = new Date().getFullYear()
  return { year, count: null, priorYear: year - 1, priorCount: null, delta: null }
}

const idleInsights: GitHubActivityInsights = {
  configured: false,
  connected: false,
  years: [],
  chartYear: new Date().getFullYear(),
  repoTotals: [],
  repoCatalog: [],
  repoSeries: [],
  monthLabels: [],
  reposCreated: defaultReposCreated(),
}

function normalizeInsightsPayload(
  data: Partial<GitHubActivityInsights> | undefined,
): GitHubActivityInsights {
  if (!data) return { ...idleInsights, error: "insights_unavailable" }
  const years = (data.years ?? []).map((row) => ({
    ...row,
    weeks: row.weeks ?? [],
  }))
  return {
    configured: data.configured ?? true,
    connected: data.connected ?? true,
    years,
    chartYear: data.chartYear ?? new Date().getFullYear(),
    repoTotals: data.repoTotals ?? [],
    repoCatalog:
      data.repoCatalog?.length
        ? data.repoCatalog
        : (data.repoTotals ?? []).map((row) => ({ ...row, profile: null })),
    repoSeries: data.repoSeries ?? [],
    monthLabels: data.monthLabels ?? [],
    reposCreated: data.reposCreated ?? defaultReposCreated(),
    error: data.error,
    message: data.message,
  }
}

const idleWeeklyStack: GitHubRepoWeeklyStack = {
  configured: false,
  connected: false,
  topRepos: [],
  repoUrls: {},
  weeks: [],
  days: [],
}

export type GitHubNotificationsInbox = {
  configured: boolean
  connected: boolean
  items: GitHubNotification[]
  hasMore: boolean
  perPage?: number
  fromCache?: boolean
  cachedAt?: number | null
  error?: string
  message?: string
}

export async function fetchGitHubNotificationsInbox(options?: {
  force?: boolean
  before?: string
}): Promise<GitHubNotificationsInbox> {
  const bridge = window.notch?.github
  if (!bridge?.notificationsInbox) {
    return {
      configured: false,
      connected: false,
      items: [],
      hasMore: false,
      error: "no_electron",
    }
  }
  try {
    const data = await bridge.notificationsInbox(options)
    return {
      configured: data.configured ?? true,
      connected: data.connected ?? true,
      items: data.items ?? [],
      hasMore: Boolean(data.hasMore),
      perPage: data.perPage,
      fromCache: data.fromCache,
      cachedAt: data.cachedAt ?? null,
      error: data.error,
      message: data.message,
    }
  } catch {
    return {
      configured: true,
      connected: false,
      items: [],
      hasMore: false,
      error: "github_notifications_error",
    }
  }
}

export async function markGitHubNotificationRead(
  threadId: string,
): Promise<{ ok: boolean; items?: GitHubNotification[]; error?: string }> {
  const bridge = window.notch?.github
  if (!bridge?.markNotificationRead) return { ok: false, error: "no_electron" }
  return bridge.markNotificationRead(threadId)
}

export async function markAllGitHubNotificationsRead(): Promise<{
  ok: boolean
  items?: GitHubNotification[]
  error?: string
}> {
  const bridge = window.notch?.github
  if (!bridge?.markAllNotificationsRead) return { ok: false, error: "no_electron" }
  return bridge.markAllNotificationsRead()
}

export async function fetchGitHubWeeklyRepoStack(options?: {
  force?: boolean
}): Promise<GitHubRepoWeeklyStack> {
  const bridge = window.notch?.github
  if (!bridge?.weeklyRepoStack) {
    return { ...idleWeeklyStack, error: "no_electron" }
  }
  try {
    const data = await bridge.weeklyRepoStack(options)
    return {
      configured: data.configured ?? true,
      connected: data.connected ?? true,
      topRepos: data.topRepos ?? [],
      repoUrls: data.repoUrls ?? {},
      weeks: data.weeks ?? [],
      days: data.days ?? [],
      error: data.error,
      message: data.message,
    }
  } catch {
    return { ...idleWeeklyStack, error: "github_weekly_stack_error" }
  }
}

export async function fetchGitHubInsights(options?: {
  force?: boolean
  year?: number
}): Promise<GitHubActivityInsights> {
  const bridge = window.notch?.github
  if (!bridge) {
    return { ...idleInsights, error: "no_electron" }
  }

  if (bridge.insights) {
    const data = await bridge.insights(options)
    return normalizeInsightsPayload(data)
  }

  const status = await bridge.status({
    force: options?.force,
    includeInsights: true,
    year: options?.year,
  })
  return normalizeInsightsPayload(status.insights)
}

export function formatGitHubRepoAge(iso: string | null | undefined) {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms)) return null
  const diffSec = Math.round((ms - Date.now()) / 1000)
  const absSec = Math.abs(diffSec)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
  if (absSec < 60) return rtf.format(Math.round(diffSec), "second")
  const diffMin = Math.round(diffSec / 60)
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute")
  const diffHr = Math.round(diffSec / 3600)
  if (Math.abs(diffHr) < 48) return rtf.format(diffHr, "hour")
  const diffDay = Math.round(diffSec / 86400)
  if (Math.abs(diffDay) < 60) return rtf.format(diffDay, "day")
  const diffMon = Math.round(diffSec / (86400 * 30.44))
  if (Math.abs(diffMon) < 24) return rtf.format(diffMon, "month")
  return rtf.format(Math.round(diffSec / (86400 * 365.25)), "year")
}

export function formatWeekStartLabel(weekStart: string) {
  const d = new Date(`${weekStart}T12:00:00`)
  if (!Number.isFinite(d.getTime())) return weekStart
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function formatRepoMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number)
  if (!y || !m) return monthKey
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "short",
  })
}

export function shortRepoName(full: string) {
  const parts = full.split("/")
  return parts.length > 1 ? parts[parts.length - 1] : full
}
