const { spawnSync } = require("child_process")
const path = require("path")
const os = require("os")

const DASHBOARD_ORIGIN = "https://cursor.com"
const API_ORIGIN = "https://api.cursor.com"
const FILTERED_PAGE_SIZE = 1000
const FILTERED_MAX_PAGES = 6

/** @returns {string | null} */
function stateDbPath() {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA
    if (!appData) return null
    return path.join(appData, "Cursor", "User", "globalStorage", "state.vscdb")
  }
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Cursor",
      "User",
      "globalStorage",
      "state.vscdb",
    )
  }
  return path.join(os.homedir(), ".config", "Cursor", "User", "globalStorage", "state.vscdb")
}

const READ_TOKEN_PY = `import sqlite3,sys
db=sys.argv[1]
con=sqlite3.connect(f"file:{db}?mode=ro", uri=True)
row=con.execute("SELECT value FROM ItemTable WHERE key='cursorAuth/accessToken'").fetchone()
con.close()
if row:
    print(row[0], end="")
`

/** @returns {string | null} */
function readAccessTokenFromStateDb() {
  const dbPath = stateDbPath()
  if (!dbPath) return null

  const runners = [
    ["python", ["-c", READ_TOKEN_PY, dbPath]],
    ["py", ["-3", "-c", READ_TOKEN_PY, dbPath]],
    ["python3", ["-c", READ_TOKEN_PY, dbPath]],
  ]

  for (const [cmd, args] of runners) {
    const out = spawnSync(cmd, args, {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    })
    if (out.status === 0 && out.stdout?.trim()) {
      return out.stdout.trim()
    }
  }
  return null
}

/** @param {string} jwt */
function subFromJwt(jwt) {
  const seg = jwt.split(".")[1]
  if (!seg) return null
  const padded = seg.replace(/-/g, "+").replace(/_/g, "/")
  const json = Buffer.from(padded, "base64").toString("utf8")
  const payload = JSON.parse(json)
  return typeof payload.sub === "string" ? payload.sub : null
}

/** @returns {string | null} */
function resolveSessionCookie() {
  const override = process.env.CURSOR_SESSION_TOKEN?.trim()
  if (override) {
    if (override.includes("%3A%3A") || override.includes("::")) {
      return override.includes("%") ? override : encodeURIComponent(override)
    }
    const sub = subFromJwt(override)
    if (sub) return encodeURIComponent(`${sub}::${override}`)
  }

  const access = process.env.CURSOR_ACCESS_TOKEN?.trim() || readAccessTokenFromStateDb()
  if (!access) return null
  const sub = subFromJwt(access)
  if (!sub) return null
  return encodeURIComponent(`${sub}::${access}`)
}

function apiKeyAuthHeader() {
  const key = process.env.CURSOR_API_KEY?.trim()
  if (!key) return null
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`
}

async function dashboardGet(cookie, pathname) {
  const res = await fetch(`${DASHBOARD_ORIGIN}${pathname}`, {
    headers: { Cookie: `WorkosCursorSessionToken=${cookie}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`cursor_dashboard_${res.status}:${body.slice(0, 200)}`)
  }
  return res.json()
}

