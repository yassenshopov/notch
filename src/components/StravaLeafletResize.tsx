import { useEffect } from "react"
import { useMap } from "react-leaflet"

/** Leaflet often needs a size refresh when the map mounts inside grids or expanding panels. */
export function StravaLeafletResize() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    const host = container.parentElement
    if (!host) return

    const refresh = () => {
      map.invalidateSize()
    }

    refresh()
    const id = window.requestAnimationFrame(refresh)

    const observer = new ResizeObserver(() => {
      refresh()
    })
    observer.observe(host)

    return () => {
      window.cancelAnimationFrame(id)
      observer.disconnect()
    }
  }, [map])

  return null
}
