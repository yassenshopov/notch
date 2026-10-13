import { useCallback, useEffect, useRef, useState } from "react"

export type ControlsStatus = {
  platform: string
  supported: boolean
  volume: number
  muted: boolean
  micMuted: boolean
  brightness: number | null
  brightnessSupported: boolean
  playback: {
    id: string
    name: string
    friendlyId?: string
    isDefault: boolean
  }[]
  bluetooth: {
    id: string
    name: string
    connected: boolean
    status?: string
  }[]
  error?: string
}

const idle: ControlsStatus = {
  platform: "unknown",
  supported: false,
  volume: 50,
  muted: false,
  micMuted: false,
  brightness: null,
  brightnessSupported: false,
  playback: [],
  bluetooth: [],
}

/** How long local slider/toggle values win over polled status. */
const HOLD_MS = 2500

type Pending = {
  volume?: number
  muted?: boolean
  micMuted?: boolean
  brightness?: number
  playbackId?: string
  bluetooth?: Record<string, boolean>
  until: number
}

function bridgePlatform() {
  return window.notch?.platform ?? "unknown"
}

function applyPending(next: ControlsStatus, pending: Pending | null): ControlsStatus {
  if (!pending || Date.now() > pending.until) return next

  let playback = next.playback
  if (pending.playbackId) {
    const id = pending.playbackId
    playback = next.playback.map((d) => ({
      ...d,
      isDefault: d.id === id || d.friendlyId === id,
    }))
  }

  let bluetooth = next.bluetooth
  if (pending.bluetooth) {
    bluetooth = next.bluetooth.map((d) =>
      d.id in pending.bluetooth!
        ? { ...d, connected: pending.bluetooth![d.id] }
        : d,
    )
  }

  return {
    ...next,
    volume: pending.volume ?? next.volume,
    muted: pending.muted ?? next.muted,
    micMuted: pending.micMuted ?? next.micMuted,
    brightness: pending.brightness ?? next.brightness,
    playback,
    bluetooth,
  }
}

export function useSystemControls(active: boolean) {
  const [status, setStatus] = useState<ControlsStatus>(() => ({
    ...idle,
    platform: typeof window !== "undefined" ? bridgePlatform() : "unknown",
  }))
  const [loading, setLoading] = useState(true)
  const volumeDebounce = useRef<number | null>(null)
  const brightnessDebounce = useRef<number | null>(null)
  const pending = useRef<Pending | null>(null)
  const refreshInFlight = useRef(false)
  const interacting = useRef(false)

  const hold = useCallback((patch: Omit<Pending, "until">, ms = HOLD_MS) => {
    pending.current = {
      ...(pending.current && Date.now() <= pending.current.until
        ? pending.current
        : {}),
      ...patch,
      until: Date.now() + ms,
    }
  }, [])

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return
    if (interacting.current) return
    refreshInFlight.current = true
    try {
      if (!window.notch) {
        setStatus({
          ...idle,
          platform: "unknown",
          error: "no_electron",
        })
        return
      }
      if (!window.notch.controls?.status) {
        setStatus({
          ...idle,
          platform: bridgePlatform(),
          error: "controls_unavailable",
        })
        return
      }
      const next = await window.notch.controls.status()
      if (next) {
        setStatus(applyPending(next, pending.current))
      } else {
        setStatus({
          ...idle,
          platform: bridgePlatform(),
          error: "controls_empty",
        })
      }
    } catch {
      setStatus((prev) => ({
        ...prev,
        platform: bridgePlatform(),
        supported: false,
        error: "controls_error",
      }))
    } finally {
      refreshInFlight.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    void refresh()
    const id = window.setInterval(() => void refresh(), 5000)
    return () => window.clearInterval(id)
  }, [active, refresh])

  const setVolume = useCallback(
    (level: number) => {
      const n = Math.max(0, Math.min(100, Math.round(level)))
      interacting.current = true
      hold({ volume: n, muted: n === 0 ? pending.current?.muted : false })
      setStatus((prev) => ({
        ...prev,
        volume: n,
        muted: n === 0 ? prev.muted : false,
      }))
      if (volumeDebounce.current) window.clearTimeout(volumeDebounce.current)
      volumeDebounce.current = window.setTimeout(() => {
        interacting.current = false
        void window.notch?.controls
          ?.setVolume(n)
          .then(() => {
            hold({ volume: n })
          })
          .catch(() => {
            void refresh()
          })
      }, 120)
    },
    [hold, refresh],
  )

  const setMuted = useCallback(
    async (muted: boolean) => {
      hold({ muted })
      setStatus((prev) => ({ ...prev, muted }))
      try {
        await window.notch?.controls?.setMuted(muted)
        hold({ muted })
      } catch {
        void refresh()
      }
    },
    [hold, refresh],
  )

  const setMicMuted = useCallback(
    async (muted: boolean) => {
      hold({ micMuted: muted })
      setStatus((prev) => ({ ...prev, micMuted: muted }))
      try {
        await window.notch?.controls?.setMicMuted(muted)
        hold({ micMuted: muted })
      } catch {
        void refresh()
      }
    },
    [hold, refresh],
  )

  const setBrightness = useCallback(
    (level: number) => {
      const n = Math.max(0, Math.min(100, Math.round(level)))
      interacting.current = true
      hold({ brightness: n }, 4000)
      setStatus((prev) => ({ ...prev, brightness: n }))
      if (brightnessDebounce.current) window.clearTimeout(brightnessDebounce.current)
      brightnessDebounce.current = window.setTimeout(() => {
        interacting.current = false
        void window.notch?.controls
          ?.setBrightness(n)
          .then((res) => {
            const confirmed = res?.level ?? n
            hold({ brightness: confirmed }, 4000)
            setStatus((prev) => ({ ...prev, brightness: confirmed }))
          })
          .catch(() => {
            void refresh()
          })
      }, 180)
    },
    [hold, refresh],
  )

  const setPlayback = useCallback(
    async (id: string) => {
      hold({ playbackId: id }, 4000)
      setStatus((prev) => ({
        ...prev,
        playback: prev.playback.map((d) => ({
          ...d,
          isDefault: d.id === id || d.friendlyId === id,
        })),
      }))
      try {
        await window.notch?.controls?.setPlayback(id)
        hold({ playbackId: id }, 4000)
      } catch {
        void refresh()
      }
    },
    [hold, refresh],
  )

  const setBluetooth = useCallback(
    async (id: string, connected: boolean) => {
      hold(
        {
          bluetooth: {
            ...(pending.current?.bluetooth ?? {}),
            [id]: connected,
          },
        },
        5000,
      )
      setStatus((prev) => ({
        ...prev,
        bluetooth: prev.bluetooth.map((d) =>
          d.id === id ? { ...d, connected } : d,
        ),
      }))
      try {
        await window.notch?.controls?.setBluetooth(id, connected)
      } catch {
        void refresh()
      }
    },
    [hold, refresh],
  )

  return {
    status,
    loading,
    refresh,
    setVolume,
    setMuted,
    setMicMuted,
    setBrightness,
    setPlayback,
    setBluetooth,
  }
}
