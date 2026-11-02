import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useSettings } from "../config/settings-store"
import {
  buildCalendarMonth,
  defaultSelectedForMonth,
  startOfMonth,
} from "../lib/calendar-month"
import {
  eventsOnDay,
  upcomingEvents,
  type CalendarSnapshot,
} from "../lib/calendar"
import { usePanelLayout } from "../lib/panel-layout"
import { cn, formatShortDate } from "../lib/utils"
import { PanelPageHeader } from "./desktop/PanelPageHeader"
import { CalendarDesktopView } from "./desktop/CalendarDesktopView"
import { CalendarEventRow } from "./CalendarEventRow"

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

type Props = {
  snapshot: CalendarSnapshot
  refreshing?: boolean
  onRefresh?: () => void
  connecting?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
}

export function CalendarPanel({
  snapshot,
  refreshing,
  onRefresh,
  connecting,
  onConnect,
  onDisconnect,
}: Props) {
  const settings = useSettings()
  const desktop = usePanelLayout() === "desktop"
  const clockFormat = settings.clock.format
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => new Date().toISOString().slice(0, 10))

  const month = useMemo(
    () => buildCalendarMonth(snapshot.events, viewMonth),
    [snapshot.events, viewMonth],
  )

  const next = useMemo(() => upcomingEvents(snapshot.events, 3), [snapshot.events])
  const dayEvents = useMemo(
    () =>
      eventsOnDay(snapshot.events, selected).sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      ),
    [snapshot.events, selected],
  )

  const shiftMonth = (delta: number) => {
    setViewMonth((m) => {
      const nextMonth = startOfMonth(new Date(m.getFullYear(), m.getMonth() + delta, 1))
      setSelected((prev) => defaultSelectedForMonth(nextMonth, prev))
      return nextMonth
    })
  }

  if (!snapshot.configured) {
    return (
      <div
        className="notch-scroll flex h-full flex-col items-center justify-center px-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[15px] font-semibold tracking-tight">Calendar</p>
        <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
          Add Google OAuth credentials to <span className="font-medium">.env</span> and restart
          Notch.
        </p>
      </div>
    )
  }

  if (!snapshot.connected) {
    return (
      <div
        className="notch-scroll flex h-full flex-col items-center justify-center gap-3 px-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[15px] font-semibold tracking-tight">Calendar</p>
        <p className="text-[12px] text-black/45 dark:text-white/45">
          {snapshot.error ?? "Connect your Google account to see upcoming events."}
        </p>
        {onConnect ? (
          <button
            type="button"
            disabled={connecting}
            onClick={onConnect}
            className="rounded-full bg-[#4285f4] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {connecting ? "Waiting for browser…" : "Connect Google Calendar"}
          </button>
        ) : null}
      </div>
    )
  }

  const headerActions = (
    <div className="flex shrink-0 items-center gap-1">
      {onDisconnect ? (
        <button
          type="button"
          onClick={onDisconnect}
          className="rounded-full px-2.5 py-1 text-[11px] font-medium text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
        >
          Disconnect
        </button>
      ) : null}
    </div>
  )

  if (desktop) {
    return (
      <CalendarDesktopView
        snapshot={snapshot}
        clockFormat={clockFormat}
        refreshing={refreshing}
        onRefresh={onRefresh}
        headerActions={headerActions}
      />
    )
  }

  const monthNav = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => shiftMonth(-1)}
        className="rounded-full p-1 text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <p className="min-w-0 flex-1 truncate text-center text-[14px] font-semibold tracking-tight">
        {month.monthLabel}
      </p>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => shiftMonth(1)}
        className="rounded-full p-1 text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  )

  const monthGrid = (
    <div className="min-w-0">
      <div className="mb-1.5 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-black/35 dark:text-white/35">
        {WEEKDAYS.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {month.cells.map((cell, i) => {
          if (!cell.inMonth || !cell.date) {
            return <span key={`pad-${i}`} className="aspect-square min-h-7" />
          }
          const active = cell.date === selected
          const primaryColor = cell.eventColors[0]
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => setSelected(cell.date!)}
              className={cn(
                "flex aspect-square min-h-7 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold tabular-nums transition-colors",
                active
                  ? "bg-black/10 ring-2 dark:bg-white/15"
                  : cell.isToday
                    ? "bg-black/6 ring-1 ring-black/15 dark:bg-white/10 dark:ring-white/20"
                    : "hover:bg-black/5 dark:hover:bg-white/8",
                !active && !cell.isToday && "text-black/70 dark:text-white/80",
              )}
              style={
                active && primaryColor
                  ? { boxShadow: `inset 0 0 0 2px ${primaryColor}` }
                  : undefined
              }
            >
              <span>{cell.day}</span>
              {cell.eventColors.length > 0 ? (
                <span className="flex max-w-full justify-center gap-px px-0.5">
                  {cell.eventColors.map((c) => (
                    <span
                      key={c}
                      className="size-1 shrink-0 rounded-full"
                      style={{ backgroundColor: c }}
                      aria-hidden
                    />
                  ))}
                </span>
              ) : (
                <span className="size-1" aria-hidden />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <PanelPageHeader className="mb-3 flex items-start justify-between gap-2 pr-10">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tracking-tight">Calendar</p>
          <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">Google Calendar</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerActions}
          {onRefresh ? (
            <button
              type="button"
              onClick={() => onRefresh()}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
            >
              {refreshing ? "…" : "Refresh"}
            </button>
          ) : null}
        </div>
      </PanelPageHeader>
      {snapshot.error ? (
        <p className="mb-3 text-[12px] text-red-400">{snapshot.error}</p>
      ) : null}
      <div className="mb-4">{monthNav}</div>
      <div className="mb-5">{monthGrid}</div>
      <section className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          {formatShortDate(selected + "T12:00:00")}
        </p>
        <ul className="mt-2 space-y-2">
          {dayEvents.length === 0 ? (
            <li className="list-none text-[13px] text-black/40 dark:text-white/40">
              Nothing scheduled
            </li>
          ) : (
            dayEvents.map((event) => (
              <CalendarEventRow key={event.id} event={event} clockFormat={clockFormat} />
            ))
          )}
        </ul>
      </section>
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          Coming up
        </p>
        <ul className="mt-2 space-y-2">
          {next.length === 0 ? (
            <li className="list-none text-[13px] text-black/40 dark:text-white/40">
              No upcoming events
            </li>
          ) : (
            next.map((event) => (
              <CalendarEventRow key={event.id} event={event} clockFormat={clockFormat} compact />
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
