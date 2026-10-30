import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import {
  fetchPiDisplayMode,
  fetchPiDisplayNowPlaying,
  setPiDisplayMode,
  type PiDisplayNowPlaying,
} from "../lib/pi-display"

const idleNowPlaying: PiDisplayNowPlaying = {
  connected: false,
  host: "pi",
  error: null,
  playing: false,
  mode: null,
  track: null,
  artist: null,
  album: null,
  artUrl: null,
  progressMs: null,
  durationMs: null,
}

export function usePiDisplay(active = true) {
  const settings = useSettings()
  const host = settings.pi?.sshHost ?? "pi"
  const [nowPlaying, setNowPlaying] = useState<PiDisplayNowPlaying>(() => ({
    ...idleNowPlaying,
    host,
  }))
  const [mode, setMode] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [switchingMode, setSwitchingMode] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [np, modeRes] = await Promise.all([
        fetchPiDisplayNowPlaying({ host }),
        fetchPiDisplayMode({ host }),
      ])
      setNowPlaying(np)
      setMode(modeRes.mode ?? np.mode)
    } catch {
      setNowPlaying({ ...idleNowPlaying, host, error: "pi_display_error" })
    } finally {
      setLoading(false)
    }
  }, [host])

  useEffect(() => {
    setNowPlaying({ ...idleNowPlaying, host })
    setMode(null)
  }, [host])

  useEffect(() => {
    if (!active) return
    setLoading(true)
    void refresh()
    const id = window.setInterval(() => void refresh(), 4_000)
    return () => window.clearInterval(id)
  }, [active, refresh])

  const changeMode = useCallback(
    async (next: number) => {
      setSwitchingMode(true)
      try {
        const res = await setPiDisplayMode(next, { host })
        if (res.connected && res.mode != null) {
          setMode(res.mode)
        }
        await refresh()
      } finally {
        setSwitchingMode(false)
      }
    },
    [host, refresh],
  )

  return { nowPlaying, mode, loading, switchingMode, refresh, changeMode }
}
