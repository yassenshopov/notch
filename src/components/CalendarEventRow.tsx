import { Video } from "lucide-react"
import type { ClockFormat } from "../config/settings"
import type { CalendarEvent } from "../lib/calendar"
import { openCalendarUrl } from "../lib/calendar"
import { eventDisplayColor, withAlpha } from "../lib/google-calendar-colors"
import { cn, formatClock } from "../lib/utils"

type Props = {
  event: CalendarEvent
  clockFormat: ClockFormat
  compact?: boolean
  chip?: boolean
  onSelect?: () => void
  selected?: boolean
}

export function CalendarEventRow({
  event,
  clockFormat,
  compact,
  chip,
  onSelect,
  selected,
}: Props) {
  const color = eventDisplayColor(event)

  if (chip) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "mb-0.5 flex w-full min-w-0 gap-1 rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight",
          !event.allDay ? "flex-row items-center" : "flex-col items-stretch",
          selected && "ring-1 ring-black/25 dark:ring-white/35",
        )}
        style={{
          backgroundColor: withAlpha(color, "55"),
          color: "#111",
        }}
        title={event.summary}
      >
        {!event.allDay ? (
          <span className="shrink-0 tabular-nums opacity-80">
            {formatClock(event.start, clockFormat).replace(/\s/g, "")}
          </span>
        ) : null}
        <span className="truncate">{event.summary}</span>
      </button>
    )
  }

  const bg = withAlpha(color, "18")
  const timeStart = event.allDay ? "All day" : formatClock(event.start, clockFormat)
  const timeEnd = event.allDay ? null : formatClock(event.end, clockFormat)

  return (
    <li
      className={cn(
        "relative list-none overflow-hidden rounded-xl border border-black/[0.06] dark:border-white/10",
        selected && "ring-2 ring-black/15 dark:ring-white/25",
        onSelect && "cursor-pointer",
      )}
      style={{ backgroundColor: bg }}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className={cn("flex gap-2.5 pl-3", compact ? "py-2 pr-2" : "py-2.5 pr-3")}>
        {!event.allDay ? (
          <div className="w-[3.25rem] shrink-0 pt-0.5 text-right">
            <p className="text-[11px] font-semibold tabular-nums leading-tight" style={{ color }}>
              {timeStart}
            </p>
            {timeEnd && timeEnd !== timeStart ? (
              <p className="text-[10px] tabular-nums leading-tight text-black/40 dark:text-white/40">
                {timeEnd}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <div className="min-w-0">
            {event.allDay ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color }}>
                All day
              </p>
            ) : null}
            <p className="truncate text-[13px] font-semibold tracking-tight text-black/90 dark:text-white/95">
              {event.summary}
            </p>
            {!compact && event.location && !event.joinUrl ? (
              <p className="mt-1 truncate text-[11px] text-black/45 dark:text-white/45">
                {event.location}
              </p>
            ) : null}
          </div>
          {event.joinUrl ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void openCalendarUrl(event.joinUrl!)
              }}
              className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              <Video className="size-3" strokeWidth={2} />
              Join
            </button>
          ) : null}
        </div>
      </div>
    </li>
  )
}
