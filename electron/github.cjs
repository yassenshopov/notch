const { createSmartCache } = require("./smart-cache.cjs")

const API = "https://api.github.com"
const cache = createSmartCache()

const INBOX_TTL_MS = 60_000
const INBOX_STALE_MS = 3 * 60_000
const HEATMAP_TTL_MS = 45 * 60_000
const HEATMAP_STALE_MS = 6 * 60 * 60_000
const TODAY_TTL_MS = 10 * 60_000
const TODAY_STALE_MS = 60 * 60_000

function token() {
  const t = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  return typeof t === "string" && t.trim() ? t.trim() : null
}

function headers() {
  const t = token()
  const h = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "notch-desktop",
  }
  if (t) h.Authorization = `Bearer ${t}`
  return h
}

async function gh(path) {
  const res = await fetch(`${API}${path}`, { headers: headers() })
  if (res.status === 401) throw new Error("github_unauthorized")
  if (res.status === 403) throw new Error("github_forbidden")
  if (!res.ok) throw new Error(`github_http_${res.status}`)
  return res.json()
}

async function ghGraphql(query, variables) {
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: variables ?? undefined }),
  })
  if (res.status === 401) throw new Error("github_unauthorized")
  if (res.status === 403) throw new Error("github_forbidden")
  if (!res.ok) throw new Error(`github_http_${res.status}`)
  const data = await res.json()
  if (data.errors?.length) {
    throw new Error(data.errors[0]?.message ?? "github_graphql_error")
  }
  return data.data
}

function mapNotification(n) {
  const repo = n.repository?.full_name ?? ""
  const base = n.repository?.html_url ?? ""
  let url = base
  const type = n.subject?.type
  const num = n.subject?.url?.match(/\/(\d+)$/)?.[1]
  if (base && num && (type === "Issue" || type === "PullRequest")) {
    const segment = type === "PullRequest" ? "pull" : "issues"
    url = `${base}/${segment}/${num}`
  }
  return {
    id: String(n.id),
    title: n.subject?.title ?? "Update",
    repo,
    url,
    updatedAt: n.updated_at,
    unread: n.unread,
  }
}

function mapPr(pr) {
  const repo = pr.repository?.full_name ?? pr.base?.repo?.full_name ?? ""
  const html = pr.html_url ?? ""
  return {
    number: pr.number,
    title: pr.title,
    repo,
    url: html,
    updatedAt: pr.updated_at,
    draft: Boolean(pr.draft),
  }
}

function mapContributionWeeks(weeks) {
  const mapped = []
  const days = []
  for (const week of weeks ?? []) {
    const column = (week.contributionDays ?? []).map((day) => ({
      date: day.date,
      count: day.contributionCount ?? 0,
    }))
    mapped.push(column)
    days.push(...column)
  }
  return { weeks: mapped, days }
}

function localContributionDateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Local-midnight → next local midnight (system timezone). */
function localDayRangeIso(dateKey) {
  const [y, m, day] = dateKey.split("-").map(Number)
  const from = new Date(y, m - 1, day, 0, 0, 0, 0)
  const to = new Date(y, m - 1, day + 1, 0, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** UTC-midnight → next UTC midnight — matches github.com when profile TZ is UTC. */
function utcDayRangeIso(dateKey) {
  const [y, m, day] = dateKey.split("-").map(Number)
  const from = new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0))
  const to = new Date(Date.UTC(y, m - 1, day + 1, 0, 0, 0, 0))
  return { from: from.toISOString(), to: to.toISOString() }
}

function contributionCountForDateKey(contributions, dateKey) {
  for (const d of flattenContributionDays(contributions)) {
    if (d.date === dateKey) return d.count ?? 0
  }
  return 0
}

function calendarCountForDate(collection, dateKey) {
  for (const week of collection?.contributionCalendar?.weeks ?? []) {
    for (const day of week.contributionDays ?? []) {
      if (day.date === dateKey) return day.contributionCount ?? 0
    }
  }
  return 0
}

