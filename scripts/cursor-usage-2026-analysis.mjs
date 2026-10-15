/**
 * One-off Cursor usage analysis for 2026. Uses same auth as electron/cursor.cjs.
 * Output: JSON summary to stdout (no tokens).
 */
import { createRequire } from "module"
import { readdir, readFile } from "fs/promises"
import path from "path"

const require = createRequire(import.meta.url)
const { resolveSessionCookie } = require("../electron/cursor.cjs")

const DASHBOARD = "https://cursor.com"
const YEAR_START = Date.UTC(2026, 0, 1)
const YEAR_END = Date.UTC(2026, 9, 15, 23, 59, 59, 999) // through Oct 15 2026
const PAGE_SIZE = 1000
const MAX_PAGES = 200

async function dashboardGet(cookie, pathname) {
  const res = await fetch(`${DASHBOARD}${pathname}`, {
    headers: { Cookie: `WorkosCursorSessionToken=${cookie}` },
  })
  if (!res.ok) throw new Error(`GET ${pathname} ${res.status}`)
  return res.json()
}

async function dashboardPost(cookie, pathname, body) {
  const res = await fetch(`${DASHBOARD}${pathname}`, {
    method: "POST",
    headers: {
      Cookie: `WorkosCursorSessionToken=${cookie}`,
      Origin: DASHBOARD,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`POST ${pathname} ${res.status}: ${t.slice(0, 120)}`)
  }
  return res.json()
}

function n(v) {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function inc(map, key, delta = 1) {
  map.set(key, (map.get(key) ?? 0) + delta)
}

function incObj(obj, key, delta = 1) {
  obj[key] = (obj[key] ?? 0) + delta
}

async function fetchAllEvents(cookie, me) {
  const base = {
    teamId: 0,
    startDate: String(YEAR_START),
    endDate: String(YEAR_END),
    userId: me.id,
  }
  const events = []
  let totalCount = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await dashboardPost(cookie, "/api/dashboard/get-filtered-usage-events", {
      ...base,
      page,
      pageSize: PAGE_SIZE,
    })
    totalCount = n(data.totalUsageEventsCount)
    const batch = data.usageEventsDisplay ?? []
    events.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return { events, totalCount }
}

async function fetchAggregated(cookie, me) {
  const body = {
    teamId: 0,
    startDate: String(YEAR_START),
    endDate: String(YEAR_END),
    userId: me.id,
  }
  try {
    return await dashboardPost(cookie, "/api/dashboard/get-aggregated-usage-events", body)
  } catch {
    return null
  }
}

function analyzeEvents(events) {
  const byDay = new Map()
  const byMonth = new Map()
  const byModel = new Map()
  const byKind = new Map()
  const byHour = new Map()
  const byWeekday = new Map()
  let chargedCents = 0
  let cursorTokenFeeCents = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheRead = 0
  let cacheWrite = 0
  let tokenBased = 0

  for (const ev of events) {
    const ts = n(ev.timestamp)
    const d = ts ? new Date(ts) : null
    const cents = n(ev.chargedCents ?? ev.tokenUsage?.totalCents)
    chargedCents += cents
    cursorTokenFeeCents += n(ev.cursorTokenFee)
    if (ev.isTokenBasedCall) tokenBased += 1

    const tu = ev.tokenUsage
    if (tu) {
      inputTokens += n(tu.inputTokens)
      outputTokens += n(tu.outputTokens)
      cacheRead += n(tu.cacheReadTokens)
      cacheWrite += n(tu.cacheWriteTokens)
    }

    const model = ev.model ?? ev.modelIntent ?? "unknown"
    const kind = ev.kind ?? "unknown"
    inc(byModel, model, cents)
    inc(byKind, kind, 1)

    if (d) {
      const day = d.toISOString().slice(0, 10)
      const month = day.slice(0, 7)
      inc(byDay, day, cents)
      inc(byMonth, month, cents)
      inc(byHour, d.getUTCHours(), 1)
      inc(byWeekday, d.getUTCDay(), 1)
    }
  }

  const topDays = [...byDay.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([day, cents]) => ({ day, cents, dollars: (cents / 100).toFixed(2) }))

  const models = [...byModel.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([model, cents]) => ({
      model,
      cents,
      dollars: (cents / 100).toFixed(2),
      sharePct: chargedCents ? ((cents / chargedCents) * 100).toFixed(1) : "0",
    }))

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const weekday = [...byWeekday.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([d, count]) => ({ day: weekdayNames[d], events: count }))

  const hours = [...byHour.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([h, count]) => ({ hourUtc: h, events: count }))

  const monthly = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, cents]) => ({ month, cents, dollars: (cents / 100).toFixed(2), events: 0 }))

  const kinds = Object.fromEntries([...byKind.entries()].sort((a, b) => b[1] - a[1]))

  return {
    eventCount: events.length,
    chargedCents,
    chargedDollars: (chargedCents / 100).toFixed(2),
    cursorTokenFeeCents,
    tokenBasedEvents: tokenBased,
    tokens: { inputTokens, outputTokens, cacheRead, cacheWrite },
    models,
    kinds,
    topDays,
    monthly,
    weekday,
    hours,
  }
}

