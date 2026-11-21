import { Play } from "lucide-react"
import { useEffect, useState } from "react"
import {
  fetchSpotifyListeningHistory,
  fetchSpotifyRecentlyPlayed,
  formatPlayedAt,
  type SpotifyRecentItem,
} from "../lib/spotify"
import { cn } from "../lib/utils"

type Props = {
  onPlayUri: (uri: string) => void
  recentLimit?: number
  historyLimit?: number
  className?: string
  scrollClassName?: string
}

export function SpotifyListenHistory({
  onPlayUri,
  recentLimit = 6,
  historyLimit = 40,
  className,
  scrollClassName,
}: Props) {
  const [recent, setRecent] = useState<SpotifyRecentItem[]>([])
  const [history, setHistory] = useState<SpotifyRecentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([
      fetchSpotifyRecentlyPlayed(recentLimit),
      fetchSpotifyListeningHistory(historyLimit),
    ])
      .then(([recentItems, historyItems]) => {
        if (cancelled) return
        setRecent(recentItems)
        setHistory(historyItems)
      })
      .catch(() => {
        if (!cancelled) {
          setRecent([])
          setHistory([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [recentLimit, historyLimit])

  const fromNeon = history.length > 0
  const items = fromNeon ? history : recent

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <header className="shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/40 dark:text-white/40">
          {fromNeon ? "Your history" : "Listen again"}
        </p>
        {fromNeon ? (
          <p className="mt-1 text-[11px] leading-relaxed text-black/35 dark:text-white/35">
            Saved in Neon — tap a track to play
          </p>
        ) : null}
      </header>
      <TrackList
        items={items}
        loading={loading}
        onPlayUri={onPlayUri}
        showPlayedAt={fromNeon}
        emptyMessage="Open Spotify and hit Play — plays accumulate here over time."
        className={scrollClassName}
      />
    </div>
  )
}

function TrackList({
  items,
  loading,
  onPlayUri,
  showPlayedAt,
  emptyMessage,
  className,
}: {
  items: SpotifyRecentItem[]
  loading: boolean
  onPlayUri: (uri: string) => void
  showPlayedAt?: boolean
  emptyMessage: string
  className?: string
}) {
  if (loading) {
    return <p className="mt-4 text-[13px] text-black/35 dark:text-white/35">Loading…</p>
  }
  if (items.length === 0) {
    return (
      <p className="mt-4 text-[13px] leading-relaxed text-black/45 dark:text-white/45">{emptyMessage}</p>
    )
  }

  return (
    <ul className={cn("mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1", className)}>
      {items.map(({ track, playedAt }) => {
        const canPlay = Boolean(track.uri)
        return (
          <li key={`${track.id}:${playedAt ?? ""}`}>
            <button
              type="button"
              disabled={!canPlay}
              onClick={(e) => {
                e.stopPropagation()
                if (track.uri) onPlayUri(track.uri)
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors",
                canPlay
                  ? "hover:bg-black/[0.04] active:bg-black/[0.06] dark:hover:bg-white/[0.06] dark:active:bg-white/[0.08]"
                  : "cursor-default opacity-70",
              )}
            >
              <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/10">
                {track.artUrl ? (
                  <img src={track.artUrl} alt="" className="size-full object-cover" draggable={false} />
                ) : (
                  <div className="flex size-full items-center justify-center text-[10px] text-black/30 dark:text-white/30">
                    ♪
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium leading-tight">{track.name}</p>
                <p className="mt-0.5 truncate text-[12px] text-black/45 dark:text-white/45">{track.artists}</p>
              </div>
              {showPlayedAt && playedAt ? (
                <span className="shrink-0 text-[11px] tabular-nums text-black/35 dark:text-white/35">
                  {formatPlayedAt(playedAt)}
                </span>
              ) : (
                <Play className="size-4 shrink-0 opacity-35" strokeWidth={1.75} aria-hidden />
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}