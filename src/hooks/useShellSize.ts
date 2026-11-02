import { useLayoutEffect } from "react"

/** Pin document to the Electron content box without re-rendering on every resize tick. */
export function useShellSize(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return
    const sync = () => {
      document.documentElement.style.width = `${window.innerWidth}px`
      document.documentElement.style.height = `${window.innerHeight}px`
    }
    sync()
    window.addEventListener("resize", sync)
    return () => {
      window.removeEventListener("resize", sync)
      document.documentElement.style.width = ""
      document.documentElement.style.height = ""
    }
  }, [active])
}
