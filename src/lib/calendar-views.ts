import type { CalendarEvent } from "./calendar"
import { eventsOnDay } from "./calendar"
import { startOfMonth } from "./calendar-month"

export type CalendarViewMode = "month" | "week" | "day"

export function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  return d
}

export function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function dateKeyFromDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function weekDays(anchor: Date) {
  const start = startOfWeek(anchor)
  const out = []
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i)
    out.push({
      date: dateKeyFromDate(d),
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      dom: d.getDate(),
      isToday: dateKeyFromDate(new Date()) === dateKeyFromDate(d),
    })
  }
  return out
}

export function eventsForDay(events: CalendarEvent[], dayKey: string) {
  return eventsOnDay(events, dayKey).sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  )
}

export function timedEventsForDay(events: CalendarEvent[], dayKey: string) {
  return eventsForDay(events, dayKey).filter((e) => !e.allDay)
}

export function allDayEventsForDay(events: CalendarEvent[], dayKey: string) {
  return eventsForDay(events, dayKey).filter((e) => e.allDay)
}

const GRID_START_HOUR = 6
const GRID_END_HOUR = 23
export const CALENDAR_HOUR_HEIGHT_PX = 48

export function gridHours() {
  const out: number[] = []
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) out.push(h)
  return out
}

/** Y offset (px) for the current-time indicator in the time grid, or null if outside visible hours. */
export function nowLineTopPx(now: Date) {
  const gridStartMin = GRID_START_HOUR * 60
  const gridEndMin = (GRID_END_HOUR + 1) * 60
  const min = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  if (min < gridStartMin || min > gridEndMin) return null
  const pxPerMin = CALENDAR_HOUR_HEIGHT_PX / 60
  return (min - gridStartMin) * pxPerMin
}

export function minutesFromMidnight(iso: string) {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

export type TimedBlock = {
  event: CalendarEvent
  topPx: number
  heightPx: number
  startMin: number
  endMin: number
}

export type TimedBlockLayout = TimedBlock & {
  column: number
  columnCount: number
}

function blockRange(block: TimedBlock) {
  return { start: block.topPx, end: block.topPx + block.heightPx }
}

function blocksOverlap(a: TimedBlock, b: TimedBlock) {
  const ra = blockRange(a)
  const rb = blockRange(b)
  return ra.start < rb.end - 0.5 && rb.start < ra.end - 0.5
}

export function layoutTimedBlocks(events: CalendarEvent[], dayKey: string): TimedBlock[] {
  const gridStartMin = GRID_START_HOUR * 60
  const gridEndMin = (GRID_END_HOUR + 1) * 60
  const pxPerMin = CALENDAR_HOUR_HEIGHT_PX / 60

  return timedEventsForDay(events, dayKey)
    .map((event) => {
      const startMin = minutesFromMidnight(event.start)
      const endMin = Math.max(startMin + 15, minutesFromMidnight(event.end))
      const clampStart = Math.max(startMin, gridStartMin)
      const clampEnd = Math.min(endMin, gridEndMin)
      if (clampEnd <= gridStartMin || clampStart >= gridEndMin) return null
      const topPx = (clampStart - gridStartMin) * pxPerMin
      const heightPx = Math.max(18, (clampEnd - clampStart) * pxPerMin)
      return { event, topPx, heightPx, startMin: clampStart, endMin: clampEnd }
    })
    .filter((b): b is TimedBlock => b !== null)
}

/** Side-by-side columns for overlapping events (week/day time grid). */
export function layoutTimedBlocksColumns(
  events: CalendarEvent[],
  dayKey: string,
): TimedBlockLayout[] {
  const blocks = layoutTimedBlocks(events, dayKey).sort(
    (a, b) => a.topPx - b.topPx || b.heightPx - a.heightPx,
  )

  const columns: TimedBlock[][] = []
  for (const block of blocks) {
    let placed = false
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c]
      const last = col[col.length - 1]
      if (last.topPx + last.heightPx <= block.topPx + 0.5) {
        col.push(block)
        placed = true
        break
      }
    }
    if (!placed) columns.push([block])
  }

  const columnIndex = new Map<TimedBlock, number>()
  columns.forEach((col, i) => {
    for (const b of col) columnIndex.set(b, i)
  })

  return blocks.map((block) => {
    const overlapping = blocks.filter((b) => blocksOverlap(b, block))
    const columnCount = Math.max(1, ...overlapping.map((b) => (columnIndex.get(b) ?? 0) + 1))
    return {
      ...block,
      column: columnIndex.get(block) ?? 0,
      columnCount,
    }
  })
}

export function timedBlockStyle(layout: TimedBlockLayout) {
  const gap = 2
  const widthPct = 100 / layout.columnCount
  const leftPct = layout.column * widthPct
  return {
    top: layout.topPx,
    height: layout.heightPx,
    left: `calc(${leftPct}% + ${gap / 2}px)`,
    width: `calc(${widthPct}% - ${gap}px)`,
  }
}

export function shiftAnchor(mode: CalendarViewMode, anchor: Date, delta: number) {
  if (mode === "month") {
    return startOfMonth(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1))
  }
  if (mode === "week") {
    return addDays(anchor, delta * 7)
  }
  return addDays(anchor, delta)
}

export function anchorLabel(mode: CalendarViewMode, anchor: Date) {
  if (mode === "month") {
    return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  }
  if (mode === "week") {
    const days = weekDays(anchor)
    const a = new Date(days[0].date + "T12:00:00")
    const b = new Date(days[6].date + "T12:00:00")
    const sameYear = a.getFullYear() === b.getFullYear()
    const left = a.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    })
    const right = b.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    return `${left} – ${right}`
  }
  return anchor.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}
