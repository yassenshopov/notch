import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import {
  fetchMediaSessionStatus,
  mediaSessionAction,
  type MediaSessionAction,
  type MediaSessionStatus,
} from "../lib/media-session"

const idle: MediaSessionStatus = {
  supported: false,
  playing: false,
  paused: false,
  appId: null,
  title: null,
  artist: null,
  album: null,
  isBrowser: false,
  isYoutube: false,
  thumbnailUrl: null,
}

export function useMediaSession(active: boolean) {
  const settings = useSettings()
  const [status, setStatus] = useState<MediaSessionStatus>(idle)

  const refresh = useCallback(async () => {
    if (!active || !settings.media.enabled) {
      setStatus(idle)
      return
    }
    const next = await fetchMediaSessionStatus()
    setStatus(next)
  }, [active, settings.media.enabled])

  useEffect(() => {
    void refresh()
    if (!active || !settings.media.enabled) return
    const id = window.setInterval(() => void refresh(), settings.media.pollIntervalMs)
    return () => window.clearInterval(id)
  }, [refresh, active, settings.media.enabled, settings.media.pollIntervalMs])

  const action = useCallback(async (name: MediaSessionAction) => {
    const next = await mediaSessionAction(name)
    setStatus(next)
    return next
  }, [])

  const showing =
    settings.media.enabled &&
    status.supported &&
    (status.playing || status.paused) &&
    Boolean(status.title || status.artist)

  return {
    status,
    refresh,
    action,
    showing,
    playing: status.playing,
  }
}
