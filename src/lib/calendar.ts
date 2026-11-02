import type { ClockFormat } from "../config/settings"
import { formatClock } from "./utils"

export type CalendarSource = {
  id: string
  summary: string
  color: string
}

export type CalendarEventAttendee = {
  email: string
  name: string | null
  optional: boolean
  responseStatus: string | null
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
  description?: string | null
  htmlLink?: string | null
  organizerName?: string | null
  organizerEmail?: string | null
  attendees?: CalendarEventAttendee[]
  status?: string | null
  visibility?: string | null
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

const ATTENDEE_STATUS_LABEL: Record<string, string> = {
  accepted: "Yes",
  declined: "No",
  tentative: "Maybe",
  needsAction: "Awaiting",
}

export function attendeeStatusLabel(status: string | null | undefined) {
  if (!status) return "Invited"
  return ATTENDEE_STATUS_LABEL[status] ?? status
}

export function formatEventSchedule(event: CalendarEvent, clockFormat: ClockFormat): string {
  if (event.allDay) {
    const startKey = event.start.slice(0, 10)
    const endKey = event.end.slice(0, 10)
    const start = new Date(`${startKey}T12:00:00`)
    const endExclusive = new Date(`${endKey}T12:00:00`)
    const endInclusive = new Date(endExclusive)
    endInclusive.setDate(endInclusive.getDate() - 1)
    const fmt: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
    if (endExclusive.getTime() <= start.getTime() + 86400000) {
      return start.toLocaleDateString(undefined, fmt)
    }
    const left = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    const right = endInclusive.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    return `${left} – ${right}`
  }

  const start = new Date(event.start)
  const end = new Date(event.end)
  const sameDay = event.start.slice(0, 10) === event.end.slice(0, 10)
  const dateFmt: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }
  const timeRange = `${formatClock(event.start, clockFormat)} – ${formatClock(event.end, clockFormat)}`
  if (sameDay) {
    return `${start.toLocaleDateString(undefined, dateFmt)} · ${timeRange}`
  }
  const left = `${start.toLocaleDateString(undefined, dateFmt)} · ${formatClock(event.start, clockFormat)}`
  const right = `${end.toLocaleDateString(undefined, dateFmt)} · ${formatClock(event.end, clockFormat)}`
  return `${left} – ${right}`
}

export function mapsUrlForLocation(location: string) {
  const q = location.trim()
  if (!q) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}
