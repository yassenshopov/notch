import { useEffect, useState } from "react"
import { extractAlbumPalette, type AlbumPalette } from "../lib/album-color"

const cache = new Map<string, AlbumPalette>()

export function useAlbumPalette(artUrl: string | null | undefined) {
  const [palette, setPalette] = useState<AlbumPalette | null>(() =>
    artUrl ? (cache.get(artUrl) ?? null) : null,
  )

  useEffect(() => {
    if (!artUrl) {
      setPalette(null)
      return
    }

    const cached = cache.get(artUrl)
    if (cached) {
      setPalette(cached)
      return
    }

    let cancelled = false
    void extractAlbumPalette(artUrl).then((next) => {
      if (cancelled) return
      if (next) cache.set(artUrl, next)
      setPalette(next)
    })

    return () => {
      cancelled = true
    }
  }, [artUrl])

  return palette
}