async function dashboardPost(cookie, pathname, body) {
  const res = await fetch(`${DASHBOARD_ORIGIN}${pathname}`, {
    method: "POST",
    headers: {
      Cookie: `WorkosCursorSessionToken=${cookie}`,
      Origin: DASHBOARD_ORIGIN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`cursor_dashboard_${res.status}:${text.slice(0, 200)}`)
  }
  return res.json()
}

function usageWindowBody(me, cycleStart, cycleEnd) {
  return {
    teamId: 0,
    startDate: String(new Date(cycleStart).getTime()),
    endDate: String(new Date(cycleEnd).getTime()),
    userId: me.id,
  }
}

function parseNum(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatModelLabel(id) {
  return id
    .split("-")
    .map((part) => {
      if (/^\d/.test(part) || part === "2.5") return part
      if (part.length <= 3) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(" ")
}

async function fetchModelAggregations(cookie, me, cycleStart, cycleEnd) {
  try {
    const data = await dashboardPost(
      cookie,
      "/api/dashboard/get-aggregated-usage-events",
      usageWindowBody(me, cycleStart, cycleEnd),
    )
    const rows = (data.aggregations ?? [])
      .map((row) => ({
        model: row.modelIntent ?? "unknown",
        label: formatModelLabel(String(row.modelIntent ?? "unknown")),
        inputTokens: parseNum(row.inputTokens),
        outputTokens: parseNum(row.outputTokens),
        cacheReadTokens: parseNum(row.cacheReadTokens),
        totalCents: parseNum(row.totalCents),
      }))
      .sort((a, b) => b.totalCents - a.totalCents)

    return {
      models: rows.slice(0, 8),
      totals: {
        inputTokens: parseNum(data.totalInputTokens),
        outputTokens: parseNum(data.totalOutputTokens),
        cacheReadTokens: parseNum(data.totalCacheReadTokens),
        costCents: parseNum(data.totalCostCents),
      },
    }
  } catch {
    return { models: [], totals: null }
  }
}

async function fetchFilteredEvents(cookie, me, cycleStart, cycleEnd) {
  const base = usageWindowBody(me, cycleStart, cycleEnd)
  const events = []
  let totalCount = 0

  for (let page = 1; page <= FILTERED_MAX_PAGES; page += 1) {
    const data = await dashboardPost(cookie, "/api/dashboard/get-filtered-usage-events", {
      ...base,
      page,
      pageSize: FILTERED_PAGE_SIZE,
    })
    totalCount = parseNum(data.totalUsageEventsCount)
    const batch = data.usageEventsDisplay ?? []
    events.push(...batch)
    if (batch.length < FILTERED_PAGE_SIZE) break
  }

  return { events, totalCount, sampled: events.length }
}

function bucketDailyCents(events) {
  const byDay = new Map()
  for (const ev of events) {
    const ms = parseNum(ev.timestamp)
    if (!ms) continue
    const d = new Date(ms)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const cents = parseNum(ev.chargedCents ?? ev.tokenUsage?.totalCents)
    byDay.set(key, (byDay.get(key) ?? 0) + cents)
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, value]) => ({ time, value }))
}

function mapRecentEvents(events, limit = 6) {
  return events.slice(0, limit).map((ev) => ({
    timestamp: parseNum(ev.timestamp),
    model: ev.model ?? "unknown",
    label: formatModelLabel(String(ev.model ?? "unknown")),
    chargedCents: parseNum(ev.chargedCents ?? ev.tokenUsage?.totalCents),
    kind: ev.kind ?? null,
  }))
}

async function fetchHardLimit(cookie, me, cycleStart, cycleEnd) {
  try {
    const data = await dashboardPost(
      cookie,
      "/api/dashboard/get-hard-limit",
      usageWindowBody(me, cycleStart, cycleEnd),
    )
    return { overageBlocked: Boolean(data.noUsageBasedAllowed) }
  } catch {
    return { overageBlocked: null }
  }
}

async function fetchCloudAgents() {
  const auth = apiKeyAuthHeader()
  if (!auth) {
    return { configured: false, agents: [], apiKeyName: null }
  }

  try {
    const [meRes, agentsRes] = await Promise.all([
      fetch(`${API_ORIGIN}/v1/me`, { headers: { Authorization: auth } }),
      fetch(`${API_ORIGIN}/v1/agents?limit=5`, { headers: { Authorization: auth } }),
    ])

    const apiKeyName = meRes.ok ? (await meRes.json()).apiKeyName ?? null : null
    if (!agentsRes.ok) {
      return { configured: true, agents: [], apiKeyName }
    }

    const data = await agentsRes.json()
    const agents = (data.items ?? []).map((a) => ({
      id: a.id,
      name: a.name ?? "Agent",
      status: a.status ?? "UNKNOWN",
      url: a.url ?? null,
      updatedAt: a.updatedAt ?? null,
    }))

    const active = agents.filter((a) => a.status === "ACTIVE" || a.status === "RUNNING").length
    return { configured: true, agents, apiKeyName, activeCount: active }
  } catch {
    return { configured: Boolean(auth), agents: [], apiKeyName: null }
  }
}

function buildPlanPayload(summary) {
  const plan = summary.individualUsage?.plan ?? null
  const onDemand = summary.individualUsage?.onDemand ?? null
  const cycleEnd = summary.billingCycleEnd ?? null
  let daysLeft = null
  if (cycleEnd) {
    const end = new Date(cycleEnd).getTime()
    daysLeft = Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)))
  }

  return {
    billing: {
      cycleStart: summary.billingCycleStart ?? null,
      cycleEnd,
      membershipType: summary.membershipType ?? null,
      isUnlimited: Boolean(summary.isUnlimited),
      daysLeft,
    },
    usage: plan
      ? {
          used: plan.used ?? 0,
          limit: plan.limit ?? 0,
          remaining: plan.remaining ?? 0,
          breakdown: plan.breakdown ?? null,
          totalPercentUsed: plan.totalPercentUsed ?? 0,
          autoPercentUsed: plan.autoPercentUsed ?? 0,
          apiPercentUsed: plan.apiPercentUsed ?? 0,
          enabled: Boolean(plan.enabled),
        }
      : null,
    onDemand: onDemand
      ? {
          enabled: Boolean(onDemand.enabled),
          used: onDemand.used ?? 0,
          limit: onDemand.limit,
          remaining: onDemand.remaining,
        }
      : null,
    messages: {
      auto: summary.autoModelSelectedDisplayMessage ?? null,
      api: summary.namedModelSelectedDisplayMessage ?? null,
    },
  }
}

