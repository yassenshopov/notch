export type MediaSessionStatus = {
  supported: boolean
  playing: boolean
  paused: boolean
  appId: string | null
  title: string | null
  artist: string | null
  album: string | null
  isBrowser: boolean
  isYoutube: boolean
  thumbnailUrl: string | null
  error?: string
}

export type MediaSessionAction = "play" | "pause" | "toggle" | "next" | "previous"

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

export async function fetchMediaSessionStatus(): Promise<MediaSessionStatus> {
  try {
    const next = await window.notch?.media?.status()
    return next ?? idle
  } catch {
    return { ...idle, error: "media_error" }
  }
}

export async function mediaSessionAction(
  action: MediaSessionAction,
): Promise<MediaSessionStatus> {
  try {
    await window.notch?.media?.action(action)
    return fetchMediaSessionStatus()
  } catch {
    return { ...idle, error: "media_error" }
  }
}

export function mediaSessionActive(
  status: MediaSessionStatus,
  enabled: boolean,
): boolean {
  if (!enabled || !status.supported) return false
  return status.playing || status.paused
}