function mergeContributionsByRepository(groups) {
  const map = new Map()
  for (const group of groups) {
    for (const row of group ?? []) {
      const repo = row.repository?.nameWithOwner
      if (!repo) continue
      const count = row.contributions?.totalCount ?? 0
      if (count <= 0) continue
      const url = row.repository?.url || `https://github.com/${repo}`
      const prev = map.get(repo)
      if (prev) prev.count += count
      else map.set(repo, { repo, url, count })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

/** Align per-repo totals with the contribution calendar for the same query window. */
function scaleRepoCountsToTarget(repos, targetSum) {
  if (!repos.length || targetSum <= 0) {
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

function flattenContributionDays(contributions) {
  if (!contributions) return []
  if (Array.isArray(contributions.days) && contributions.days.length) return contributions.days
  const days = []
  for (const week of contributions.weeks ?? []) {
    for (const day of week ?? []) {
      if (day?.date) days.push(day)
    }
  }
  return days
}

/** Calendar date key for “today” — prefers the heatmap day matching local date. */
function contributionDateKeyForToday(contributions) {
  const local = localContributionDateKey()
  const days = flattenContributionDays(contributions)
  if (days.some((d) => d.date === local)) return local
  return local
}

function todayCacheKey(dateKey) {
  return `github:today:v4:${dateKey}`
}

const TODAY_BREAKDOWN_CALENDAR = `
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }`

async function fetchTodayBreakdownForRange(dateKey, range) {
  const variables = { from: range.from, to: range.to }

  const commitsOnlyQuery = `query ($from: DateTime!, $to: DateTime!) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
        ${TODAY_BREAKDOWN_CALENDAR}
        commitContributionsByRepository(maxRepositories: 50) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
      }
    }
  }`

  const fullQuery = `query ($from: DateTime!, $to: DateTime!) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
        ${TODAY_BREAKDOWN_CALENDAR}
        commitContributionsByRepository(maxRepositories: 50) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
        pullRequestContributionsByRepository(maxRepositories: 50) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
        issueContributionsByRepository(maxRepositories: 50) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
        pullRequestReviewContributionsByRepository(maxRepositories: 50) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
      }
    }
  }`

  let col
  try {
    const data = await ghGraphql(fullQuery, variables)
    col = data?.viewer?.contributionsCollection
  } catch {
    const data = await ghGraphql(commitsOnlyQuery, variables)
    col = data?.viewer?.contributionsCollection
  }

  if (!col) return { calendarCount: 0, repos: [] }
  const calendarCount = calendarCountForDate(col, dateKey)
  const repos = scaleRepoCountsToTarget(
    mergeContributionsByRepository([
      col.commitContributionsByRepository,
      col.pullRequestContributionsByRepository,
      col.issueContributionsByRepository,
      col.pullRequestReviewContributionsByRepository,
    ]),
    calendarCount,
  )
  return {
    calendarCount,
    repos,
  }
}

function pickTodayBreakdownRange(dateKey, expectedCount, candidates) {
  if (expectedCount === undefined) return candidates[0]
  const exact = candidates.find((c) => c.calendarCount === expectedCount)
  if (exact) return exact
  if (expectedCount <= 0) {
    return candidates.find((c) => c.calendarCount === 0) ?? candidates[0]
  }
  return candidates.reduce((best, c) => {
    if (!best) return c
    const bestDelta = Math.abs(best.calendarCount - expectedCount)
    const delta = Math.abs(c.calendarCount - expectedCount)
    return delta < bestDelta ? c : best
  }, null)
}

async function fetchTodayBreakdownForDate(dateKey, expectedCount) {
  const rangeFns = [localDayRangeIso, utcDayRangeIso]
  const candidates = []
  for (const rangeFn of rangeFns) {
    const result = await fetchTodayBreakdownForRange(dateKey, rangeFn(dateKey))
    candidates.push(result)
    if (expectedCount !== undefined && result.calendarCount === expectedCount) {
      return { date: dateKey, repos: result.repos }
    }
  }
  const picked = pickTodayBreakdownRange(dateKey, expectedCount, candidates)
  return { date: dateKey, repos: picked?.repos ?? [] }
}

async function loadTodayBreakdown(force, contributions) {
  const dateKey = contributionDateKeyForToday(contributions)
  const expectedCount = contributionCountForDateKey(contributions, dateKey)
  const key = todayCacheKey(dateKey)
  if (force) cache.invalidate(key)

  try {
    const breakdown = await cache.get(key, {
      ttlMs: TODAY_TTL_MS,
      staleMs: TODAY_STALE_MS,
      force,
      fetcher: () => fetchTodayBreakdownForDate(dateKey, expectedCount),
    })
    if (breakdown?.date === dateKey) return breakdown
    cache.invalidate(key)
    return await fetchTodayBreakdownForDate(dateKey)
  } catch (err) {
    return {
      date: dateKey,
      repos: [],
      error: err instanceof Error ? err.message : "github_today_error",
    }
  }
}

async function fetchContributions() {
  const data = await ghGraphql(`
    query {
      viewer {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `)
  const cal = data?.viewer?.contributionsCollection?.contributionCalendar
  if (!cal) return null
  const { weeks, days } = mapContributionWeeks(cal.weeks)
  return {
    total: cal.totalContributions ?? 0,
    days,
    weeks,
  }
}

function normalizeContributions(raw) {
  if (!raw) return null
  if (Array.isArray(raw.weeks) && raw.weeks.length > 0) {
    return {
      total: raw.total ?? 0,
      days: Array.isArray(raw.days) ? raw.days : [],
      weeks: raw.weeks,
    }
  }
  const days = Array.isArray(raw.days) ? raw.days : []
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return { total: raw.total ?? 0, days, weeks }
}

async function fetchInbox() {
  const user = await gh("/user")
  const [notifications, search] = await Promise.all([
    gh("/notifications?per_page=8"),
    gh(
      `/search/issues?q=type:pr+state:open+involves:${encodeURIComponent(user.login)}&sort=updated&per_page=8`,
    ),
  ])

  const pullRequests = (search.items ?? []).map((item) => {
    const repoPath = item.repository_url?.replace(`${API}/repos/`, "") ?? ""
    return mapPr({
      number: item.number,
      title: item.title,
      html_url: item.html_url,
      updated_at: item.updated_at,
      draft: item.draft,
      repository: { full_name: repoPath },
    })
  })

  return {
    login: user.login,
    avatarUrl: user.avatar_url,
    notifications: (notifications ?? []).map(mapNotification),
    pullRequests,
  }
}

async function status(options = {}) {
  const force = options.force === true
  const configured = Boolean(token())
  if (!configured) {
    return {
      configured: false,
      connected: false,
      login: null,
      avatarUrl: null,
      notifications: [],
      pullRequests: [],
      contributions: null,
      todayBreakdown: null,
      message: "Add GITHUB_TOKEN to .env",
    }
  }

  try {
    const [inbox, contributions] = await Promise.all([
      cache.get("github:inbox", {
        ttlMs: INBOX_TTL_MS,
        staleMs: INBOX_STALE_MS,
        force,
        fetcher: fetchInbox,
      }),
      cache
        .get("github:contributions:v2", {
          ttlMs: HEATMAP_TTL_MS,
          staleMs: HEATMAP_STALE_MS,
          force,
          fetcher: fetchContributions,
        })
        .catch(() => null),
    ])

    const normalizedContributions = normalizeContributions(contributions)
    const todayBreakdown = await loadTodayBreakdown(force, normalizedContributions)

    const payload = {
      configured: true,
      connected: true,
      login: inbox.login,
      avatarUrl: inbox.avatarUrl,
      notifications: inbox.notifications,
      pullRequests: inbox.pullRequests,
      contributions: normalizedContributions,
      todayBreakdown,
    }

    if (options.includeInsights === true) {
      payload.insights = await loadActivityInsights({
        force,
        year: options.year,
      })
    }

    return payload
  } catch (err) {
    return {
      configured: true,
      connected: false,
      login: null,
      avatarUrl: null,
      notifications: [],
      pullRequests: [],
      contributions: null,
      todayBreakdown: null,
      error: err instanceof Error ? err.message : "github_error",
    }
  }
}

const INSIGHTS_TTL_MS = 60 * 60_000
const INSIGHTS_STALE_MS = 12 * 60 * 60_000

function yearContributionRangeIso(year) {
  const from = `${year}-01-01T00:00:00.000Z`
  const now = new Date()
  if (year > now.getFullYear()) return null
  if (year < 1970) return null
  const isCurrent = year === now.getFullYear()
  const to = isCurrent
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
    : `${year + 1}-01-01T00:00:00.000Z`
  return { from, to }
}

function accountStartYear(createdAt) {
  const d = createdAt ? new Date(createdAt) : null
  const y = d && Number.isFinite(d.getTime()) ? d.getUTCFullYear() : new Date().getUTCFullYear() - 4
  return Math.min(y, new Date().getFullYear())
}

async function fetchContributionsForRange(from, to) {
  const data = await ghGraphql(
    `query ($from: DateTime!, $to: DateTime!) {
      viewer {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }`,
    { from, to },
  )
  const cal = data?.viewer?.contributionsCollection?.contributionCalendar
  if (!cal) return null
  const { weeks, days } = mapContributionWeeks(cal.weeks)
  return {
    total: cal.totalContributions ?? 0,
    days,
    weeks,
  }
}

async function fetchContributionsForYear(year) {
  const range = yearContributionRangeIso(year)
  if (!range) return null
  return fetchContributionsForRange(range.from, range.to)
}

const REPO_CONTRIBUTION_FIELDS = `
        commitContributionsByRepository(maxRepositories: 30) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
        pullRequestContributionsByRepository(maxRepositories: 30) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
        issueContributionsByRepository(maxRepositories: 30) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
        pullRequestReviewContributionsByRepository(maxRepositories: 30) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }`

const REPO_COMMIT_FIELDS = `
        commitContributionsByRepository(maxRepositories: 30) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }`

async function fetchRepoTotalsForRange(from, to) {
  const fullQuery = `query ($from: DateTime!, $to: DateTime!) {
      viewer {
        contributionsCollection(from: $from, to: $to) {
          ${REPO_CONTRIBUTION_FIELDS}
        }
      }
    }`
  const commitsQuery = `query ($from: DateTime!, $to: DateTime!) {
      viewer {
        contributionsCollection(from: $from, to: $to) {
          ${REPO_COMMIT_FIELDS}
        }
      }
    }`

  let col
  try {
    const data = await ghGraphql(fullQuery, { from, to })
    col = data?.viewer?.contributionsCollection
  } catch {
    const data = await ghGraphql(commitsQuery, { from, to })
    col = data?.viewer?.contributionsCollection
  }
  if (!col) return []
  return mergeContributionsByRepository([
    col.commitContributionsByRepository,
    col.pullRequestContributionsByRepository,
    col.issueContributionsByRepository,
    col.pullRequestReviewContributionsByRepository,
  ])
}

function monthRangesForYear(year) {
  const now = new Date()
  const lastMonth = year === now.getUTCFullYear() ? now.getUTCMonth() : 11
  const ranges = []
  for (let m = 0; m <= lastMonth; m++) {
    const from = new Date(Date.UTC(year, m, 1)).toISOString()
    const to = new Date(Date.UTC(year, m + 1, 1)).toISOString()
    const key = `${year}-${String(m + 1).padStart(2, "0")}`
    ranges.push({ key, from, to, alias: `m${m}` })
  }
  return ranges
}

async function fetchRepoTotalsForMonth(from, to) {
  const data = await ghGraphql(
    `query ($from: DateTime!, $to: DateTime!) {
      viewer {
        contributionsCollection(from: $from, to: $to) {
          ${REPO_COMMIT_FIELDS}
        }
      }
    }`,
    { from, to },
  )
  const col = data?.viewer?.contributionsCollection
  if (!col) return []
  return mergeContributionsByRepository([col.commitContributionsByRepository])
}

async function fetchRepoMonthlySeries(year) {
  const months = monthRangesForYear(year)
  if (!months.length) return { months: [], series: [] }

  const monthKeys = months.map((m) => m.key)
  const totalsByRepo = new Map()

  for (const m of months) {
    const repos = await fetchRepoTotalsForMonth(m.from, m.to)
    for (const row of repos) {
      let entry = totalsByRepo.get(row.repo)
      if (!entry) {
        entry = { repo: row.repo, url: row.url, byMonth: new Map() }
        totalsByRepo.set(row.repo, entry)
      }
      entry.byMonth.set(m.key, (entry.byMonth.get(m.key) ?? 0) + row.count)
    }
  }

  const ranked = [...totalsByRepo.values()]
    .map((entry) => ({
      repo: entry.repo,
      url: entry.url,
      total: [...entry.byMonth.values()].reduce((s, n) => s + n, 0),
      byMonth: entry.byMonth,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const series = ranked.map((row) => ({
    repo: row.repo,
    url: row.url,
    total: row.total,
    months: monthKeys.map((key) => ({ month: key, count: row.byMonth.get(key) ?? 0 })),
  }))

  return { months: monthKeys, series }
}

async function loadContributionYears(force) {
  const cacheKey = "github:insights:years:v1"
  if (force) cache.invalidate(cacheKey)
  return cache.get(cacheKey, {
    ttlMs: INSIGHTS_TTL_MS,
    staleMs: INSIGHTS_STALE_MS,
    force,
    fetcher: async () => {
      const user = await gh("/user")
      const startYear = accountStartYear(user.created_at)
      const endYear = new Date().getFullYear()
      const yearNums = []
      for (let y = endYear; y >= startYear; y--) yearNums.push(y)
      const yearPayloads = await Promise.all(
        yearNums.map(async (y) => {
          const contributions = await fetchContributionsForYear(y)
          if (!contributions) return null
          return { year: y, total: contributions.total, weeks: contributions.weeks }
        }),
      )
      return yearPayloads.filter(Boolean)
    },
  })
}

async function loadRepoChartsForYear(year, force) {
  const cacheKey = `github:insights:repos:v1:${year}`
  if (force) cache.invalidate(cacheKey)
  return cache.get(cacheKey, {
    ttlMs: INSIGHTS_TTL_MS,
    staleMs: INSIGHTS_STALE_MS,
    force,
    fetcher: async () => {
      const range = yearContributionRangeIso(year)
      const repoTotals = range ? await fetchRepoTotalsForRange(range.from, range.to) : []
      const { months, series } = await fetchRepoMonthlySeries(year)
      return {
        repoTotals: repoTotals.slice(0, 12),
        repoSeries: series,
        monthLabels: months,
      }
    },
  })
}

async function loadActivityInsights(options = {}) {
  const force = options.force === true
  const year =
    typeof options.year === "number" && Number.isFinite(options.year)
      ? Math.floor(options.year)
      : new Date().getFullYear()

  let years = []
  let charts = { repoTotals: [], repoSeries: [], monthLabels: [] }
  let yearsError
  let chartsError

  try {
    years = await loadContributionYears(force)
  } catch (err) {
    yearsError = err instanceof Error ? err.message : "github_years_error"
  }

  try {
    charts = await loadRepoChartsForYear(year, force)
  } catch (err) {
    chartsError = err instanceof Error ? err.message : "github_charts_error"
  }

  const error = yearsError && chartsError ? `${yearsError}; ${chartsError}` : yearsError ?? chartsError

  return {
    years,
    chartYear: year,
    repoTotals: charts.repoTotals,
    repoSeries: charts.repoSeries,
    monthLabels: charts.monthLabels,
    error,
  }
}

async function activityInsights(options = {}) {
  const configured = Boolean(token())
  if (!configured) {
    return {
      configured: false,
      connected: false,
      years: [],
      chartYear: new Date().getFullYear(),
      repoTotals: [],
      repoSeries: [],
      monthLabels: [],
      message: "Add GITHUB_TOKEN to .env",
    }
  }

  try {
    const payload = await loadActivityInsights(options)
    return {
      configured: true,
      connected: true,
      ...payload,
    }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      years: [],
      chartYear: new Date().getFullYear(),
      repoTotals: [],
      repoSeries: [],
      monthLabels: [],
      error: err instanceof Error ? err.message : "github_insights_error",
    }
  }
}

module.exports = { status, activityInsights, configured: () => Boolean(token()) }
