import type { ClockFormat } from "../../config/settings"
import {
  eventDisplayColor,
  textColorOnCalendarFill,
  withAlpha,
} from "../../lib/google-calendar-colors"
import type { TimedBlockLayout } from "../../lib/calendar-views"
import { timedBlockStyle } from "../../lib/calendar-views"
import { cn, formatClock } from "../../lib/utils"

type Props = {
  layout: TimedBlockLayout
  clockFormat: ClockFormat
  selected?: boolean
  onSelect: () => void
  /** Day view can show time range under title when tall enough */
  showTimeRange?: boolean
}

export function TimedEventBlock({
  layout,
  clockFormat,
  selected,
  onSelect,
  showTimeRange,
}: Props) {
  const { event, heightPx } = layout
  const color = eventDisplayColor(event)
  const fillAlpha = "cc"
  const textColor = textColorOnCalendarFill(color, fillAlpha)
  const pos = timedBlockStyle(layout)
  const timeLabel = `${formatClock(event.start, clockFormat)} – ${formatClock(event.end, clockFormat)}`
  const title = `${event.summary}\n${timeLabel}`

  const h = heightPx
  const showTitle = h >= 18
  const showTime = showTimeRange && h >= 44
  const titleLines = h >= 52 ? Math.min(4, Math.floor((h - (showTime ? 22 : 8)) / 12)) : 1

  return (
    <button
      type="button"
      onClick={onSelect}
      title={title}
      className={cn(
        "absolute box-border flex min-w-0 flex-col items-stretch justify-start overflow-hidden rounded-sm border border-black/10 px-1 py-0.5 text-left dark:border-white/15",
        selected && "ring-2 ring-black/25 dark:ring-white/40",
      )}
      style={{
        ...pos,
        backgroundColor: withAlpha(color, fillAlpha),
        color: textColor,
      }}
    >
      {showTime ? (
        <span className="block truncate text-[9px] font-medium leading-none tabular-nums opacity-75">
          {timeLabel}
        </span>
      ) : null}
      {showTitle ? (
        <span
          className={cn(
            "block min-w-0 font-semibold leading-[1.15]",
            titleLines === 1 ? "truncate text-[10px]" : "text-[10px]",
          )}
          style={
            titleLines > 1
              ? {
                  display: "-webkit-box",
                  WebkitLineClamp: titleLines,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }
              : undefined
          }
        >
          {event.summary}
        </span>
      ) : (
        <span className="block size-full min-w-0" aria-hidden />
      )}
    </button>
  )
}
