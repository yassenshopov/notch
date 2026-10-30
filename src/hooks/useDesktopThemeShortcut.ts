import { useEffect } from "react"
import { toggleLightDarkTheme } from "../lib/theme"

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  )
}

export function useDesktopThemeShortcut() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "l") return
      if (!e.ctrlKey || !e.shiftKey || e.altKey || e.metaKey) return
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      toggleLightDarkTheme()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
