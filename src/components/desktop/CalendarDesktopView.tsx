import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { updateSettings, useSettings } from "../../config/settings-store"
import type { ClockFormat } from "../../config/settings"
import type { CalendarEvent, CalendarSnapshot } from "../../lib/calendar"
import {
  filterEventsByHiddenCalendars,
  mergeCalendarSources,
} from "../../lib/calendar"
import {
  buildCalendarMonth,
  defaultSelectedForMonth,
  startOfMonth,
} from "../../lib/calendar-month"
import {
  allDayEventsForDay,
  anchorLabel,
  CALENDAR_HOUR_HEIGHT_PX,
  dateKeyFromDate,
  eventsForDay,
  gridHours,
  layoutTimedBlocksColumns,
  nowLineTopPx,
  shiftAnchor,
  startOfWeek,
  weekDays,
  type CalendarViewMode,
} from "../../lib/calendar-views"
import { cn, formatClock } from "../../lib/utils"
import { CalendarEventRow } from "../CalendarEventRow"
import { SegmentedControl } from "../SegmentedControl"
import { CalendarSourceList } from "./CalendarSourceList"
import { CalendarNowLine } from "./CalendarNowLine"
import { TimedEventBlock } from "./TimedEventBlock"

function scrollTimeGridToNow(container: HTMLDivElement | null) {
  if (!container) return
  const top = nowLineTopPx(new Date())
  if (top == null) return
  container.scrollTo({
    top: Math.max(0, top - container.clientHeight * 0.3),
    behavior: "smooth",
  })
}

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

type Props = {
  snapshot: CalendarSnapshot
  clockFormat: ClockFormat
  refreshing?: boolean
  onRefresh?: () => void
  headerActions?: ReactNode
}

export function CalendarDesktopView({
  snapshot,
  clockFormat,
  refreshing,
  onRefresh,
  headerActions,
}: Props) {
  const settings = useSettings()
  const hiddenIds = settings.calendar.hiddenCalendarIds ?? []
  const [mode, setMode] = useState<CalendarViewMode>("month")
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => dateKeyFromDate(new Date()))
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null)

  const calendars = useMemo(() => mergeCalendarSources(snapshot), [snapshot])
  const events = useMemo(
    () => filterEventsByHiddenCalendars(snapshot.events, hiddenIds),
    [snapshot.events, hiddenIds],
  )

  const toggleCalendar = (calendarId: string) => {
    const hidden = new Set(hiddenIds)
    if (hidden.has(calendarId)) hidden.delete(calendarId)
    else hidden.add(calendarId)
    void updateSettings({
      calendar: { ...settings.calendar, hiddenCalendarIds: [...hidden] },
    })
  }

  const month = useMemo(
    () => (mode === "month" ? buildCalendarMonth(events, anchor) : null),
    [events, anchor, mode],
  )

  const week = useMemo(() => (mode === "week" ? weekDays(anchor) : null), [anchor, mode])

  const goToday = () => {
    const now = new Date()
    setAnchor(mode === "month" ? startOfMonth(now) : mode === "week" ? startOfWeek(now) : now)
    setSelected(dateKeyFromDate(now))
  }

  const shift = (delta: number) => {
    setAnchor((a) => {
      const next = shiftAnchor(mode, a, delta)
      if (mode === "month") {
        setSelected((prev) => defaultSelectedForMonth(next, prev))
      } else if (mode === "day") {
        setSelected(dateKeyFromDate(next))
      }
      return next
    })
  }

  const hours = gridHours()
  const gridHeight = hours.length * CALENDAR_HOUR_HEIGHT_PX

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="rounded-full border border-black/10 px-3 py-1.5 text-[12px] font-semibold hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            Today
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => shift(-1)}
              className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => shift(1)}
              className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <h1 className="text-[20px] font-semibold tracking-tight">{anchorLabel(mode, anchor)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            variant="bordered"
            value={mode}
            capitalize
            options={[
              { value: "month", label: "month" },
              { value: "week", label: "week" },
              { value: "day", label: "day" },
            ]}
            onChange={(v) => {
              setMode(v)
              if (v === "month") setAnchor(startOfMonth(new Date(selected + "T12:00:00")))
              if (v === "week") setAnchor(startOfWeek(new Date(selected + "T12:00:00")))
              if (v === "day") setAnchor(new Date(selected + "T12:00:00"))
            }}
          />
          {onRefresh ? (
            <button
              type="button"
              onClick={() => onRefresh()}
              className="rounded-full px-3 py-1.5 text-[12px] font-medium text-black/45 hover:bg-black/5 dark:text-white/45"
            >
              {refreshing ? "…" : "Refresh"}
            </button>
          ) : null}
          {headerActions}
        </div>
      </div>

      {snapshot.error ? <p className="text-[12px] text-red-400">{snapshot.error}</p> : null}

      <div className="flex min-h-0 flex-1 gap-4">
        <aside className="notch-scroll w-[220px] shrink-0 overflow-y-auto rounded-2xl border border-black/8 bg-white/40 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
            My calendars
          </p>
          <CalendarSourceList
            calendars={calendars}
            hiddenIds={hiddenIds}
            onToggle={toggleCalendar}
          />
        </aside>

        <div className="min-h-0 min-w-0 flex-1">
        <div className="min-h-[480px] overflow-hidden rounded-2xl border border-black/8 bg-white/50 dark:border-white/10 dark:bg-white/[0.03]">
          {mode === "month" && month ? (
            <MonthGrid
              month={month}
              events={events}
              selected={selected}
              clockFormat={clockFormat}
              onSelectDay={setSelected}
              onSelectEvent={(_id, day) => {
                setSelected(day)
              }}
            />
          ) : null}
          {mode === "week" && week ? (
            <WeekGrid
              week={week}
              events={events}
              selected={selected}
              clockFormat={clockFormat}
              hours={hours}
              gridHeight={gridHeight}
              onSelectDay={setSelected}
              onSelectEvent={setFocusedEventId}
            />
          ) : null}
          {mode === "day" ? (
            <DayGrid
              dayKey={dateKeyFromDate(anchor)}
              events={events}
              clockFormat={clockFormat}
              hours={hours}
              gridHeight={gridHeight}
              onSelectEvent={setFocusedEventId}
              selectedEventId={focusedEventId}
            />
          ) : null}
        </div>
        </div>
      </div>
    </div>
  )
}