async function getUsageSummary(options = {}) {
  const detailed = options.detailed !== false
  const cookie = resolveSessionCookie()
  if (!cookie) {
    return {
      connected: false,
      configured: Boolean(process.env.CURSOR_SESSION_TOKEN || process.env.CURSOR_ACCESS_TOKEN),
      error: "no_session",
      message:
        "Sign in to the Cursor desktop app on this machine (or set CURSOR_SESSION_TOKEN in .env).",
    }
  }

  try {
    const [me, summary, cloud] = await Promise.all([
      dashboardGet(cookie, "/api/auth/me"),
      dashboardGet(cookie, "/api/usage-summary"),
      detailed ? fetchCloudAgents() : Promise.resolve(null),
    ])

    const cycleStart = summary.billingCycleStart ?? null
    const cycleEnd = summary.billingCycleEnd ?? null
    const core = buildPlanPayload(summary)

    let limits = { overageBlocked: null }
    let analytics = null
    if (detailed && cycleStart && cycleEnd) {
      const [aggregations, limitData, filtered] = await Promise.all([
        fetchModelAggregations(cookie, me, cycleStart, cycleEnd),
        fetchHardLimit(cookie, me, cycleStart, cycleEnd),
        fetchFilteredEvents(cookie, me, cycleStart, cycleEnd).catch(() => ({
          events: [],
          totalCount: 0,
          sampled: 0,
        })),
      ])
      limits = limitData
      analytics = {
        models: aggregations.models,
        tokenTotals: aggregations.totals,
        dailySpend: bucketDailyCents(filtered.events),
        recentEvents: mapRecentEvents(filtered.events),
        eventsInCycle: filtered.totalCount,
        eventsSampled: filtered.sampled,
      }
    }

    return {
      connected: true,
      configured: true,
      user: {
        email: me.email ?? null,
        name: me.name ?? null,
      },
      billing: core.billing,
      usage: core.usage,
      onDemand: core.onDemand,
      messages: core.messages,
      limits,
      analytics,
      cloud: cloud ?? undefined,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "cursor_error"
    const needsAuth = message.includes("401") || message.includes("not_authenticated")
    return {
      connected: false,
      configured: true,
      error: needsAuth ? "session_expired" : "cursor_error",
      message: needsAuth
        ? "Cursor session expired — sign in again in the Cursor app."
        : message,
    }
  }
}

module.exports = {
  getUsageSummary,
  resolveSessionCookie,
}
