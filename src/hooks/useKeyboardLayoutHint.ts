import { useEffect, useRef, useState } from "react"
import type { KeyboardLayoutSnapshot } from "../lib/keyboard-layout"

const FLASH_MS = 1_800

/** Brief collapsed-pill flash when the user switches input language (Windows). */
export function useKeyboardLayoutHint(active: boolean) {
  const [flash, setFlash] = useState<KeyboardLayoutSnapshot | null>(null)
  const hideTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!active) {
      setFlash(null)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
      return
    }

    const api = window.notch?.keyboardLayout
    if (!api?.onChange) return

    return api.onChange((layout) => {
      setFlash(layout)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(() => setFlash(null), FLASH_MS)
    })
  }, [active])

  return flash
}
