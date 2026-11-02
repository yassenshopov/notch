import { useEffect, useState } from "react"

/** Mirrors Sileo — respect OS reduced-motion for notch animations only. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("notch-reduced-motion", reduced)
    return () => document.documentElement.classList.remove("notch-reduced-motion")
  }, [reduced])

  return reduced
}
