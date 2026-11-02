import { Check } from "lucide-react"
import type { CalendarSource } from "../../lib/calendar"
import { cn } from "../../lib/utils"

type Props = {
  calendars: CalendarSource[]
  hiddenIds: readonly string[]
  onToggle: (calendarId: string) => void
}

export function CalendarSourceList({ calendars, hiddenIds, onToggle }: Props) {
  const hidden = new Set(hiddenIds)

  if (calendars.length === 0) {
    return (
      <p className="px-3 py-2 text-[12px] text-black/40 dark:text-white/40">No calendars</p>
    )
  }

  return (
    <ul className="space-y-0.5">
      {calendars.map((cal) => {
        const visible = !hidden.has(cal.id)
        return (
          <li key={cal.id}>
            <button
              type="button"
              onClick={() => onToggle(cal.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              <span
                className={cn(
                  "flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border-2 transition-opacity",
                  visible ? "border-transparent" : "border-black/15 bg-transparent dark:border-white/20",
                )}
                style={visible ? { backgroundColor: cal.color } : undefined}
                aria-hidden
              >
                {visible ? <Check className="size-3 stroke-[3] text-white" /> : null}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[13px] font-medium leading-snug",
                  !visible && "text-black/35 line-through dark:text-white/35",
                )}
                title={cal.summary}
              >
                {cal.summary}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
