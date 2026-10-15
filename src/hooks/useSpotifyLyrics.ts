import { useEffect, useState } from "react"
import { fetchTrackLyrics, type LyricsResult } from "../lib/lyrics"
import type { SpotifyTrack } from "../lib/spotify"

const empty: LyricsResult = {
  found: false,
  plainLyrics: null,
  syncedLyrics: null,
  lines: [],
}

type Options = {
  enabled: boolean
  track: SpotifyTrack | null
  durationMs?: number
}

export function useSpotifyLyrics({ enabled, track, durationMs }: Options) {
  const [lyrics, setLyrics] = useState<LyricsResult>(empty)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || !track) {
      setLyrics(empty)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setLyrics(empty)

    void fetchTrackLyrics({
      trackName: track.name,
      artistName: track.artists,
      albumName: track.album,
      durationMs,
    })
      .then((result) => {
        if (!cancelled) setLyrics(result)
      })
      .catch(() => {
        if (!cancelled) setLyrics(empty)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, track?.id, track?.name, track?.artists, track?.album, durationMs])

  return { lyrics, loading }
}
