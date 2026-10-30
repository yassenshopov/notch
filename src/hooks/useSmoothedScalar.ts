import { useEffect, useRef, useState } from "react"

type Options = {
  enabled?: boolean
  /** Time constant for exponential smoothing (ms); lower = snappier */
  durationMs?: number
}

/**
 * Smoothly follows a moving target without restarting an ease on every target change.
 */
export function useSmoothedScalar(target: number, { enabled = true, durationMs = 320 }: Options = {}) {
  const [value, setValue] = useState(target)
  const targetRef = useRef(target)
  const valueRef = useRef(target)
  targetRef.current = target

  useEffect(() => {
    if (!enabled) {
      valueRef.current = targetRef.current
      setValue(targetRef.current)
      return
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(48, now - last)
      last = now

      const t = targetRef.current
      let v = valueRef.current
      const diff = t - v

      if (Math.abs(diff) < 0.00035) {
        if (v !== t) {
          v = t
          valueRef.current = t
          setValue(t)
        }
      } else {
        const alpha = 1 - Math.exp(-dt / Math.max(16, durationMs))
        v = v + diff * alpha
        valueRef.current = v
        setValue(v)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, durationMs])

  return enabled ? value : target
}