function MonthGrid({
  month,
  events,
  selected,
  clockFormat,
  onSelectDay,
  onSelectEvent,
}: {
  month: ReturnType<typeof buildCalendarMonth>
  events: CalendarEvent[]
  selected: string
  clockFormat: ClockFormat
  onSelectDay: (key: string) => void
  onSelectEvent: (id: string, day: string) => void
}) {
  return (
    <div className="grid grid-cols-7">
      {WEEKDAY_HEADERS.map((d) => (
        <div
          key={d}
          className="border-b border-black/8 py-2 text-center text-[11px] font-semibold text-black/45 dark:border-white/10 dark:text-white/45"
        >
          {d}
        </div>
      ))}
      {month.cells.map((cell, i) => {
        if (!cell.inMonth || !cell.date) {
          return (
            <div
              key={`pad-${i}`}
              className="min-h-[7.5rem] border-b border-r border-black/5 bg-black/[0.02] dark:border-white/5 dark:bg-white/[0.02]"
            />
          )
        }
        const dayEvents = eventsForDay(events, cell.date)
        const active = cell.date === selected
        return (
          <div
            key={cell.date}
            className={cn(
              "flex min-h-[7.5rem] flex-col border-b border-r border-black/8 p-1 dark:border-white/10",
              active && "bg-[#4285f4]/8",
              cell.isToday && "bg-black/[0.03] dark:bg-white/[0.04]",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectDay(cell.date!)}
              className={cn(
                "mb-1 flex size-7 items-center justify-center self-start rounded-full text-[12px] font-semibold tabular-nums",
                cell.isToday && "bg-[#4285f4] text-white",
                active && !cell.isToday && "bg-black/10 dark:bg-white/15",
              )}
            >
              {cell.day}
            </button>
            <div className="min-h-0 flex-1 overflow-hidden">
              {dayEvents.slice(0, 4).map((event) => (
                <CalendarEventRow
                  key={event.id}
                  event={event}
                  clockFormat={clockFormat}
                  chip
                  onSelect={() => onSelectEvent(event.id, cell.date!)}
                />
              ))}
              {dayEvents.length > 4 ? (
                <p className="px-1 text-[10px] font-medium text-black/45 dark:text-white/45">
                  +{dayEvents.length - 4} more
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeekGrid({
  week,
  events,
  selected,
  clockFormat,
  hours,
  gridHeight,
  onSelectDay,
  onSelectEvent,
}: {
  week: ReturnType<typeof weekDays>
  selected: string
  clockFormat: ClockFormat
  events: CalendarEvent[]
  hours: number[]
  gridHeight: number
  onSelectDay: (key: string) => void
  onSelectEvent: (id: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const weekKey = week.map((d) => d.date).join(",")
  const showsToday = week.some((d) => d.isToday)

  useEffect(() => {
    if (!showsToday) return
    const id = window.requestAnimationFrame(() => scrollTimeGridToNow(scrollRef.current))
    return () => window.cancelAnimationFrame(id)
  }, [weekKey, showsToday])

  return (
    <div className="flex min-h-0 flex-col">
      <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-black/8 dark:border-white/10">
        <div />
        {week.map((d) => {
          const allDay = allDayEventsForDay(events, d.date)
          return (
            <div
              key={d.date}
              className={cn(
                "flex min-w-0 flex-col border-l border-black/8 dark:border-white/10",
                d.date === selected && "bg-[#4285f4]/10",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(d.date)}
                className="py-2 text-center"
              >
                <p className="text-[10px] font-medium uppercase text-black/45 dark:text-white/45">
                  {d.label}
                </p>
                <p
                  className={cn(
                    "mx-auto mt-0.5 flex size-8 items-center justify-center rounded-full text-[13px] font-semibold",
                    d.isToday && "bg-[#4285f4] text-white",
                  )}
                >
                  {d.dom}
                </p>
              </button>
              {allDay.length > 0 ? (
                <div className="max-h-28 space-y-0.5 overflow-y-auto px-1 pb-1.5">
                  {allDay.map((event) => (
                    <CalendarEventRow
                      key={event.id}
                      event={event}
                      clockFormat={clockFormat}
                      chip
                      onSelect={() => onSelectEvent(event.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <div ref={scrollRef} className="notch-scroll max-h-[70vh] overflow-auto scroll-smooth">
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)]" style={{ minHeight: gridHeight }}>
          <div className="relative border-r border-black/8 dark:border-white/10">
            {hours.map((h) => (
              <div
                key={h}
                className="border-b border-black/5 pr-2 text-right text-[10px] tabular-nums text-black/35 dark:border-white/5 dark:text-white/35"
                style={{ height: CALENDAR_HOUR_HEIGHT_PX }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {week.map((d) => (
            <div key={d.date} className="relative min-w-0 border-l border-black/8 dark:border-white/10">
              <div className="relative" style={{ height: gridHeight }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="border-b border-black/5 dark:border-white/5"
                    style={{ height: CALENDAR_HOUR_HEIGHT_PX }}
                  />
                ))}
                {layoutTimedBlocksColumns(events, d.date).map((layout) => (
                  <TimedEventBlock
                    key={layout.event.id}
                    layout={layout}
                    clockFormat={clockFormat}
                    onSelect={() => onSelectEvent(layout.event.id)}
                  />
                ))}
                {d.isToday ? <CalendarNowLine /> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DayGrid({
  dayKey,
  events,
  clockFormat,
  hours,
  gridHeight,
  onSelectEvent,
  selectedEventId,
}: {
  dayKey: string
  events: CalendarEvent[]
  clockFormat: ClockFormat
  hours: number[]
  gridHeight: number
  onSelectEvent: (id: string) => void
  selectedEventId: string | null
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const allDay = allDayEventsForDay(events, dayKey)
  const isToday = dateKeyFromDate(new Date()) === dayKey

  useEffect(() => {
    if (!isToday) return
    const id = window.requestAnimationFrame(() => scrollTimeGridToNow(scrollRef.current))
    return () => window.cancelAnimationFrame(id)
  }, [dayKey, isToday])

  return (
    <div className="flex min-h-0 flex-col">
      {allDay.length > 0 ? (
        <div className="border-b border-black/8 px-2 py-2 dark:border-white/10">
          <div className="flex flex-wrap gap-1">
            {allDay.map((event) => (
              <CalendarEventRow
                key={event.id}
                event={event}
                clockFormat={clockFormat}
                chip
                onSelect={() => onSelectEvent(event.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div ref={scrollRef} className="notch-scroll max-h-[70vh] min-h-0 flex-1 overflow-auto scroll-smooth">
        <div className="grid grid-cols-[3.5rem_1fr]" style={{ minHeight: gridHeight }}>
          <div>
            {hours.map((h) => (
              <div
                key={h}
                className="border-b border-black/5 pr-2 text-right text-[10px] tabular-nums text-black/35 dark:border-white/5"
                style={{ height: CALENDAR_HOUR_HEIGHT_PX }}
              >
                {formatClock(`${dayKey}T${String(h).padStart(2, "0")}:00:00`, "24h")}
              </div>
            ))}
          </div>
          <div className="relative border-l border-black/8 dark:border-white/10">
            <div className="relative" style={{ height: gridHeight }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="border-b border-black/5 dark:border-white/5"
                  style={{ height: CALENDAR_HOUR_HEIGHT_PX }}
                />
              ))}
              {layoutTimedBlocksColumns(events, dayKey).map((layout) => (
                <TimedEventBlock
                  key={layout.event.id}
                  layout={layout}
                  clockFormat={clockFormat}
                  showTimeRange
                  selected={selectedEventId === layout.event.id}
                  onSelect={() => onSelectEvent(layout.event.id)}
                />
              ))}
              {isToday ? <CalendarNowLine /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
