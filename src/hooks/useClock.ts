import { useEffect, useState } from "react"
import type { ClockFormat } from "../config/settings"
import { formatClock } from "../lib/utils"

/** Live clock — ticks every second while enabled. */
export function useClock(enabled = true) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!enabled) return
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 1_000)
    return () => window.clearInterval(id)
  }, [enabled])

  return now
}

export function formatIslandTime(date: Date, format: ClockFormat) {
  return formatClock(date.toISOString(), format)
}
