import { useLayoutEffect, useState } from "react"

/** Live Electron window content size — never cache while expanded (avoids pill-sized shell). */
export function useShellSize(active: boolean) {
  const [, setRevision] = useState(0)

  useLayoutEffect(() => {
    if (!active) return
    const sync = () => {
      document.documentElement.style.width = `${window.innerWidth}px`
      document.documentElement.style.height = `${window.innerHeight}px`
      setRevision((n) => n + 1)
    }
    sync()
    window.addEventListener("resize", sync)
    return () => {
      window.removeEventListener("resize", sync)
      document.documentElement.style.width = ""
      document.documentElement.style.height = ""
    }
  }, [active])

  return {
    w: window.innerWidth,
    h: window.innerHeight,
  }
}
