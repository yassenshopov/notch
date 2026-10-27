import { useEffect, useState } from "react"
import {
  getStravaMapTileLayerProps,
  type StravaMapTileLayerProps,
} from "../lib/strava-map-tiles"

/** CARTO tiles; resolves API key from main process when not in the renderer env. */
export function useStravaMapTiles(): StravaMapTileLayerProps {
  const [tiles, setTiles] = useState<StravaMapTileLayerProps>(() =>
    getStravaMapTileLayerProps(),
  )

  useEffect(() => {
    let cancelled = false
    const sync = getStravaMapTileLayerProps()
    setTiles(sync)
    if (sync.url.includes("?key=")) return

    const fetchKey = window.notch?.mapTiles?.fetchCartoApiKey
    if (!fetchKey) return

    void fetchKey()
      .then((key) => {
        if (cancelled || !key?.trim()) return
        setTiles(getStravaMapTileLayerProps(key.trim()))
      })
      .catch(() => {
        /* CARTO URL without key — same as before */
      })

    return () => {
      cancelled = true
    }
  }, [])

  return tiles
}
