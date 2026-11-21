const snapshotKv = require("./snapshot-kv.cjs")
const { createSmartCache } = require("./smart-cache.cjs")
const {
  getAuthContext,
  fetchEventsForRange,
  parseNum,
  formatModelLabel,
} = require("./cursor.cjs")

const cache = createSmartCache()
const INSIGHTS_TTL_MS = 6 * 60 * 60_000
const INSIGHTS_STALE_MS = 24 * 60 * 60_000
const YEAR_FETCH_MAX_PAGES = 40

function utcDateKey(d) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function calendarYearGridBounds(year) {
  const y = Number(year)
  const start = new Date(Date.UTC(y, 0, 1))
  const end = new Date(Date.UTC(y, 11, 31))
  const gridStart = new Date(start)
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay())
  const gridEnd = new Date(end)
  const endDow = gridEnd.getUTCDay()
  if (endDow < 6) gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - endDow))
  return { gridStart, gridEnd }
}

function isDateInCalendarYear(dateKey, year) {
  return dateKey >= `${year}-01-01` && dateKey <= `${year}-12-31`
}

function buildWeekColumns(byDate, chartYear) {
  const yearNum = Number(chartYear)
  const { gridStart, gridEnd } = calendarYearGridBounds(yearNum)
  const weeks = []
  const cursor = new Date(gridStart)

  while (cursor <= gridEnd) {
    const column = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor)
      d.setUTCDate(cursor.getUTCDate() + i)
      const key = utcDateKey(d)
      if (!isDateInCalendarYear(key, yearNum)) {
        column.push({ date: "", count: 0 })
        continue
      }
      const hit = byDate.get(key)
      column.push(
        hit
          ? {
              date: key,
              count: hit.events,
              spendCents: hit.cents,
            }
          : { date: key, count: 0, spendCents: 0 },
      )
    }
    weeks.push(column)
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  let total = 0
  let totalCents = 0
  for (const week of weeks) {
    for (const day of week) {
      if (!day?.date) continue
      total += day.count || 0
      totalCents += day.spendCents || 0
    }
  }

  return { weeks, total, totalCents }
}

function analyzeYearEvents(events, chartYear) {
  const byDate = new Map()
  const byModel = new Map()
  const byMonth = new Map()

  for (const ev of events) {
    const ts = parseNum(ev.timestamp)
    if (!ts) continue
    const d = new Date(ts)
    const key = utcDateKey(d)
    if (!isDateInCalendarYear(key, chartYear)) continue

    const cents = parseNum(ev.chargedCents ?? ev.tokenUsage?.totalCents)
    const prev = byDate.get(key) ?? { events: 0, cents: 0 }
    prev.events += 1
    prev.cents += cents
    byDate.set(key, prev)

    const model = String(ev.model ?? ev.modelIntent ?? "unknown")
    const row = byModel.get(model) ?? { model, label: formatModelLabel(model), events: 0, cents: 0 }
    row.events += 1
    row.cents += cents
    byModel.set(model, row)

    const month = key.slice(0, 7)
    const monthRow = byMonth.get(month) ?? { month, events: 0, cents: 0 }
    monthRow.events += 1
    monthRow.cents += cents
    byMonth.set(month, monthRow)
  }

  const { weeks, total, totalCents } = buildWeekColumns(byDate, chartYear)
  const topModels = [...byModel.values()].sort((a, b) => b.cents - a.cents).slice(0, 8)
  const monthly = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))

  return {
    year: chartYear,
    total,
    totalCents,
    weeks,
    topModels,
    monthly,
    eventsSampled: events.length,
  }
}

async function fetchYearPayload(auth, chartYear) {
  const startMs = Date.UTC(chartYear, 0, 1)
  const endMs = Date.UTC(chartYear, 11, 31, 23, 59, 59, 999)
  const { events, totalCount, sampled } = await fetchEventsForRange(
    auth.cookie,
    auth.me,
    startMs,
    endMs,
    YEAR_FETCH_MAX_PAGES,
  )
  const analyzed = analyzeYearEvents(events, chartYear)
  return {
    ...analyzed,
    eventsInYear: totalCount,
    eventsSampled: sampled,
    savedAt: Date.now(),
  }
}

function accountNamespace(accountKey) {
  return `cursor:${accountKey}`
}

async function readCachedYear(accountKey, chartYear) {
  return snapshotKv.readWithMeta(accountNamespace(accountKey), `activity:${chartYear}`)
}

async function listCachedYears(accountKey) {
  const row = await snapshotKv.readWithMeta(accountNamespace(accountKey), "years_index")
  const years = row?.payload?.years
  return Array.isArray(years) ? years.map(Number).filter(Number.isFinite) : []
}

