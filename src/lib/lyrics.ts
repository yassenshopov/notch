export type LyricLine = {
  timeMs: number
  text: string
}

export type LyricsResult = {
  found: boolean
  instrumental?: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
  lines: LyricLine[]
}

export type LyricsQuery = {
  trackName: string
  artistName: string
  albumName?: string
  durationMs?: number
}

/** Parse standard LRC timestamps into lines sorted by time. */
export function parseSyncedLyrics(lrc: string): LyricLine[] {
  const lines: LyricLine[] = []
  for (const raw of lrc.split(/\r?\n/)) {
    const trimmed = raw.trim()
    if (!trimmed) continue

    const tags = [...trimmed.matchAll(/\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]/g)]
    if (tags.length === 0) continue

    const text = trimmed.replace(/\[\d+:\d{2}(?:[.:]\d{1,3})?\]/g, "").trim()
    if (!text) continue

    for (const tag of tags) {
      const minutes = Number(tag[1])
      const seconds = Number(tag[2])
      const frac = tag[3] ? Number(tag[3]) : 0
      const fracMs =
        tag[3] && tag[3].length === 3 ? frac : tag[3] ? frac * 10 : 0
      const timeMs = minutes * 60_000 + seconds * 1_000 + fracMs
      lines.push({ timeMs, text })
    }
  }

  return lines.sort((a, b) => a.timeMs - b.timeMs)
}

export function activeLyricIndex(lines: LyricLine[], progressMs: number): number {
  if (lines.length === 0) return -1
  let idx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].timeMs <= progressMs + 80) idx = i
    else break
  }
  return idx
}

export function buildLyricsResult(payload: {
  found: boolean
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}): LyricsResult {
  const synced = payload.syncedLyrics?.trim() ?? ""
  const lines = synced ? parseSyncedLyrics(synced) : []
  return {
    found: payload.found,
    instrumental: payload.instrumental,
    plainLyrics: payload.plainLyrics?.trim() || null,
    syncedLyrics: synced || null,
    lines,
  }
}

export async function fetchTrackLyrics(query: LyricsQuery): Promise<LyricsResult> {
  const bridge = window.notch?.spotify?.lyrics
  if (!bridge) {
    return buildLyricsResult({ found: false })
  }
  const raw = await bridge({
    trackName: query.trackName,
    artistName: query.artistName,
    albumName: query.albumName,
    durationMs: query.durationMs,
  })
  return buildLyricsResult(raw)
}
