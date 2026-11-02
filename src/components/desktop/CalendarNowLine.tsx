import { useClock } from "../../hooks/useClock"
import { nowLineTopPx } from "../../lib/calendar-views"

export function CalendarNowLine() {
  const now = useClock()
  const top = nowLineTopPx(now)
  if (top == null) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20"
      style={{ top }}
      aria-hidden
    >
      <div className="flex items-center">
        <div className="-ml-[5px] size-[10px] shrink-0 rounded-full bg-[#ea4335]" />
        <div className="h-[2px] min-w-0 flex-1 bg-[#ea4335]" />
      </div>
    </div>
  )
}
