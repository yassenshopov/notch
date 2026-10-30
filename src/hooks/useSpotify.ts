import { useCallback, useEffect, useRef, useState } from "react"
import { useSettings } from "../config/settings-store"
import {
  connectSpotify,
  fetchSpotifyStatus,
  playSpotifyUri,
  spotifyAction,
  type SpotifyAction,
  type SpotifyStatus,
} from "../lib/spotify"

const idleStatus: SpotifyStatus = {
  connected: false,
  configured: false,
  isPlaying: false,
  track: null,
}

export function useSpotify() {
  const settings = useSettings()
  const [status, setStatus] = useState<SpotifyStatus>(idleStatus)
  const [progressMs, setProgressMs] = useState(0)
  const lastTick = useRef(Date.now())

  const refresh = useCallback(async () => {
    try {
      const next = await fetchSpotifyStatus()
      setStatus(next)
      setProgressMs(next.progressMs ?? 0)
      lastTick.current = Date.now()
    } catch {
      setStatus((prev) => ({ ...prev, error: "spotify_error" }))
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), settings.spotify.pollIntervalMs)
    return () => window.clearInterval(id)
  }, [refresh, settings.spotify.pollIntervalMs])

  useEffect(() => {
    if (!status.isPlaying || !status.durationMs) return
    const id = window.setInterval(() => {
      const now = Date.now()
      const delta = now - lastTick.current
      lastTick.current = now
      setProgressMs((p) => Math.min(status.durationMs ?? p, p + delta))
    }, 250)
    return () => window.clearInterval(id)
  }, [status.isPlaying, status.durationMs, status.track?.id])

  const connect = useCallback(async () => {
    const next = await connectSpotify()
    setStatus(next)
    setProgressMs(next.progressMs ?? 0)
    return next
  }, [])

  const disconnect = useCallback(async () => {
    const next = (await window.notch?.spotify.disconnect()) ?? idleStatus
    setStatus(next)
    setProgressMs(0)
    return next
  }, [])

  const action = useCallback(async (name: SpotifyAction, options?: { targetPi?: boolean }) => {
    const next = await spotifyAction(name, options)
    setStatus(next)
    setProgressMs(next.progressMs ?? 0)
    lastTick.current = Date.now()
    return next
  }, [])

  const playUri = useCallback(async (uri: string) => {
    const next = await playSpotifyUri(uri)
    setStatus(next)
    setProgressMs(next.progressMs ?? 0)
    lastTick.current = Date.now()
    return next
  }, [])

  return {
    status: {
      ...status,
      progressMs,
    },
    refresh,
    connect,
    disconnect,
    action,
    playUri,
    playing: Boolean(status.isPlaying && status.track),
  }
}
