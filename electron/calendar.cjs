/**
 * Calendar — fetch & parse ICS feeds (Google Calendar secret URL, etc.)
 */
const settingsStore = require("./settings-store.cjs")

let cache = { at: 0, key: "", events: [] }
const CACHE_MS = 5 * 60 * 1000

function unfoldIcs(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  const out = []
  for (const line of lines) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (out.length) out[out.length - 1] += line.slice(1)
    } else {
      out.push(line)
    }
  }
  return out
}

function parseIcsDate(value, tzHint) {
  if (!value) return null
  const v = value.trim()
  if (/^\d{8}T\d{6}Z$/i.test(v)) {
    const y = v.slice(0, 4)
    const m = v.slice(4, 6)
    const d = v.slice(6, 8)
    const hh = v.slice(9, 11)
    const mm = v.slice(11, 13)
    const ss = v.slice(13, 15)
    return new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`).toISOString()
  }
  if (/^\d{8}$/i.test(v)) {
    const y = v.slice(0, 4)
    const m = v.slice(4, 6)
    const d = v.slice(6, 8)
    return new Date(`${y}-${m}-${d}T12:00:00`).toISOString()
  }
  if (/^\d{8}T\d{6}$/i.test(v)) {
    const y = v.slice(0, 4)
    const m = v.slice(4, 6)
    const d = v.slice(6, 8)
    const hh = v.slice(9, 11)
    const mm = v.slice(11, 13)
    const ss = v.slice(13, 15)
    const iso = `${y}-${m}-${d}T${hh}:${mm}:${ss}`
    if (tzHint) return new Date(iso).toISOString()
    return new Date(iso).toISOString()
  }
  const parsed = new Date(v)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function extractUrl(text) {
  if (!text) return null
  const match = String(text).match(/https?:\/\/[^\s<>"']+/i)
  return match ? match[0].replace(/[.,;]+$/, "") : null
}

function parseIcs(text) {
  const lines = unfoldIcs(text)
  const events = []
  let cur = null

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {}
      continue
    }
    if (line === "END:VEVENT") {
      if (cur?.start && cur?.summary) {
        events.push({
          id: cur.uid || `${cur.start}-${cur.summary}`,
          summary: cur.summary,
          start: cur.start,
          end: cur.end || cur.start,
          allDay: Boolean(cur.allDay),
          location: cur.location || null,
          joinUrl: extractUrl(cur.location) || extractUrl(cur.description) || null,
        })
      }
      cur = null
      continue
    }
    if (!cur) continue
    const idx = line.indexOf(":")
    if (idx < 0) continue
    const rawKey = line.slice(0, idx)
    const value = line.slice(idx + 1)
    const key = rawKey.split(";")[0].toUpperCase()

    switch (key) {
      case "UID":
        cur.uid = value
        break
      case "SUMMARY":
        cur.summary = value.replace(/\\n/g, " ").replace(/\\,/g, ",")
        break
      case "DESCRIPTION":
        cur.description = value.replace(/\\n/g, "\n")
        break
      case "LOCATION":
        cur.location = value.replace(/\\n/g, " ").replace(/\\,/g, ",")
        break
      case "DTSTART": {
        const allDay = rawKey.toUpperCase().includes("VALUE=DATE")
        cur.allDay = allDay
        cur.start = parseIcsDate(value, !allDay)
        break
      }
      case "DTEND": {
        const allDay = rawKey.toUpperCase().includes("VALUE=DATE")
        cur.end = parseIcsDate(value, !allDay)
        if (allDay) cur.allDay = true
        break
      }
      default:
        break
    }
  }

  return events.filter((e) => e.start)
}

async function fetchEvents(icsUrl) {
  const res = await fetch(icsUrl, {
    headers: { "User-Agent": "Notch/0.1 (desktop calendar)" },
  })
  if (!res.ok) throw new Error("calendar_fetch_failed")
  const text = await res.text()
  return parseIcs(text)
}

async function snapshot(options = {}) {
  const settings = settingsStore.readSettings()
  const icsUrl = String(settings.calendar?.icsUrl || "").trim()
  if (!icsUrl || !/^https?:\/\//i.test(icsUrl)) {
    return { configured: false, events: [], error: null }
  }

  const force = options.force === true
  const now = Date.now()
  if (!force && cache.key === icsUrl && now - cache.at < CACHE_MS) {
    return { configured: true, events: cache.events, error: null }
  }

  try {
    const events = await fetchEvents(icsUrl)
    const horizon = now + 14 * 24 * 60 * 60 * 1000
    const filtered = events
      .filter((e) => new Date(e.end).getTime() >= now - 60 * 60 * 1000)
      .filter((e) => new Date(e.start).getTime() <= horizon)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    cache = { at: now, key: icsUrl, events: filtered }
    return { configured: true, events: filtered, error: null }
  } catch (err) {
    return {
      configured: true,
      events: cache.key === icsUrl ? cache.events : [],
      error: err instanceof Error ? err.message : "calendar_error",
    }
  }
}

module.exports = {
  snapshot,
}
