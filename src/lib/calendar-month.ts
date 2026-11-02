import type { CalendarEvent } from "./calendar"
import { eventDisplayColor } from "./google-calendar-colors"

export type CalendarMonthCell = {
  inMonth: boolean
  date: string | null
  day: number | null
  isToday: boolean
  eventCount: number
  /** Up to 4 distinct event colors for the day */
  eventColors: string[]
}

export type CalendarMonth = {
  monthLabel: string
  cells: CalendarMonthCell[]
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0)
}

function localDateKeyFromDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function eventsByDay(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const key = e.start.slice(0, 10)
    const list = map.get(key) ?? []
    list.push(e)
    map.set(key, list)
  }
  return map
}

export function buildCalendarMonth(events: CalendarEvent[], viewMonth: Date): CalendarMonth {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  const byDay = eventsByDay(events)
  const todayKey = localDateKeyFromDate(new Date())

  const first = new Date(year, month, 1, 12)
  const last = new Date(year, month + 1, 0, 12)
  const startPad = (first.getDay() + 6) % 7
  const cells: CalendarMonthCell[] = []

  for (let i = 0; i < startPad; i++) {
    cells.push({
      inMonth: false,
      date: null,
      day: null,
      isToday: false,
      eventCount: 0,
      eventColors: [],
    })
  }

  for (let day = 1; day <= last.getDate(); day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const dayEvents = byDay.get(key) ?? []
    const eventColors = [
      ...new Set(dayEvents.map((e) => eventDisplayColor(e))),
    ].slice(0, 4)
    cells.push({
      inMonth: true,
      date: key,
      day,
      isToday: key === todayKey,
      eventCount: dayEvents.length,
      eventColors,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      inMonth: false,
      date: null,
      day: null,
      isToday: false,
      eventCount: 0,
      eventColors: [],
    })
  }

  return { monthLabel, cells }
}

export function dateInMonth(dateKey: string, viewMonth: Date) {
  const [y, m] = dateKey.split("-").map(Number)
  return y === viewMonth.getFullYear() && m === viewMonth.getMonth() + 1
}

export function defaultSelectedForMonth(viewMonth: Date, previous: string) {
  if (dateInMonth(previous, viewMonth)) return previous
  const todayKey = localDateKeyFromDate(new Date())
  if (dateInMonth(todayKey, viewMonth)) return todayKey
  const y = viewMonth.getFullYear()
  const m = String(viewMonth.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}-01`
}
