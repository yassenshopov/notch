export type CalendarSource = {
  id: string
  summary: string
  color: string
}

export type CalendarEvent = {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
  location: string | null
  joinUrl: string | null
  /** Google Calendar / event color (hex) */
  color?: string | null
  calendarId?: string | null
  calendarName?: string | null
}

export type CalendarSnapshot = {
  configured: boolean
  connected: boolean
  calendars?: CalendarSource[]
  events: CalendarEvent[]
  error?: string | null
}

const emptySnapshot: CalendarSnapshot = {
  configured: false,
  connected: false,
  calendars: [],
  events: [],
}

const DEFAULT_CALENDAR_COLOR = "#039be5"

export function eventCalendarId(event: CalendarEvent): string {
  if (event.calendarId) return event.calendarId
  const i = event.id.indexOf(":")
  return i >= 0 ? event.id.slice(0, i) : event.id
}

export function mergeCalendarSources(snapshot: CalendarSnapshot): CalendarSource[] {
  const byId = new Map<string, CalendarSource>()
  for (const cal of snapshot.calendars ?? []) {
    byId.set(cal.id, cal)
  }
  for (const event of snapshot.events) {
    const id = eventCalendarId(event)
    if (byId.has(id)) continue
    byId.set(id, {
      id,
      summary: event.calendarName?.trim() || id,
      color: event.color?.trim() || DEFAULT_CALENDAR_COLOR,
    })
  }
  return [...byId.values()].sort((a, b) =>
    a.summary.localeCompare(b.summary, undefined, { sensitivity: "base" }),
  )
}

export function filterEventsByHiddenCalendars(
  events: CalendarEvent[],
  hiddenCalendarIds: readonly string[],
): CalendarEvent[] {
  if (hiddenCalendarIds.length === 0) return events
  const hidden = new Set(hiddenCalendarIds)
  return events.filter((event) => !hidden.has(eventCalendarId(event)))
}

export async function fetchCalendarSnapshot(options?: {
  force?: boolean
}): Promise<CalendarSnapshot> {
  try {
    const snap = await window.notch?.calendar?.snapshot(options)
    return snap ?? emptySnapshot
  } catch {
    return { ...emptySnapshot, error: "calendar_error" }
  }
}

export async function connectGoogleCalendar(): Promise<CalendarSnapshot> {
  try {
    const snap = await window.notch?.calendar?.connect()
    return snap ?? emptySnapshot
  } catch {
    return { configured: true, connected: false, events: [], error: "calendar_connect_failed" }
  }
}

export async function disconnectGoogleCalendar(): Promise<CalendarSnapshot> {
  try {
    const snap = await window.notch?.calendar?.disconnect()
    return snap ?? emptySnapshot
  } catch {
    return { ...emptySnapshot, error: "calendar_error" }
  }
}

export function upcomingEvents(events: CalendarEvent[], limit = 3, now = Date.now()) {
  return events
    .filter((e) => new Date(e.end).getTime() >= now - 5 * 60 * 1000)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, limit)
}

export function nextEvent(events: CalendarEvent[], now = Date.now()) {
  return upcomingEvents(events, 1, now)[0] ?? null
}

export function eventsOnDay(events: CalendarEvent[], dayKey: string) {
  return events.filter((e) => e.start.slice(0, 10) === dayKey)
}

export async function openCalendarUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return
  await window.notch?.calendar?.openUrl(url)
}
