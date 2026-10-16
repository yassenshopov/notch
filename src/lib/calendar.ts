export type CalendarEvent = {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
  location: string | null
  joinUrl: string | null
}

export type CalendarSnapshot = {
  configured: boolean
  events: CalendarEvent[]
  error?: string | null
}

export async function fetchCalendarSnapshot(options?: {
  force?: boolean
}): Promise<CalendarSnapshot> {
  try {
    const snap = await window.notch?.calendar?.snapshot(options)
    return (
      snap ?? {
        configured: false,
        events: [],
      }
    )
  } catch {
    return { configured: false, events: [], error: "calendar_error" }
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
