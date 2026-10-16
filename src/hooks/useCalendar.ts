import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import { fetchCalendarSnapshot, type CalendarSnapshot } from "../lib/calendar"

const empty: CalendarSnapshot = { configured: false, events: [] }

export function useCalendar(active: boolean) {
  const settings = useSettings()
  const [snapshot, setSnapshot] = useState<CalendarSnapshot>(empty)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async (force = false) => {
    if (!active || !settings.calendar.icsUrl.trim()) {
      setSnapshot(empty)
      return
    }
    setRefreshing(true)
    try {
      const next = await fetchCalendarSnapshot({ force })
      setSnapshot(next)
    } finally {
      setRefreshing(false)
    }
  }, [active, settings.calendar.icsUrl])

  useEffect(() => {
    void refresh()
    if (!active || !settings.calendar.icsUrl.trim()) return
    const id = window.setInterval(() => void refresh(), settings.calendar.pollIntervalMs)
    return () => window.clearInterval(id)
  }, [refresh, active, settings.calendar.icsUrl, settings.calendar.pollIntervalMs])

  const ready = snapshot.configured && snapshot.events.length > 0

  return {
    snapshot,
    ready,
    refreshing,
    refresh,
  }
}
