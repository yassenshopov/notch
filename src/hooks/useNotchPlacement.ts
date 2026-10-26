import { useEffect, useState } from "react"
import { defaultSettings, type NotchPlacement } from "../config/settings"

export function useNotchPlacement(): NotchPlacement {
  const [placement, setPlacement] = useState<NotchPlacement>(defaultSettings.placement)

  useEffect(() => {
    let active = true
    void window.notch?.getPlacement?.().then((next) => {
      if (active && next) setPlacement(next as NotchPlacement)
    })
    const off = window.notch?.onPlacement?.((next) => {
      setPlacement(next as NotchPlacement)
    })
    return () => {
      active = false
      off?.()
    }
  }, [])

  return placement
}

export function shellAlignClass(edge: NotchPlacement["edge"]) {
  switch (edge) {
    case "left":
      return "items-center justify-start"
    case "right":
      return "items-center justify-end"
    default:
      return "items-start justify-center"
  }
}
