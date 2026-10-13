import { useEffect, useState } from "react"

export type BatteryState = {
  /** False on desktops / browsers without the Battery Status API */
  supported: boolean
  /** 0–1 */
  level: number
  charging: boolean
  ready: boolean
}

const idle: BatteryState = {
  supported: false,
  level: 1,
  charging: false,
  ready: false,
}

type BatteryManagerLike = EventTarget & {
  level: number
  charging: boolean
}

/**
 * Laptop battery via Chromium's Battery Status API (works in Electron).
 * Desktops without a battery typically report unsupported or stay at 100%+charging.
 */
export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>(idle)

  useEffect(() => {
    let cancelled = false
    let battery: BatteryManagerLike | null = null

    const sync = (b: BatteryManagerLike) => {
      if (cancelled) return
      setState({
        supported: true,
        level: clamp01(b.level),
        charging: Boolean(b.charging),
        ready: true,
      })
    }

    const getBattery = navigator.getBattery
    if (typeof getBattery !== "function") {
      setState({ ...idle, ready: true })
      return
    }

    void getBattery
      .call(navigator)
      .then((b: BatteryManagerLike) => {
        if (cancelled) return
        battery = b
        sync(b)
        b.addEventListener("levelchange", onChange)
        b.addEventListener("chargingchange", onChange)
      })
      .catch(() => {
        if (!cancelled) setState({ ...idle, ready: true })
      })

    function onChange() {
      if (battery) sync(battery)
    }

    return () => {
      cancelled = true
      battery?.removeEventListener("levelchange", onChange)
      battery?.removeEventListener("chargingchange", onChange)
    }
  }, [])

  return state
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 1
  return Math.min(1, Math.max(0, n))
}
