const { createSmartCache } = require("./smart-cache.cjs")

const API = "https://api.github.com"
const cache = createSmartCache()

const INBOX_TTL_MS = 60_000
const INBOX_STALE_MS = 3 * 60_000
const HEATMAP_TTL_MS = 45 * 60_000
const HEATMAP_STALE_MS = 6 * 60 * 60_000

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

async function ghGraphql(query) {
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
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

    return {
      configured: true,
      connected: true,
      login: inbox.login,
      avatarUrl: inbox.avatarUrl,
      notifications: inbox.notifications,
      pullRequests: inbox.pullRequests,
      contributions: normalizeContributions(contributions),
    }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      login: null,
      avatarUrl: null,
      notifications: [],
      pullRequests: [],
      contributions: null,
      error: err instanceof Error ? err.message : "github_error",
    }
  }
}

module.exports = { status, configured: () => Boolean(token()) }
