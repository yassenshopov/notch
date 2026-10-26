import type { StravaCalendar, StravaCalendarCell } from "./strava"

export type StravaCalendarActivity = {
  id: number
  type: string
  startDate: string
}

function localDateKey(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function localDateKeyFromDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0)
}

export function canGoToNextMonth(viewMonth: Date, now = new Date()) {
  return (
    viewMonth.getFullYear() < now.getFullYear() ||
    (viewMonth.getFullYear() === now.getFullYear() && viewMonth.getMonth() < now.getMonth())
  )
}

export function earliestActivityMonth(activities: StravaCalendarActivity[]): Date | null {
  if (activities.length === 0) return null
  let min = new Date(activities[0].startDate)
  for (const a of activities) {
    const d = new Date(a.startDate)
    if (d < min) min = d
  }
  return startOfMonth(min)
}

export function canGoToPrevMonth(viewMonth: Date, activities: StravaCalendarActivity[]) {
  const earliest = earliestActivityMonth(activities)
  if (!earliest) return false
  return (
    viewMonth.getFullYear() > earliest.getFullYear() ||
    (viewMonth.getFullYear() === earliest.getFullYear() &&
      viewMonth.getMonth() > earliest.getMonth())
  )
}

export function buildStravaMonthCalendar(
  activities: StravaCalendarActivity[],
  viewMonth: Date,
): StravaCalendar {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })

  const byDay = new Map<string, StravaCalendarActivity[]>()
  for (const a of activities) {
    const key = localDateKey(a.startDate)
    const d = new Date(`${key}T12:00:00`)
    if (d.getFullYear() !== year || d.getMonth() !== month) continue
    const list = byDay.get(key) ?? []
    list.push(a)
    byDay.set(key, list)
  }

  const first = new Date(year, month, 1, 12)
  const last = new Date(year, month + 1, 0, 12)
  const startPad = (first.getDay() + 6) % 7
  const cells: StravaCalendarCell[] = []
  const todayKey = localDateKeyFromDate(new Date())

  for (let i = 0; i < startPad; i++) {
    cells.push({ inMonth: false, date: null, day: null, activities: [] })
  }

  for (let day = 1; day <= last.getDate(); day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const acts = byDay.get(key) ?? []
    cells.push({
      inMonth: true,
      date: key,
      day,
      activities: acts.map((a) => ({ id: a.id, type: a.type })),
      isToday: key === todayKey,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ inMonth: false, date: null, day: null, activities: [] })
  }

  const monthActivities = activities.filter((a) => {
    const d = new Date(a.startDate)
    return d.getFullYear() === year && d.getMonth() === month
  })

  const weekRows = []
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7)
    const active = row.some((c) => c.inMonth && c.activities.length > 0)
    weekRows.push({ active })
  }

  return {
    monthLabel,
    cells,
    weekRows,
    monthActivityCount: monthActivities.length,
  }
}