async function analyzeTranscripts() {
  const dir = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    ".cursor",
    "projects",
    "c-Users-yasse-Documents-Github-Repos-notch",
    "agent-transcripts",
  )
  let files = []
  try {
    files = await readdir(dir)
  } catch {
    return { error: "no_transcripts_dir", dir }
  }

  const jsonl = files.filter((f) => f.endsWith(".jsonl"))
  let conversations2026 = 0
  let userMessages = 0
  let assistantMessages = 0
  const byMonth = {}
  let totalBytes = 0

  for (const file of jsonl) {
    const raw = await readFile(path.join(dir, file), "utf8")
    totalBytes += raw.length
    const lines = raw.split("\n").filter(Boolean)
    let in2026 = false
    for (const line of lines) {
      try {
        const row = JSON.parse(line)
        const ts = row.timestamp || row.createdAt || row.time
        if (ts) {
          const t = new Date(ts).getTime()
          if (t >= YEAR_START && t <= YEAR_END) in2026 = true
        }
        if (row.role === "user") userMessages += 1
        if (row.role === "assistant") assistantMessages += 1
      } catch {
        /* skip */
      }
    }
    const m = file.match(/^(\d{4}-\d{2})/)
    if (m) incObj(byMonth, m[1], 1)
    if (in2026 || file.includes("2026")) conversations2026 += 1
  }

  return {
    transcriptFiles: jsonl.length,
    approxConversations2026: conversations2026,
    userMessages,
    assistantMessages,
    totalMb: (totalBytes / (1024 * 1024)).toFixed(2),
    filesByMonthPrefix: byMonth,
  }
}

async function main() {
  const cookie = resolveSessionCookie()
  if (!cookie) {
    console.log(JSON.stringify({ error: "no_session" }, null, 2))
    process.exit(1)
  }

  const [me, summary, transcripts] = await Promise.all([
    dashboardGet(cookie, "/api/auth/me"),
    dashboardGet(cookie, "/api/usage-summary"),
    analyzeTranscripts(),
  ])

  const { events, totalCount } = await fetchAllEvents(cookie, me)
  const aggregated = await fetchAggregated(cookie, me)
  const analysis = analyzeEvents(events)

  const currentCycle = {
    membershipType: summary.membershipType,
    billingCycleStart: summary.billingCycleStart,
    billingCycleEnd: summary.billingCycleEnd,
    plan: summary.individualUsage?.plan ?? null,
    onDemand: summary.individualUsage?.onDemand ?? null,
  }

  const sampledComplete = events.length >= totalCount || events.length < PAGE_SIZE

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        window: { start: "2026-01-01", end: "2026-10-15" },
        user: { email: me.email, name: me.name, id: me.id },
        currentCycle,
        api: {
          totalEventsReported: totalCount,
          eventsFetched: events.length,
          fetchComplete: sampledComplete,
          aggregatedTotals: aggregated
            ? {
                totalCostCents: n(aggregated.totalCostCents),
                totalInputTokens: n(aggregated.totalInputTokens),
                totalOutputTokens: n(aggregated.totalOutputTokens),
                modelRows: (aggregated.aggregations ?? []).length,
              }
            : null,
        },
        ytd2026: analysis,
        localTranscripts: transcripts,
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
