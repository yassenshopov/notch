import { useMemo, useState } from "react"
import { Video } from "lucide-react"
import type { ClockFormat } from "../config/settings"
import { useSettings } from "../config/settings-store"
import {
  eventsOnDay,
  openCalendarUrl,
  upcomingEvents,
  type CalendarEvent,
  type CalendarSnapshot,
} from "../lib/calendar"
import { cn, formatHour, formatShortDate } from "../lib/utils"

type Props = {
  snapshot: CalendarSnapshot
  refreshing?: boolean
  onRefresh?: () => void
}

export function CalendarPanel({ snapshot, refreshing, onRefresh }: Props) {
  const settings = useSettings()
  const clockFormat = settings.clock.format
  const week = useMemo(() => buildWeekDays(), [])
  const [selected, setSelected] = useState(() => new Date().toISOString().slice(0, 10))

  const next = useMemo(() => upcomingEvents(snapshot.events, 3), [snapshot.events])
  const dayEvents = useMemo(
    () => eventsOnDay(snapshot.events, selected),
    [snapshot.events, selected],
  )

  if (!settings.calendar.icsUrl.trim()) {
    return (
      <div
        className="notch-scroll flex h-full flex-col pr-1"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 pr-10">
          <p className="text-[15px] font-semibold tracking-tight">Calendar</p>
          <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
            Add a secret ICS link in Settings (Google Calendar → Integrate calendar).
          </p>
        </header>
      </div>
    )
  }

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-4 flex items-start justify-between gap-2 pr-10">
        <div>
          <p className="text-[15px] font-semibold tracking-tight">Calendar</p>
          <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
            Week at a glance · next meetings
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={() => onRefresh()}
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
          >
            {refreshing ? "…" : "Refresh"}
          </button>
        ) : null}
      </header>

      {snapshot.error ? (
        <p className="mb-3 text-[12px] text-red-400">{snapshot.error}</p>
      ) : null}

      <div className="mb-4 flex justify-between gap-0.5 border-b border-black/8 pb-2 dark:border-white/10">
        {week.map((day) => {
          const active = day.key === selected
          const count = eventsOnDay(snapshot.events, day.key).length
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelected(day.key)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 transition-colors",
                active
                  ? "bg-black/8 dark:bg-white/12"
                  : "hover:bg-black/4 dark:hover:bg-white/6",
              )}
            >
              <span className="text-[10px] font-medium text-black/40 dark:text-white/40">
                {day.dow}
              </span>
              <span
                className={cn(
                  "text-[12px] font-semibold tabular-nums",
                  day.isToday && !active && "text-black/70 dark:text-white/80",
                )}
              >
                {day.dom}
              </span>
              {count > 0 ? (
                <span className="size-1 rounded-full bg-black/35 dark:bg-white/50" />
              ) : (
                <span className="size-1" />
              )}
            </button>
          )
        })}
      </div>

      <section className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          Coming up
        </p>
        <ul className="mt-2 space-y-2">
          {next.length === 0 ? (
            <li className="text-[13px] text-black/40 dark:text-white/40">No upcoming events</li>
          ) : (
            next.map((event) => (
              <EventRow key={event.id} event={event} clockFormat={clockFormat} compact />
            ))
          )}
        </ul>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          {formatShortDate(selected + "T12:00:00")}
        </p>
        <ul className="mt-2 space-y-2">
          {dayEvents.length === 0 ? (
            <li className="text-[13px] text-black/40 dark:text-white/40">Nothing scheduled</li>
          ) : (
            dayEvents.map((event) => (
              <EventRow key={event.id} event={event} clockFormat={clockFormat} />
            ))
          )}
        </ul>
      </section>
    </div>
  )
}

function EventRow({
  event,
  clockFormat,
  compact,
}: {
  event: CalendarEvent
  clockFormat: ClockFormat
  compact?: boolean
}) {
  const timeLabel = event.allDay
    ? "All day"
    : `${formatHour(event.start, clockFormat)} – ${formatHour(event.end, clockFormat)}`

  return (
    <li
      className={cn(
        "rounded-xl border border-black/[0.06] px-3 py-2.5 dark:border-white/10",
        compact && "py-2",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-tight">{event.summary}</p>
          <p className="mt-0.5 text-[11px] text-black/45 dark:text-white/45">{timeLabel}</p>
          {!compact && event.location && !event.joinUrl ? (
            <p className="mt-1 truncate text-[11px] text-black/40 dark:text-white/40">
              {event.location}
            </p>
          ) : null}
        </div>
        {event.joinUrl ? (
          <button
            type="button"
            onClick={() => void openCalendarUrl(event.joinUrl!)}
            className="flex shrink-0 items-center gap-1 rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-semibold hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            <Video className="size-3" strokeWidth={2} />
            Join
          </button>
        ) : null}
      </div>
    </li>
  )
}

function buildWeekDays() {
  const now = new Date()
  const start = new Date(now)
  start.setHours(12, 0, 0, 0)
  const day = start.getDay()
  const diff = (day + 6) % 7
  start.setDate(start.getDate() - diff)

  const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short" })
  const todayKey = now.toISOString().slice(0, 10)
  const out = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    out.push({
      key,
      dow: fmt.format(d).replace(/\.$/, ""),
      dom: d.getDate(),
      isToday: key === todayKey,
    })
  }
  return out
}
