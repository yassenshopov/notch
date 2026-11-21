const { createSmartCache } = require("./smart-cache.cjs")
const githubStore = require("./github-persistence.cjs")

const API = "https://api.github.com"
const cache = createSmartCache()

const INBOX_TTL_MS = 60_000
const INBOX_STALE_MS = 3 * 60_000
const NOTIFICATIONS_INBOX_KIND = "notifications_inbox"
const NOTIFICATIONS_PER_PAGE = 15
const HEATMAP_TTL_MS = 45 * 60_000
const HEATMAP_STALE_MS = 6 * 60 * 60_000
const TODAY_TTL_MS = 10 * 60_000
const TODAY_STALE_MS = 60 * 60_000
/** Status bundle in Neon — beyond this, refetch from GitHub API. */
const STATUS_DB_STALE_MS = HEATMAP_STALE_MS

let statusBackgroundRefresh = null

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

async function ghGet(pathAndQuery) {
  const res = await fetch(`${API}${pathAndQuery}`, { headers: headers() })
  if (res.status === 401) throw new Error("github_unauthorized")
  if (res.status === 403) throw new Error("github_forbidden")
  if (!res.ok) throw new Error(`github_http_${res.status}`)
  return res.json()
}

async function ghRequest(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...headers(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) throw new Error("github_unauthorized")
  if (res.status === 403) throw new Error("github_forbidden")
  if (!res.ok && res.status !== 204 && res.status !== 205) throw new Error(`github_http_${res.status}`)
  if (res.status === 204 || res.status === 205) return null
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text)
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

function mapNotificationSubjectType(type) {
  const map = {
    Issue: "Issue",
    PullRequest: "Pull request",
    Discussion: "Discussion",
    Commit: "Commit",
    Release: "Release",
    RepositoryVulnerabilityAlert: "Security alert",
    RepositoryDependabotAlertsThread: "Dependabot",
  }
  if (!type) return "Update"
  return map[type] ?? type.replace(/([a-z])([A-Z])/g, "$1 $2")
}

