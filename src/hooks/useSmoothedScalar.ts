import { useEffect, useRef, useState } from "react"

type Options = {
  enabled?: boolean
  durationMs?: number
}

export function useSmoothedScalar(target: number, { enabled = true, durationMs = 320 }: Options = {}) {
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)
  valueRef.current = value

  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }

    const from = valueRef.current
    if (Math.abs(from - target) < 0.0004) {
      setValue(target)
      return
    }

    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) ** 3
      setValue(from + (target - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, enabled, durationMs])

  return enabled ? value : target
}
