import { useEffect, useRef } from "react"
import { activeLyricIndex, type LyricsResult } from "../lib/lyrics"
import { cn } from "../lib/utils"

type Props = {
  lyrics: LyricsResult
  loading: boolean
  progressMs: number
  themed?: boolean
}

export function SpotifyLyrics({ lyrics, loading, progressMs, themed }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const active = activeLyricIndex(lyrics.lines, progressMs)

  useEffect(() => {
    if (active < 0) return
    const root = scrollRef.current
    const line = root?.querySelector(`[data-line="${active}"]`)
    line?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [active])

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
        ref={scrollRef}
        className="notch-scroll min-h-0 flex-1 overflow-y-auto px-1 py-1 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2.5 pb-4 pt-1">
          {lyrics.lines.map((line, i) => {
            const isActive = i === active
            return (
              <p
                key={`${line.timeMs}-${i}`}
                data-line={i}
                className={cn(
                  "text-[13px] leading-snug transition-[opacity,transform] duration-200",
                  isActive
                    ? "scale-[1.02] font-semibold opacity-100"
                    : themed
                      ? "font-medium text-[color:var(--sp-subtle)] opacity-55"
                      : "font-medium text-black/35 opacity-60 dark:text-white/35",
                )}
              >
                {line.text}
              </p>
            )
          })}
        </div>
      </div>
    )
  }

  if (lyrics.plainLyrics) {
    return (
      <div
        className="notch-scroll min-h-0 flex-1 overflow-y-auto px-1 py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className={cn(
            "whitespace-pre-wrap text-center text-[12px] leading-relaxed",
            themed ? "text-[color:var(--sp-muted)]" : "text-black/50 dark:text-white/50",
          )}
        >
          {lyrics.plainLyrics}
        </p>
      </div>
    )
  }

  return null
}
