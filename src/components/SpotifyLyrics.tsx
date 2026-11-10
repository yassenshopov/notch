import { activeLyricIndex, type LyricsResult } from "../lib/lyrics"
import { cn } from "../lib/utils"

type Props = {
  lyrics: LyricsResult
  loading: boolean
  progressMs: number
  themed?: boolean
}

export function SpotifyLyrics({ lyrics, loading, progressMs, themed }: Props) {
  const active = activeLyricIndex(lyrics.lines, progressMs)
  const activeLine = active >= 0 ? lyrics.lines[active] : null

  if (loading) {
    return (
      <p
        className={cn(
          "py-2 text-center text-[12px] font-medium",
          themed ? "text-[color:var(--sp-subtle)]" : "text-black/35 dark:text-white/35",
        )}
      >
        Loading lyrics…
      </p>
    )
  }

  if (!lyrics.found) {
    return (
      <p
        className={cn(
          "py-2 text-center text-[12px] font-medium",
          themed ? "text-[color:var(--sp-subtle)]" : "text-black/35 dark:text-white/35",
        )}
      >
        Lyrics unavailable
      </p>
    )
  }

  if (lyrics.instrumental) {
    return (
      <p
        className={cn(
          "py-2 text-center text-[12px] font-medium italic",
          themed ? "text-[color:var(--sp-muted)]" : "text-black/40 dark:text-white/40",
        )}
      >
        Instrumental
      </p>
    )
  }

  if (lyrics.lines.length > 0) {
    return (
      <div
        className="flex min-h-[3.25rem] flex-1 items-center justify-center px-2 py-2 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {activeLine ? (
          <p
            key={`${activeLine.timeMs}-${active}`}
            className={cn(
              "text-[13px] font-semibold leading-snug transition-opacity duration-200",
              !themed && "text-black/90 dark:text-white/90",
            )}
          >
            {activeLine.text}
          </p>
        ) : (
          <p
            className={cn(
              "text-[12px] font-medium",
              themed ? "text-[color:var(--sp-subtle)]" : "text-black/35 dark:text-white/35",
            )}
            aria-hidden
          >
            &nbsp;
          </p>
        )}
      </div>
    )
  }

  if (lyrics.plainLyrics) {
    return (
      <p
        className={cn(
          "py-2 text-center text-[12px] font-medium",
          themed ? "text-[color:var(--sp-subtle)]" : "text-black/35 dark:text-white/35",
        )}
      >
        No synced lyrics for this track
      </p>
    )
  }

  return null
}
