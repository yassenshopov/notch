import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  fetchCalendarSnapshot,
  type CalendarSnapshot,
} from "../lib/calendar"

const empty: CalendarSnapshot = { configured: false, connected: false, calendars: [], events: [] }

export function useCalendar(active: boolean) {
  const settings = useSettings()
  const [snapshot, setSnapshot] = useState<CalendarSnapshot>(empty)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async (force = false) => {
    if (!active) {
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
  }, [active])

  useEffect(() => {
    void refresh()
    if (!active) return
    const id = window.setInterval(() => void refresh(), settings.calendar.pollIntervalMs)
    return () => window.clearInterval(id)
  }, [refresh, active, settings.calendar.pollIntervalMs])

  const connect = useCallback(async () => {
    const next = await connectGoogleCalendar()
    setSnapshot(next)
    return next
  }, [])

  const disconnect = useCallback(async () => {
    const next = await disconnectGoogleCalendar()
    setSnapshot(next)
    return next
  }, [])

  const ready = snapshot.connected && snapshot.events.length > 0

  return {
    snapshot,
    ready,
    refreshing,
    refresh,
    connect,
    disconnect,
  }
}
