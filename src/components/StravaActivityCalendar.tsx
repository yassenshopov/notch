import { Bike, ChevronLeft, ChevronRight, Dumbbell, Footprints, Waves } from "lucide-react"
import { useMemo, useState } from "react"
import type { StravaCalendar } from "../lib/strava"
import { activityKind } from "../lib/strava"
import {
  buildStravaMonthCalendar,
  canGoToNextMonth,
  canGoToPrevMonth,
  startOfMonth,
  type StravaCalendarActivity,
} from "../lib/strava-calendar"
import { cn } from "../lib/utils"

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

type Props = {
  /** @deprecated Prefer `activities` — kept for older payloads */
  calendar?: StravaCalendar | null
  activities?: StravaCalendarActivity[]
  variant: "mini" | "panel"
  /** When false, calendar sits flush on the page (desktop). */
  surface?: boolean
  className?: string
}

function ActivityIcon({ type, className }: { type: string; className?: string }) {
  const kind = activityKind(type)
  const props = { className: cn("shrink-0", className), strokeWidth: 2, "aria-hidden": true }
  switch (kind) {
    case "ride":
      return <Bike {...props} />
    case "swim":
      return <Waves {...props} />
    case "workout":
      return <Dumbbell {...props} />
    case "run":
    default:
      return <Footprints {...props} />
  }
}

export function StravaActivityCalendar({
  calendar: calendarProp,
  activities = [],
  variant,
  surface = true,
  className,
}: Props) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()))

  const calendar = useMemo(() => {
    if (activities.length > 0) {
      return buildStravaMonthCalendar(activities, viewMonth)
    }
    return calendarProp ?? null
  }, [activities, viewMonth, calendarProp])

  const mini = variant === "mini"
  const cellSize = mini ? "size-4" : "size-8"
  const iconSize = mini ? "size-2" : "size-3.5"

  if (!calendar) return null

  if (mini) {
    const active = calendar.cells.filter((c) => c.inMonth && c.activities.length > 0).slice(-7)
    return (
      <div className={cn("flex items-center gap-0.5", className)} aria-hidden>
        {active.map((cell) => (
          <span
            key={cell.date}
            className={cn(
              "flex items-center justify-center rounded-full bg-white text-black",
              cellSize,
            )}
          >
            {cell.activities[0] ? (
              <ActivityIcon type={cell.activities[0].type} className={iconSize} />
            ) : null}
          </span>
        ))}
      </div>
    )
  }

  const showPrev = activities.length > 0 ? canGoToPrevMonth(viewMonth, activities) : false
  const showNext = activities.length > 0 ? canGoToNextMonth(viewMonth) : false

  return (
    <div
      className={cn(
        surface &&
          "rounded-2xl border border-black/8 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.04]",
        !surface && "min-w-0",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!showPrev}
              onClick={() =>
                setViewMonth((m) => startOfMonth(new Date(m.getFullYear(), m.getMonth() - 1, 1)))
              }
              className="rounded-full p-1 text-black/45 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-25 dark:text-white/45 dark:hover:bg-white/10"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold tracking-tight">
              {calendar.monthLabel}
            </p>
            <button
              type="button"
              aria-label="Next month"
              disabled={!showNext}
              onClick={() =>
                setViewMonth((m) => startOfMonth(new Date(m.getFullYear(), m.getMonth() + 1, 1)))
              }
              className="rounded-full p-1 text-black/45 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-25 dark:text-white/45 dark:hover:bg-white/10"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <div className="mt-1 flex justify-center gap-4 text-[11px] text-black/45 dark:text-white/45">
            <span>
              Streak{" "}
              <span className="font-semibold text-black/80 dark:text-white/85">
                {calendar.weekRows.filter((w) => w.active).length} wks
              </span>
            </span>
            <span>
              Activities{" "}
              <span className="font-semibold text-black/80 dark:text-white/85">
                {calendar.monthActivityCount}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-black/35 dark:text-white/35">
            {WEEKDAYS.map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendar.cells.map((cell, i) => {
              if (!cell.inMonth) {
                return <span key={`pad-${i}`} className={cellSize} />
              }
              const primary = cell.activities[0]
              const multi = cell.activities.length > 1
              return (
                <span
                  key={cell.date}
                  className={cn(
                    "relative flex items-center justify-center rounded-full",
                    cellSize,
                    primary
                      ? "bg-white text-black"
                      : "bg-black/6 text-[10px] font-medium text-black/35 dark:bg-white/8 dark:text-white/35",
                    cell.isToday && "ring-1 ring-white/80 ring-offset-1 ring-offset-transparent",
                  )}
                >
                  {primary ? (
                    <>
                      <ActivityIcon type={primary.type} className={iconSize} />
                      {multi ? (
                        <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-[#fc4c02]" />
                      ) : null}
                    </>
                  ) : (
                    cell.day
                  )}
                </span>
              )
            })}
          </div>
        </div>

        <div className="flex w-5 flex-col items-center gap-1 py-5">
          <div className="relative flex min-h-0 flex-1 w-2 flex-col rounded-full bg-[#fc4c02]/15">
            {calendar.weekRows.map((row, i) => (
              <span key={i} className="flex flex-1 items-center justify-center">
                {row.active ? (
                  <span className="flex size-3.5 items-center justify-center rounded-full bg-[#fc4c02] text-[8px] text-white">
                    ✓
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