function mapNotificationAction(reason, subjectType) {
  const reasonMap = {
    assign: "Assigned to you",
    author: "Your activity",
    comment: "New comment",
    invitation: "Invitation",
    manual: "Subscribed",
    mention: "Mentioned you",
    review_requested: "Review requested",
    security_alert: "Security alert",
    state_change: "Status changed",
    subscribed: "New activity",
    team_mention: "Team mention",
  }
  if (reason && reasonMap[reason]) return reasonMap[reason]
  if (subjectType === "PullRequest" && reason === "review_requested") return "Review requested"
  if (typeof reason === "string" && reason) {
    return reason.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return "Notification"
}

function mapNotification(n) {
  const repo = n.repository?.full_name ?? ""
  const base = n.repository?.html_url ?? ""
  let url = base
  const subjectType = n.subject?.type
  const num = n.subject?.url?.match(/\/(\d+)$/)?.[1]
  if (base && num && (subjectType === "Issue" || subjectType === "PullRequest")) {
    const segment = subjectType === "PullRequest" ? "pull" : "issues"
    url = `${base}/${segment}/${num}`
  }
  const owner = n.repository?.owner
  const ownerType =
    owner?.type === "Organization" ? "organization" : owner?.type === "User" ? "user" : "unknown"
  return {
    id: String(n.id),
    title: n.subject?.title ?? "Update",
    repo,
    url,
    updatedAt: n.updated_at,
    unread: Boolean(n.unread),
    reason: n.reason ?? null,
    subjectType: subjectType ?? null,
    actionLabel: mapNotificationAction(n.reason, subjectType),
    subjectTypeLabel: mapNotificationSubjectType(subjectType),
    ownerLogin: owner?.login ?? (repo.includes("/") ? repo.split("/")[0] : ""),
    ownerAvatarUrl: owner?.avatar_url ?? null,
    ownerType,
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

function mapPrLabels(labels) {
  return (labels ?? [])
    .filter((l) => l?.name)
    .map((l) => ({ name: l.name, color: l.color ? String(l.color).replace(/^#/, "") : "6e7681" }))
}

function mapRepoPullRequest(pr, repoFullName) {
  const repo = repoFullName || pr.base?.repo?.full_name || ""
  return {
    ...mapPr({ ...pr, repository: { full_name: repo } }),
    createdAt: pr.created_at ?? "",
    userLogin: pr.user?.login ?? "",
    userAvatarUrl: pr.user?.avatar_url ?? null,
    comments: pr.comments ?? 0,
    reviewComments: pr.review_comments ?? 0,
    labels: mapPrLabels(pr.labels),
    mergeableState: pr.mergeable_state ?? null,
  }
}

function mapCheckRun(run) {
  return {
    id: String(run.id ?? run.name ?? Math.random()),
    name: run.name ?? "Check",
    status: run.status ?? "queued",
    conclusion: run.conclusion ?? null,
    detailsUrl: run.details_url ?? null,
    startedAt: run.started_at ?? null,
    completedAt: run.completed_at ?? null,
  }
}

function mapCommitStatus(row) {
  return {
    context: row.context ?? "status",
    state: row.state ?? "pending",
    description: row.description ?? null,
    targetUrl: row.target_url ?? null,
  }
}

function deriveChecksState(checkRuns, statuses) {
  const bucket = []
  for (const run of checkRuns) {
    if (run.status !== "completed") bucket.push("pending")
    else if (run.conclusion === "success" || run.conclusion === "skipped") bucket.push("success")
    else if (run.conclusion === "neutral") bucket.push("neutral")
    else if (run.conclusion === "failure" || run.conclusion === "timed_out" || run.conclusion === "action_required") {
      bucket.push("failure")
    } else bucket.push("neutral")
  }
  for (const row of statuses) {
    if (row.state === "pending") bucket.push("pending")
    else if (row.state === "success") bucket.push("success")
    else bucket.push("failure")
  }
  if (!bucket.length) return null
  if (bucket.some((s) => s === "failure")) return "failure"
  if (bucket.some((s) => s === "pending")) return "pending"
  if (bucket.every((s) => s === "success" || s === "neutral")) return "success"
  return "neutral"
}

function summarizeCheckCounts(checkRuns, statuses) {
  let passed = 0
  let total = 0
  for (const run of checkRuns) {
    total += 1
    if (run.status === "completed" && (run.conclusion === "success" || run.conclusion === "skipped")) {
      passed += 1
    }
  }
  for (const row of statuses) {
    total += 1
    if (row.state === "success") passed += 1
  }
  if (total <= 0) return null
  return {
    checksPassed: passed,
    checksTotal: total,
    checksState: deriveChecksState(checkRuns, statuses),
  }
}

async function fetchPrCheckSummary(owner, repo, sha) {
  const [checkRuns, statusPayload] = await Promise.all([
    fetchCommitCheckRuns(owner, repo, sha).catch(() => []),
    gh(`/repos/${owner}/${repo}/commits/${encodeURIComponent(sha)}/status`).catch(() => null),
  ])
  const statuses = (statusPayload?.statuses ?? []).map(mapCommitStatus)
  return summarizeCheckCounts(checkRuns, statuses)
}

async function fetchCommitCheckRuns(owner, repo, ref) {
  const runs = []
  let page = 1
  for (;;) {
    const data = await ghGet(
      `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}/check-runs?per_page=100&page=${page}`,
    )
    runs.push(...(data.check_runs ?? []))
    const total = data.total_count ?? runs.length
    if (runs.length >= total || !(data.check_runs?.length)) break
    page += 1
    if (page > 3) break
  }
  return runs.map(mapCheckRun)
}

const REPO_PRS_TTL_MS = 60_000
const REPO_PRS_STALE_MS = 5 * 60_000
const PR_DETAIL_TTL_MS = 45_000
const PR_DETAIL_STALE_MS = 3 * 60_000

async function repoPullRequests(repo, options = {}) {
  if (!token()) {
    return { configured: false, connected: false, repo: String(repo ?? ""), items: [] }
  }
  const full = String(repo ?? "").trim()
  const parts = full.split("/")
  if (parts.length < 2) {
    return { configured: true, connected: false, repo: full, items: [], error: "invalid_repo" }
  }
  const [owner, name] = parts
  const cacheKey = `github:repo-prs:v2:${full}`
  if (options.force === true) cache.invalidate(cacheKey)
  const REPO_PR_CHECK_CONCURRENCY = 6
  try {
    const items = await cache.get(cacheKey, {
      ttlMs: REPO_PRS_TTL_MS,
      staleMs: REPO_PRS_STALE_MS,
      force: options.force === true,
      fetcher: async () => {
        const rows = await gh(
          `/repos/${owner}/${name}/pulls?state=open&sort=updated&direction=desc&per_page=30`,
        )
        const list = rows ?? []
        const mapped = new Array(list.length)
        let next = 0
        async function worker() {
          while (next < list.length) {
            const idx = next++
            const pr = list[idx]
            const item = mapRepoPullRequest(pr, full)
            const sha = pr.head?.sha
            if (sha) {
              const summary = await fetchPrCheckSummary(owner, name, sha).catch(() => null)
              if (summary) {
                item.checksPassed = summary.checksPassed
                item.checksTotal = summary.checksTotal
                item.checksState = summary.checksState
              }
            }
            mapped[idx] = item
          }
        }
        const workers = Math.min(REPO_PR_CHECK_CONCURRENCY, list.length || 1)
        await Promise.all(Array.from({ length: workers }, () => worker()))
        return mapped.sort((a, b) => b.number - a.number)
      },
    })
    return { configured: true, connected: true, repo: full, items }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      repo: full,
      items: [],
      error: err instanceof Error ? err.message : "github_repo_prs_error",
    }
  }
}

async function pullRequestDetail(repo, number, options = {}) {
  if (!token()) {
    return { configured: false, connected: false, error: "not_configured" }
  }
  const full = String(repo ?? "").trim()
  const parts = full.split("/")
  const prNumber = Number(number)
  if (parts.length < 2 || !Number.isFinite(prNumber) || prNumber <= 0) {
    return { configured: true, connected: false, error: "invalid_pr" }
  }
  const [owner, name] = parts
  const cacheKey = `github:pr-detail:v1:${full}:${prNumber}`
  if (options.force === true) cache.invalidate(cacheKey)
  try {
    const payload = await cache.get(cacheKey, {
      ttlMs: PR_DETAIL_TTL_MS,
      staleMs: PR_DETAIL_STALE_MS,
      force: options.force === true,
      fetcher: async () => {
        const pr = await gh(`/repos/${owner}/${name}/pulls/${prNumber}`)
        const sha = pr.head?.sha
        const [checkRuns, statusPayload] = await Promise.all([
          sha ? fetchCommitCheckRuns(owner, name, sha).catch(() => []) : [],
          sha
            ? gh(`/repos/${owner}/${name}/commits/${encodeURIComponent(sha)}/status`).catch(() => null)
            : null,
        ])
        const statuses = (statusPayload?.statuses ?? []).map(mapCommitStatus)
        const reviewers = [...(pr.requested_reviewers ?? []).map((u) => u?.login).filter(Boolean)]
        return {
          number: pr.number,
          title: pr.title,
          repo: full,
          url: pr.html_url ?? `https://github.com/${full}/pull/${pr.number}`,
          state: pr.state === "closed" ? "closed" : "open",
          draft: Boolean(pr.draft),
          body: pr.body ?? null,
          createdAt: pr.created_at ?? "",
          updatedAt: pr.updated_at ?? "",
          mergedAt: pr.merged_at ?? null,
          userLogin: pr.user?.login ?? "",
          userAvatarUrl: pr.user?.avatar_url ?? null,
          headRef: pr.head?.ref ?? "",
          baseRef: pr.base?.ref ?? "",
          additions: pr.additions ?? 0,
          deletions: pr.deletions ?? 0,
          changedFiles: pr.changed_files ?? 0,
          commits: pr.commits ?? 0,
          labels: mapPrLabels(pr.labels),
          mergeable: typeof pr.mergeable === "boolean" ? pr.mergeable : null,
          mergeableState: pr.mergeable_state ?? null,
          reviewers,
          checkRuns,
          statuses,
          checksState: deriveChecksState(checkRuns, statuses),
        }
      },
    })
    return { configured: true, connected: true, ...payload }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      error: err instanceof Error ? err.message : "github_pr_detail_error",
    }
  }
}

function mapRepoIssue(issue, repoFullName) {
  return {
    number: issue.number,
    title: issue.title,
    repo: repoFullName,
    url: issue.html_url ?? "",
    state: issue.state === "closed" ? "closed" : "open",
    createdAt: issue.created_at ?? "",
    updatedAt: issue.updated_at ?? "",
    userLogin: issue.user?.login ?? "",
    userAvatarUrl: issue.user?.avatar_url ?? null,
    comments: issue.comments ?? 0,
    labels: mapPrLabels(issue.labels),
  }
}

const REPO_ISSUES_TTL_MS = 60_000
const REPO_ISSUES_STALE_MS = 5 * 60_000
const ISSUE_DETAIL_TTL_MS = 45_000
const ISSUE_DETAIL_STALE_MS = 3 * 60_000

async function repoIssues(repo, options = {}) {
  if (!token()) {
    return { configured: false, connected: false, repo: String(repo ?? ""), items: [] }
  }
  const full = String(repo ?? "").trim()
  const parts = full.split("/")
  if (parts.length < 2) {
    return { configured: true, connected: false, repo: full, items: [], error: "invalid_repo" }
  }
  const [owner, name] = parts
  const cacheKey = `github:repo-issues:v1:${full}`
  if (options.force === true) cache.invalidate(cacheKey)
  try {
    const items = await cache.get(cacheKey, {
      ttlMs: REPO_ISSUES_TTL_MS,
      staleMs: REPO_ISSUES_STALE_MS,
      force: options.force === true,
      fetcher: async () => {
        const rows = await gh(
          `/repos/${owner}/${name}/issues?state=open&sort=updated&direction=desc&per_page=50`,
        )
        return (rows ?? [])
          .filter((row) => !row.pull_request)
          .map((row) => mapRepoIssue(row, full))
          .sort((a, b) => b.number - a.number)
          .slice(0, 30)
      },
    })
    return { configured: true, connected: true, repo: full, items }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      repo: full,
      items: [],
      error: err instanceof Error ? err.message : "github_repo_issues_error",
    }
  }
}

async function issueDetail(repo, number, options = {}) {
  if (!token()) {
    return { configured: false, connected: false, error: "not_configured" }
  }
  const full = String(repo ?? "").trim()
  const parts = full.split("/")
  const issueNumber = Number(number)
  if (parts.length < 2 || !Number.isFinite(issueNumber) || issueNumber <= 0) {
    return { configured: true, connected: false, error: "invalid_issue" }
  }
  const [owner, name] = parts
  const cacheKey = `github:issue-detail:v1:${full}:${issueNumber}`
  if (options.force === true) cache.invalidate(cacheKey)
  try {
    const payload = await cache.get(cacheKey, {
      ttlMs: ISSUE_DETAIL_TTL_MS,
      staleMs: ISSUE_DETAIL_STALE_MS,
      force: options.force === true,
      fetcher: async () => {
        const issue = await gh(`/repos/${owner}/${name}/issues/${issueNumber}`)
        if (issue.pull_request) {
          throw new Error("issue_is_pull_request")
        }
        return {
          number: issue.number,
          title: issue.title,
          repo: full,
          url: issue.html_url ?? `https://github.com/${full}/issues/${issue.number}`,
          state: issue.state === "closed" ? "closed" : "open",
          body: issue.body ?? null,
          createdAt: issue.created_at ?? "",
          updatedAt: issue.updated_at ?? "",
          closedAt: issue.closed_at ?? null,
          userLogin: issue.user?.login ?? "",
          userAvatarUrl: issue.user?.avatar_url ?? null,
          comments: issue.comments ?? 0,
          labels: mapPrLabels(issue.labels),
          assignees: (issue.assignees ?? []).map((u) => u?.login).filter(Boolean),
        }
      },
    })
    return { configured: true, connected: true, ...payload }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      error: err instanceof Error ? err.message : "github_issue_detail_error",
    }
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

function dayCacheKey(dateKey) {
  return `github:day:v7:${dateKey}`
}

function sumRepoCounts(repos) {
  return (repos ?? []).reduce((sum, row) => sum + (row.count ?? 0), 0)
}

/** Day snapshots are invalid when the heatmap total for that date changed (e.g. more commits landed). */
function breakdownMatchesExpected(breakdown, expectedCount) {
  if (!breakdown || breakdown.error) return false
  if (expectedCount === undefined) return true
  if (typeof breakdown.expectedCount === "number") {
    return breakdown.expectedCount === expectedCount
  }
  return false
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
  const repos = mergeContributionsByRepository([col.commitContributionsByRepository])
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

/** Matches github.com “Created N commits in …” — GraphQL windows can mis-attribute across repos. */
async function fetchCommitCountsByRepoForDate(dateKey, login) {
  const q = `author:${login} committer-date:${dateKey}`
  const map = new Map()
  let page = 1
  while (page <= 10) {
    const data = await ghGet(
      `/search/commits?q=${encodeURIComponent(q)}&sort=committer-date&order=desc&per_page=100&page=${page}`,
    )
    const items = data?.items ?? []
    if (!items.length) break
    for (const item of items) {
      const repo = item.repository?.full_name
      if (!repo) continue
      map.set(repo, (map.get(repo) ?? 0) + 1)
    }
    if (items.length < 100) break
    page++
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([repo, count]) => ({
      repo,
      url: `https://github.com/${repo}`,
      count,
    }))
}

async function resolveGithubLogin() {
  const cached = await githubStore.readLatestLogin().catch(() => null)
  if (cached) return cached
  const user = await gh("/user").catch(() => null)
  return user?.login ?? null
}

async function fetchTodayBreakdownForDate(dateKey, expectedCount) {
  const login = await resolveGithubLogin()
  if (login) {
    try {
      const repos = await fetchCommitCountsByRepoForDate(dateKey, login)
      if (repos.length > 0) {
        return {
          date: dateKey,
          repos,
          expectedCount: expectedCount,
        }
      }
    } catch (err) {
      console.warn("[github] commit-search day breakdown failed:", err instanceof Error ? err.message : err)
    }
  }

  const local = await fetchTodayBreakdownForRange(dateKey, localDayRangeIso(dateKey))
  if (expectedCount !== undefined && local.calendarCount === expectedCount) {
    return {
      date: dateKey,
      repos: local.repos,
      expectedCount: local.calendarCount,
    }
  }
  const utc = await fetchTodayBreakdownForRange(dateKey, utcDayRangeIso(dateKey))
  const candidates = [local, utc]
  const picked = pickTodayBreakdownRange(dateKey, expectedCount, candidates)
  const calendarCount = picked?.calendarCount ?? expectedCount ?? 0
  return {
    date: dateKey,
    repos: picked?.repos ?? [],
    expectedCount: calendarCount,
  }
}

async function loadDayBreakdown(dateKey, expectedCount, force = false) {
  const key = dayCacheKey(dateKey)
  if (force) cache.invalidate(key)

  if (!force) {
    const login = await githubStore.readLatestLogin().catch(() => null)
    const row = login
      ? await githubStore.readSnapshotWithMeta(login, `day:${dateKey}`)
      : null
    if (row?.payload?.date === dateKey) {
      const age = row.syncedAt ? Date.now() - row.syncedAt : Number.POSITIVE_INFINITY
      if (
        age < TODAY_STALE_MS &&
        breakdownMatchesExpected(row.payload, expectedCount)
      ) {
        return { ...row.payload, fromCache: true, cachedAt: row.syncedAt }
      }
    }
  }

  try {
    const breakdown = await cache.get(key, {
      ttlMs: TODAY_TTL_MS,
      staleMs: TODAY_STALE_MS,
      force,
      fetcher: () => fetchTodayBreakdownForDate(dateKey, expectedCount),
    })
    if (breakdown?.date === dateKey) {
      const login = await githubStore.readLatestLogin().catch(() => null)
      if (login) {
        void githubStore.writeSnapshot(login, `day:${dateKey}`, breakdown)
      }
      return breakdown
    }
    cache.invalidate(key)
    return await fetchTodayBreakdownForDate(dateKey, expectedCount)
  } catch (err) {
    const login = await githubStore.readLatestLogin().catch(() => null)
    const cached = login
      ? await githubStore.readSnapshot(login, `day:${dateKey}`).catch(() => null)
      : null
    if (cached?.date === dateKey) {
      return { ...cached, fromCache: true }
    }
    return {
      date: dateKey,
      repos: [],
      error: err instanceof Error ? err.message : "github_day_error",
    }
  }
}

async function loadTodayBreakdown(force, contributions) {
  const dateKey = contributionDateKeyForToday(contributions)
  const expectedCount = contributionCountForDateKey(contributions, dateKey)
  return loadDayBreakdown(dateKey, expectedCount, force)
}

async function syncTodayBreakdownWithContributions(payload, force = false) {
  if (!payload?.contributions) return payload
  const dateKey = contributionDateKeyForToday(payload.contributions)
  const expectedCount = contributionCountForDateKey(payload.contributions, dateKey)
  const bd = payload.todayBreakdown
  const stale =
    !bd ||
    bd.date !== dateKey ||
    !breakdownMatchesExpected(bd, expectedCount)
  if (!force && !stale) return payload
  const fresh = await loadDayBreakdown(
    dateKey,
    expectedCount,
    force || stale,
  )
  return { ...payload, todayBreakdown: fresh }
}

async function dayBreakdown(options = {}) {
  const dateKey = String(options.date ?? "").trim()
  if (!dateKey) {
    return { date: "", repos: [], error: "missing_date" }
  }
  const configured = Boolean(token())
  if (!configured) {
    return { date: dateKey, repos: [], error: "not_configured" }
  }
  const expectedCount =
    typeof options.count === "number" && Number.isFinite(options.count)
      ? options.count
      : undefined
  return loadDayBreakdown(dateKey, expectedCount, options.force === true)
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

function mapProfile(user) {
  if (!user) return null
  return {
    name: user.name ?? null,
    bio: user.bio ?? null,
    company: user.company ?? null,
    location: user.location ?? null,
    blog: user.blog || null,
    followers: user.followers ?? 0,
    following: user.following ?? 0,
    publicRepos: user.public_repos ?? 0,
    url: user.html_url ?? `https://github.com/${user.login}`,
    twitterUsername: user.twitter_username ?? null,
  }
}

async function fetchNotificationsList({ before, perPage = NOTIFICATIONS_PER_PAGE } = {}) {
  const qs = new URLSearchParams({ per_page: String(perPage) })
  if (before) qs.set("before", before)
  const rows = await gh(`/notifications?${qs}`)
  return (rows ?? []).map(mapNotification)
}

async function persistNotificationsInbox(login, inboxPayload) {
  if (!login || !inboxPayload) return
  await githubStore.writeSnapshot(login, NOTIFICATIONS_INBOX_KIND, inboxPayload).catch(() => {})
  const statusRow = await githubStore.readSnapshot(login, "status").catch(() => null)
  if (statusRow?.login) {
    await githubStore
      .writeStatusBundle({
        ...statusRow,
        notifications: (inboxPayload.items ?? []).slice(0, 12),
      })
      .catch(() => {})
  }
  cache.invalidate("github:inbox")
}

async function readNotificationsInboxCached(login) {
  return githubStore.readSnapshotWithMeta(login, NOTIFICATIONS_INBOX_KIND)
}

async function patchInboxUnread(login, patchFn) {
  const snap = (await githubStore.readSnapshot(login, NOTIFICATIONS_INBOX_KIND)) ?? {
    items: [],
    hasMore: false,
    perPage: NOTIFICATIONS_PER_PAGE,
    savedAt: Date.now(),
  }
  const items = (snap.items ?? []).map(patchFn)
  const next = { ...snap, items, savedAt: Date.now() }
  await persistNotificationsInbox(login, next)
  return next
}

async function notificationsInbox(options = {}) {
  const configured = Boolean(token())
  if (!configured) {
    return {
      configured: false,
      connected: false,
      items: [],
      hasMore: false,
      message: "Add GITHUB_TOKEN to .env",
    }
  }

  const force = options.force === true
  const before = options.before ? String(options.before) : null
  const loadMore = Boolean(before)

  let login = await githubStore.readLatestLogin().catch(() => null)
  if (!login) {
    try {
      login = (await gh("/user"))?.login
    } catch {
      login = null
    }
  }

  if (!loadMore && !force && login) {
    const cached = await readNotificationsInboxCached(login)
    if (cached?.payload?.items?.length) {
      const age = cached.syncedAt ? Date.now() - cached.syncedAt : Number.POSITIVE_INFINITY
      if (age < INBOX_STALE_MS) {
        return {
          configured: true,
          connected: true,
          items: cached.payload.items,
          hasMore: Boolean(cached.payload.hasMore),
          perPage: cached.payload.perPage ?? NOTIFICATIONS_PER_PAGE,
          fromCache: true,
          cachedAt: cached.syncedAt,
        }
      }
    }
  }

  try {
    const fetched = await fetchNotificationsList({ before, perPage: NOTIFICATIONS_PER_PAGE })
    const hasMore = fetched.length >= NOTIFICATIONS_PER_PAGE

    let items = fetched
    if (loadMore && login) {
      const prev = (await githubStore.readSnapshot(login, NOTIFICATIONS_INBOX_KIND))?.items ?? []
      const ids = new Set(prev.map((n) => n.id))
      items = [...prev, ...fetched.filter((n) => !ids.has(n.id))]
    }

    const payload = {
      items,
      hasMore,
      perPage: NOTIFICATIONS_PER_PAGE,
      savedAt: Date.now(),
    }

    if (login) await persistNotificationsInbox(login, payload)

    return {
      configured: true,
      connected: true,
      ...payload,
    }
  } catch (err) {
    if (login) {
      const cached = await githubStore.readSnapshot(login, NOTIFICATIONS_INBOX_KIND).catch(() => null)
      if (cached?.items?.length) {
        return {
          configured: true,
          connected: true,
          ...cached,
          fromCache: true,
          error: err instanceof Error ? err.message : "github_notifications_error",
        }
      }
    }
    return {
      configured: true,
      connected: false,
      items: [],
      hasMore: false,
      error: err instanceof Error ? err.message : "github_notifications_error",
    }
  }
}

async function markNotificationRead(threadId) {
  if (!threadId) return { ok: false, error: "missing_id" }
  if (!token()) return { ok: false, error: "not_configured" }
  await ghRequest("PATCH", `/notifications/threads/${encodeURIComponent(String(threadId))}`)
  const login = await githubStore.readLatestLogin().catch(() => null)
  if (login) {
    const next = await patchInboxUnread(login, (n) =>
      n.id === String(threadId) ? { ...n, unread: false } : n,
    )
    return { ok: true, items: next.items }
  }
  cache.invalidate("github:inbox")
  return { ok: true, items: [] }
}

async function markAllNotificationsRead() {
  if (!token()) return { ok: false, error: "not_configured" }
  await ghRequest("PUT", "/notifications")
  const login = await githubStore.readLatestLogin().catch(() => null)
  if (login) {
    const next = await patchInboxUnread(login, (n) => ({ ...n, unread: false }))
    return { ok: true, items: next.items }
  }
  cache.invalidate("github:inbox")
  return { ok: true, items: [] }
}

async function fetchInbox() {
  const user = await gh("/user")
  const [notifications, search] = await Promise.all([
    fetchNotificationsList({ perPage: NOTIFICATIONS_PER_PAGE }),
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

  const notificationItems = notifications ?? []
  const inboxPayload = {
    items: notificationItems,
    hasMore: notificationItems.length >= NOTIFICATIONS_PER_PAGE,
    perPage: NOTIFICATIONS_PER_PAGE,
    savedAt: Date.now(),
  }
  await persistNotificationsInbox(user.login, inboxPayload).catch(() => {})

  return {
    login: user.login,
    avatarUrl: user.avatar_url,
    profile: mapProfile(user),
    notifications: notificationItems,
    pullRequests,
  }
}

function scheduleStatusBackgroundRefresh(options) {
  if (statusBackgroundRefresh) return
  statusBackgroundRefresh = fetchGitHubStatusFromApi(options)
    .catch(() => {})
    .finally(() => {
      statusBackgroundRefresh = null
    })
}

async function fetchGitHubStatusFromApi(options = {}) {
  const force = options.force === true
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
    profile: inbox.profile ?? null,
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

  await githubStore.writeStatusBundle(payload).catch(() => {})

  return payload
}

async function loadStatusFromStore(options = {}) {
  const row = await githubStore.readStatusWithMeta()
  if (!row?.payload?.login) return null

  const payload = githubStore.statusPayloadFromBundle(row.payload, {
    cachedAt: row.syncedAt,
  })
  if (!payload) return null

  if (options.includeInsights === true && !payload.insights) {
    const year =
      typeof options.year === "number" && Number.isFinite(options.year)
        ? Math.floor(options.year)
        : new Date().getFullYear()
    const ins = await githubStore.readSnapshotWithMeta(payload.login, `activity_insights:${year}`)
    if (ins?.payload) {
      payload.insights = ins.payload
    }
  }

  return syncTodayBreakdownWithContributions(payload, options.force === true)
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
      profile: null,
      notifications: [],
      pullRequests: [],
      contributions: null,
      todayBreakdown: null,
      message: "Add GITHUB_TOKEN to .env",
    }
  }

  if (!force) {
    const row = await githubStore.readStatusWithMeta()
    if (row?.payload?.login) {
      const age = row.syncedAt ? Date.now() - row.syncedAt : Number.POSITIVE_INFINITY
      if (age < STATUS_DB_STALE_MS) {
        const payload = await loadStatusFromStore(options)
        if (payload) {
          if (age >= INBOX_TTL_MS) {
            scheduleStatusBackgroundRefresh(options)
          }
          return payload
        }
      }
    }
  }

  try {
    return await fetchGitHubStatusFromApi(options)
  } catch (err) {
    const cached = await githubStore.readCachedStatus().catch(() => null)
    if (cached) return cached

    return {
      configured: true,
      connected: false,
      login: null,
      avatarUrl: null,
      profile: null,
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
  const to = `${year + 1}-01-01T00:00:00.000Z`
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
  const cacheKey = "github:insights:years:v2"
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

async function fetchReposCreatedInYear(login, year) {
  if (!login) return null
  const now = new Date()
  const end =
    year === now.getUTCFullYear()
      ? now.toISOString().slice(0, 10)
      : `${year}-12-31`
  const from = `${year}-01-01`
  const q = `user:${login} created:${from}..${end}`
  try {
    const data = await gh(
      `/search/repositories?q=${encodeURIComponent(q)}&per_page=1`,
    )
    return typeof data.total_count === "number" ? data.total_count : null
  } catch {
    return null
  }
}

async function loadReposCreatedStats(force) {
  const cacheKey = "github:insights:repos-created:v1"
  if (force) cache.invalidate(cacheKey)
  return cache.get(cacheKey, {
    ttlMs: INSIGHTS_TTL_MS,
    staleMs: INSIGHTS_STALE_MS,
    force,
    fetcher: async () => {
      const user = await gh("/user")
      const year = new Date().getFullYear()
      const priorYear = year - 1
      const [count, priorCount] = await Promise.all([
        fetchReposCreatedInYear(user.login, year),
        fetchReposCreatedInYear(user.login, priorYear),
      ])
      return {
        year,
        count,
        priorYear,
        priorCount,
        delta:
          count != null && priorCount != null ? count - priorCount : null,
      }
    },
  })
}

const REPO_PROFILE_TTL_MS = 24 * 60 * 60_000
const REPO_PROFILE_STALE_MS = 7 * 24 * 60 * 60_000
const REPO_PROFILE_CONCURRENCY = 6

function mapRepoProfile(data, nameWithOwner) {
  if (!data) return null
  const ownerType =
    data.owner?.type === "Organization" ? "organization" : "user"
  return {
    repo: nameWithOwner,
    description: data.description ?? null,
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    openIssues: data.open_issues_count ?? 0,
    ownerLogin: data.owner?.login ?? nameWithOwner.split("/")[0] ?? "",
    ownerType,
    ownerAvatarUrl: data.owner?.avatar_url ?? null,
    createdAt: data.created_at ?? null,
    pushedAt: data.pushed_at ?? null,
    updatedAt: data.updated_at ?? null,
    language: data.language ?? null,
    isFork: Boolean(data.fork),
    isArchived: Boolean(data.archived),
    isPrivate: Boolean(data.private),
  }
}

async function fetchRepoProfile(nameWithOwner) {
  const parts = String(nameWithOwner).split("/")
  if (parts.length < 2) return null
  const [owner, repo] = parts
  try {
    const data = await gh(`/repos/${owner}/${repo}`)
    return mapRepoProfile(data, nameWithOwner)
  } catch {
    return null
  }
}

async function loadRepoProfilesMap(names, force) {
  const unique = [...new Set(names.filter(Boolean))]
  if (!unique.length) return {}
  const cacheKey = `github:repo-profiles:v3:${unique.sort().join("|")}`
  if (force) cache.invalidate(cacheKey)
  return cache.get(cacheKey, {
    ttlMs: REPO_PROFILE_TTL_MS,
    staleMs: REPO_PROFILE_STALE_MS,
    force,
    fetcher: async () => {
      const results = new Array(unique.length)
      let index = 0
      async function worker() {
        while (index < unique.length) {
          const i = index++
          results[i] = await fetchRepoProfile(unique[i])
        }
      }
      const workers = Math.min(REPO_PROFILE_CONCURRENCY, unique.length)
      await Promise.all(Array.from({ length: workers }, () => worker()))
      const map = {}
      for (const row of results) {
        if (row?.repo) map[row.repo] = row
      }
      const login = await githubStore.readLatestLogin().catch(() => null)
      if (login) {
        await githubStore
          .writeSnapshot(login, `repo_profiles:${unique.sort().join("|").slice(0, 200)}`, map)
          .catch(() => {})
      }
      return map
    },
  })
}

async function loadRepoChartsForYear(year, force) {
  const cacheKey = `github:insights:repos:v2:${year}`
  if (force) cache.invalidate(cacheKey)
  return cache.get(cacheKey, {
    ttlMs: INSIGHTS_TTL_MS,
    staleMs: INSIGHTS_STALE_MS,
    force,
    fetcher: async () => {
      const range = yearContributionRangeIso(year)
      const repoTotals = range ? await fetchRepoTotalsForRange(range.from, range.to) : []
      const { months, series } = await fetchRepoMonthlySeries(year)
      const sliced = repoTotals.slice(0, 30)
      const profileMap = await loadRepoProfilesMap(
        sliced.map((row) => row.repo),
        force,
      )
      const repoCatalog = sliced.map((row) => ({
        ...row,
        profile: profileMap[row.repo] ?? null,
      }))
      return {
        repoTotals: sliced,
        repoCatalog,
        repoSeries: series,
        monthLabels: months,
      }
    },
  })
}

const WEEKLY_STACK_TOP = 7
const WEEKLY_STACK_VERSION = 5
const WEEKLY_STACK_CONCURRENCY = 5
const DAILY_STACK_DAYS = 45

function rollingWeekRangesLocal(days = 365) {
  const ranges = []
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const windowStart = new Date(end)
  windowStart.setDate(windowStart.getDate() - days)
  let cursor = new Date(windowStart)
  while (cursor < end) {
    const from = new Date(cursor)
    const weekEnd = new Date(cursor)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const cappedEnd = weekEnd > end ? end : weekEnd
    ranges.push({
      weekStart: localContributionDateKey(from),
      from: from.toISOString(),
      to: cappedEnd.toISOString(),
    })
    cursor = new Date(cappedEnd)
  }
  return ranges
}

function rollingDayRangesLocal(dayCount = DAILY_STACK_DAYS) {
  const ranges = []
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const windowStart = new Date(end)
  windowStart.setDate(windowStart.getDate() - dayCount)
  let cursor = new Date(windowStart)
  while (cursor < end) {
    const from = new Date(cursor)
    const dayEnd = new Date(cursor)
    dayEnd.setDate(dayEnd.getDate() + 1)
    ranges.push({
      weekStart: localContributionDateKey(from),
      from: from.toISOString(),
      to: dayEnd.toISOString(),
    })
    cursor = dayEnd
  }
  return ranges
}

/** Legend + bars use top N repos; everything else rolls into __other__ so stacks always sum to total. */
function packRepoStackBuckets(rawRows, topRepos, repoUrls) {
  const topSet = new Set(topRepos)
  return rawRows.map((row) => {
    const byTop = new Map()
    let other = 0
    for (const item of row.repos ?? []) {
      if (topSet.has(item.repo)) {
        byTop.set(item.repo, (byTop.get(item.repo) ?? 0) + item.count)
      } else {
        other += item.count
      }
    }
    const repos = topRepos
      .map((repo) => ({
        repo,
        url: repoUrls[repo] ?? `https://github.com/${repo}`,
        count: byTop.get(repo) ?? 0,
      }))
      .filter((r) => r.count > 0)
    if (other > 0) {
      repos.push({ repo: "__other__", url: "", count: other })
    }
    const stackTotal = repos.reduce((sum, r) => sum + r.count, 0)
    return {
      weekStart: row.weekStart,
      total: stackTotal,
      repos,
    }
  })
}

async function asyncPool(concurrency, items, fn) {
  const results = new Array(items.length)
  let index = 0
  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i], i)
    }
  }
  const workers = Math.max(1, Math.min(concurrency, items.length))
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

async function fetchRepoCommitsForRange(from, to) {
  const data = await ghGraphql(
    `query ($from: DateTime!, $to: DateTime!) {
      viewer {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar { totalContributions }
          ${REPO_COMMIT_FIELDS}
        }
      }
    }`,
    { from, to },
  )
  const col = data?.viewer?.contributionsCollection
  const repos = mergeContributionsByRepository([col?.commitContributionsByRepository])
  const listed = repos.reduce((sum, row) => sum + row.count, 0)
  return { target: listed, repos }
}

async function loadWeeklyRepoStack(force) {
  const cacheKey = "github:insights:weekly-stack:v5"
  if (force) cache.invalidate(cacheKey)
  return cache.get(cacheKey, {
    ttlMs: INSIGHTS_TTL_MS,
    staleMs: INSIGHTS_STALE_MS,
    force,
    fetcher: async () => {
      const ranges = rollingWeekRangesLocal(365)
      const fetched = await asyncPool(WEEKLY_STACK_CONCURRENCY, ranges, async (range) => {
        try {
          const { target, repos } = await fetchRepoCommitsForRange(range.from, range.to)
          return {
            weekStart: range.weekStart,
            total: target,
            repos,
          }
        } catch {
          return { weekStart: range.weekStart, total: 0, repos: [] }
        }
      })

      const totalsByRepo = new Map()
      const repoUrls = {}
      for (const week of fetched) {
        for (const row of week.repos) {
          totalsByRepo.set(row.repo, (totalsByRepo.get(row.repo) ?? 0) + row.count)
          if (!repoUrls[row.repo]) repoUrls[row.repo] = row.url
        }
      }

      const rankedRepos = [...totalsByRepo.entries()].sort((a, b) => b[1] - a[1])
      const topRepos = rankedRepos.slice(0, WEEKLY_STACK_TOP).map(([repo]) => repo)

      const weeks = packRepoStackBuckets(fetched, topRepos, repoUrls)

      const dayRanges = rollingDayRangesLocal(DAILY_STACK_DAYS)
      const dayFetched = await asyncPool(WEEKLY_STACK_CONCURRENCY, dayRanges, async (range) => {
        try {
          const { target, repos } = await fetchRepoCommitsForRange(range.from, range.to)
          return {
            weekStart: range.weekStart,
            total: target,
            repos,
          }
        } catch {
          return { weekStart: range.weekStart, total: 0, repos: [] }
        }
      })
      const days = packRepoStackBuckets(dayFetched, topRepos, repoUrls)

      return {
        stackVersion: WEEKLY_STACK_VERSION,
        topRepos,
        repoUrls,
        weeks,
        days,
      }
    },
  })
}

async function weeklyRepoStack(options = {}) {
  const force = options.force === true
  const configured = Boolean(token())
  if (!configured) {
    return {
      configured: false,
      connected: false,
      topRepos: [],
      repoUrls: {},
      weeks: [],
      days: [],
      message: "Add GITHUB_TOKEN to .env",
    }
  }

  if (!force) {
    const login = await githubStore.readLatestLogin().catch(() => null)
    const row = login
      ? await githubStore.readSnapshotWithMeta(login, "weekly_repo_stack")
      : null
    if (
      row?.payload?.weeks?.length &&
      row.payload.stackVersion === WEEKLY_STACK_VERSION
    ) {
      const age = row.syncedAt ? Date.now() - row.syncedAt : Number.POSITIVE_INFINITY
      if (age < INSIGHTS_STALE_MS) {
        return { ...row.payload, configured: true, connected: true, fromCache: true, cachedAt: row.syncedAt }
      }
    }
  }

  try {
    const payload = await loadWeeklyRepoStack(force)
    const result = {
      configured: true,
      connected: true,
      ...payload,
    }
    const login = await gh("/user")
      .then((u) => u?.login)
      .catch(() => githubStore.readLatestLogin())
    if (login) {
      await githubStore.writeSnapshot(login, "weekly_repo_stack", result).catch(() => {})
    }
    return result
  } catch (err) {
    const login = await githubStore.readLatestLogin().catch(() => null)
    const cached = login
      ? await githubStore.readSnapshot(login, "weekly_repo_stack").catch(() => null)
      : null
    if (cached?.weeks) {
      return { ...cached, fromCache: true }
    }
    return {
      configured: true,
      connected: false,
      topRepos: [],
      repoUrls: {},
      weeks: [],
      days: [],
      error: err instanceof Error ? err.message : "github_weekly_stack_error",
    }
  }
}

async function loadActivityInsights(options = {}) {
  const force = options.force === true
  const year =
    typeof options.year === "number" && Number.isFinite(options.year)
      ? Math.floor(options.year)
      : new Date().getFullYear()

  let years = []
  let charts = { repoTotals: [], repoCatalog: [], repoSeries: [], monthLabels: [] }
  let reposCreated = {
    year: new Date().getFullYear(),
    count: null,
    priorYear: new Date().getFullYear() - 1,
    priorCount: null,
    delta: null,
  }
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

  try {
    reposCreated = await loadReposCreatedStats(force)
  } catch {
    /* keep null counts */
  }

  const error = yearsError && chartsError ? `${yearsError}; ${chartsError}` : yearsError ?? chartsError

  return {
    years,
    chartYear: year,
    repoTotals: charts.repoTotals,
    repoCatalog: charts.repoCatalog?.length
      ? charts.repoCatalog
      : charts.repoTotals.map((row) => ({ ...row, profile: null })),
    repoSeries: charts.repoSeries,
    monthLabels: charts.monthLabels,
    reposCreated,
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
      repoCatalog: [],
      repoSeries: [],
      monthLabels: [],
      reposCreated: {
        year: new Date().getFullYear(),
        count: null,
        priorYear: new Date().getFullYear() - 1,
        priorCount: null,
        delta: null,
      },
      message: "Add GITHUB_TOKEN to .env",
    }
  }

  const year =
    typeof options.year === "number" && Number.isFinite(options.year)
      ? Math.floor(options.year)
      : new Date().getFullYear()

  if (!options.force) {
    const login = await githubStore.readLatestLogin().catch(() => null)
    const row = login
      ? await githubStore.readSnapshotWithMeta(login, `activity_insights:${year}`)
      : null
    if (row?.payload?.years) {
      const age = row.syncedAt ? Date.now() - row.syncedAt : Number.POSITIVE_INFINITY
      if (age < INSIGHTS_STALE_MS) {
        return {
          ...row.payload,
          configured: true,
          connected: true,
          fromCache: true,
          cachedAt: row.syncedAt,
        }
      }
    }
  }

  try {
    const payload = await loadActivityInsights({ force: options.force === true, year })
    const result = {
      configured: true,
      connected: true,
      ...payload,
    }
    const login = await gh("/user")
      .then((u) => u?.login)
      .catch(() => githubStore.readLatestLogin())
    if (login) {
      await githubStore
        .writeSnapshot(login, `activity_insights:${year}`, result)
        .catch(() => {})
    }
    return result
  } catch (err) {
    const login = await githubStore.readLatestLogin().catch(() => null)
    const cached = login
      ? await githubStore
          .readSnapshot(login, `activity_insights:${year}`)
          .catch(() => null)
      : null
    if (cached?.years) {
      return { ...cached, fromCache: true }
    }
    return {
      configured: true,
      connected: false,
      years: [],
      chartYear: year,
      repoTotals: [],
      repoCatalog: [],
      repoSeries: [],
      monthLabels: [],
      reposCreated: {
        year: new Date().getFullYear(),
        count: null,
        priorYear: new Date().getFullYear() - 1,
        priorCount: null,
        delta: null,
      },
      error: err instanceof Error ? err.message : "github_insights_error",
    }
  }
}

module.exports = {
  status,
  activityInsights,
  weeklyRepoStack,
  dayBreakdown,
  notificationsInbox,
  markNotificationRead,
  markAllNotificationsRead,
  repoPullRequests,
  pullRequestDetail,
  repoIssues,
  issueDetail,
  configured: () => Boolean(token()),
}
