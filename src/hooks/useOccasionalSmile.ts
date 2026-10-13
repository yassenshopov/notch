import { useEffect, useState } from "react"

/** Randomly flashes a smile for a short beat, then rests a while. */
export function useOccasionalSmile(enabled = true) {
  const [smiling, setSmiling] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setSmiling(false)
      return
    }

    let cancelled = false
    let showTimer: number | undefined
    let hideTimer: number | undefined

    const schedule = () => {
      // Idle 28–70s, then smile for 1.4–2.2s
      const wait = 28_000 + Math.random() * 42_000
      showTimer = window.setTimeout(() => {
        if (cancelled) return
        setSmiling(true)
        const hold = 1_400 + Math.random() * 800
        hideTimer = window.setTimeout(() => {
          if (cancelled) return
          setSmiling(false)
          schedule()
        }, hold)
      }, wait)
    }

    // First wink a bit sooner so it feels alive
    showTimer = window.setTimeout(() => {
      if (cancelled) return
      setSmiling(true)
      hideTimer = window.setTimeout(() => {
        if (cancelled) return
        setSmiling(false)
        schedule()
      }, 1_800)
    }, 8_000 + Math.random() * 10_000)

    return () => {
      cancelled = true
      if (showTimer) window.clearTimeout(showTimer)
      if (hideTimer) window.clearTimeout(hideTimer)
    }
  }, [enabled])

  return smiling
}