async function writeYearsIndex(accountKey, years) {
  const unique = [...new Set(years)].sort((a, b) => b - a)
  await snapshotKv.write(accountNamespace(accountKey), "years_index", {
    years: unique,
    savedAt: Date.now(),
  })
  return unique
}

async function loadActivityInsightsCore(options = {}) {
  const chartYear = Number(options.year) || new Date().getFullYear()
  const force = options.force === true

  const auth = await getAuthContext()
  if (!auth) {
    return {
      configured: Boolean(process.env.CURSOR_SESSION_TOKEN || process.env.CURSOR_ACCESS_TOKEN),
      connected: false,
      ready: false,
      years: [],
      chartYear,
      weeks: [],
      totalEvents: 0,
      totalCents: 0,
      topModels: [],
      monthly: [],
      yearsData: [],
      error: "no_session",
    }
  }

  const cacheKey = `cursor:insights:${auth.accountKey}:${chartYear}`
  const cached = await readCachedYear(auth.accountKey, chartYear)

  if (!force && cached?.payload?.weeks?.length) {
    const years = await listCachedYears(auth.accountKey)
    const mergedYears = years.length ? years : [chartYear]
    return formatInsightsResponse(auth, chartYear, cached.payload, mergedYears, cached.syncedAt)
  }

  try {
    const payload = await cache.get(cacheKey, {
      ttlMs: INSIGHTS_TTL_MS,
      staleMs: INSIGHTS_STALE_MS,
      force,
      fetcher: () => fetchYearPayload(auth, chartYear),
    })

    await snapshotKv.write(accountNamespace(auth.accountKey), `activity:${chartYear}`, payload)
    const priorYears = await listCachedYears(auth.accountKey)
    const years = await writeYearsIndex(auth.accountKey, [chartYear, ...priorYears])

    const yearsData = []
    for (const y of years) {
      if (y === chartYear) {
        yearsData.push({
          year: y,
          total: payload.total,
          totalCents: payload.totalCents,
          weeks: payload.weeks,
        })
        continue
      }
      const snap = await snapshotKv.read(accountNamespace(auth.accountKey), `activity:${y}`)
      if (snap?.weeks) {
        yearsData.push({
          year: y,
          total: snap.total ?? 0,
          totalCents: snap.totalCents ?? 0,
          weeks: snap.weeks,
        })
      }
    }

    return formatInsightsResponse(auth, chartYear, payload, years, Date.now(), yearsData)
  } catch (err) {
    if (cached?.payload) {
      const years = await listCachedYears(auth.accountKey)
      return formatInsightsResponse(
        auth,
        chartYear,
        cached.payload,
        years.length ? years : [chartYear],
        cached.syncedAt,
        undefined,
        err instanceof Error ? err.message : "cursor_insights_error",
      )
    }
    return {
      configured: true,
      connected: true,
      ready: false,
      years: [chartYear],
      chartYear,
      weeks: [],
      totalEvents: 0,
      totalCents: 0,
      topModels: [],
      monthly: [],
      yearsData: [],
      error: err instanceof Error ? err.message : "cursor_insights_error",
    }
  }
}

function formatInsightsResponse(auth, chartYear, payload, years, syncedAt, yearsDataOverride, error) {
  const yearsData =
    yearsDataOverride ??
    years.map((y) =>
      y === chartYear
        ? {
            year: y,
            total: payload.total ?? 0,
            totalCents: payload.totalCents ?? 0,
            weeks: payload.weeks ?? [],
          }
        : null,
    ).filter(Boolean)

  return {
    configured: true,
    connected: true,
    ready: Boolean(payload?.weeks?.length),
    years: years.length ? years : [chartYear],
    chartYear,
    weeks: payload.weeks ?? [],
    days: flattenWeekDays(payload.weeks ?? []),
    totalEvents: payload.total ?? 0,
    totalCents: payload.totalCents ?? 0,
    topModels: payload.topModels ?? [],
    monthly: payload.monthly ?? [],
    yearsData,
    eventsInYear: payload.eventsInYear ?? null,
    eventsSampled: payload.eventsSampled ?? null,
    syncedAt: syncedAt ?? payload.savedAt ?? null,
    accountKey: auth.accountKey,
    error,
  }
}

function flattenWeekDays(weeks) {
  const out = []
  for (const week of weeks) {
    for (const day of week) {
      if (day?.date) {
        out.push({
          date: day.date,
          count: day.count ?? 0,
          spendCents: day.spendCents ?? 0,
        })
      }
    }
  }
  return out
}

async function getActivityInsights(options = {}) {
  return loadActivityInsightsCore(options)
}

module.exports = {
  getActivityInsights,
}