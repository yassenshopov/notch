import { useEffect, useRef } from "react"

const HIT_TARGET_SELECTOR = "[data-notch-hit-target]"

/**
 * Forward clicks through transparent expanded shell chrome to windows below.
 * Only active while expanded — collapsed pill must stay fully clickable.
 */
export function useNotchOverlayPassthrough(expanded: boolean) {
  const lastPass = useRef<boolean | null>(null)

  useEffect(() => {
    const setPassthrough = window.notch?.setPassthrough
    if (!setPassthrough) return

    const apply = (pass: boolean) => {
      if (lastPass.current === pass) return
      lastPass.current = pass
      try {
        void setPassthrough(pass)
      } catch {
        // ignore IPC errors
      }
    }

    if (!expanded) {
      apply(false)
      return () => apply(false)
    }

    if (document.documentElement.classList.contains("notch-desktop")) {
      apply(false)
      return () => apply(false)
    }

    const updateFromPoint = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y)
      apply(!el?.closest(HIT_TARGET_SELECTOR))
    }

    const onPointerMove = (e: PointerEvent) => updateFromPoint(e.clientX, e.clientY)

    apply(false)
    window.addEventListener("pointermove", onPointerMove, { passive: true })

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      apply(false)
    }
  }, [expanded])
}