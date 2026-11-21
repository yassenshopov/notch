import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { Clock, Disc3, Play, X } from "lucide-react"
import {
  fetchSpotifyDayDetail,
  formatListeningMinutes,
  type SpotifyDayDetail,
} from "../lib/spotify-insights"
import type { SpotifyListeningDay } from "../lib/spotify-listening"
import { formatListeningHeatmapCount } from "../lib/spotify-listening"
import { notchUi } from "../lib/island-motion"
import { SkeletonBlock } from "./desktop/DesktopSkeleton"

type Props = {
  seed: SpotifyListeningDay | null
  open: boolean
  onClose: () => void
  onPlayUri?: (uri: string) => void
}

function formatDayHeading(date: string) {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function SpotifyListeningDayModal({ seed, open, onClose, onPlayUri }: Props) {
  const [displaySeed, setDisplaySeed] = useState<SpotifyListeningDay | null>(null)
  const [detail, setDetail] = useState<SpotifyDayDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (seed) setDisplaySeed(seed)
  }, [seed])

  useEffect(() => {
    if (!open || !displaySeed?.date) {
      setDetail(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setDetail(null)
    void fetchSpotifyDayDetail(displaySeed.date).then((data) => {
      if (cancelled) return
      setDetail(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, displaySeed?.date])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!displaySeed && !open) return null

  const date = displaySeed?.date ?? ""
  const plays = detail?.plays ?? displaySeed?.plays ?? 0
  const ms = detail?.ms ?? displaySeed?.msPlayed ?? 0
  const minutes = detail?.minutes ?? displaySeed?.count ?? 0
  const featuredName = displaySeed?.trackName ?? detail?.tracks[0]?.name ?? null
  const featuredArtist = displaySeed?.trackArtist ?? detail?.tracks[0]?.artist ?? null
  const featuredArt = displaySeed?.artUrl ?? detail?.tracks[0]?.artUrl ?? null
  const featuredUri = displaySeed?.trackUri ?? detail?.tracks[0]?.uri ?? null

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (!open) {
          setDisplaySeed(null)
          setDetail(null)
        }
      }}
    >
      {open && displaySeed?.date ? (
        <motion.div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={notchUi}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            className="flex max-h-[min(34rem,88vh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#f7f7f5] shadow-2xl dark:border-white/10 dark:bg-[#161616]"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={notchUi}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="spotify-day-title"
          >
            <div className="h-1.5 shrink-0 bg-[#1db954]" aria-hidden />
            <header className="flex items-start gap-3 border-b border-black/8 px-4 py-3 dark:border-white/10">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#169c46] dark:text-[#1ed760]">
                  Listening · {date}
                </p>
                <h2
                  id="spotify-day-title"
                  className="mt-1 text-[18px] font-semibold leading-snug tracking-tight text-black/90 dark:text-white/95"
                >
                  {formatDayHeading(date)}
                </h2>
                <p className="mt-1.5 text-[13px] text-black/55 dark:text-white/72">
                  {formatListeningHeatmapCount(minutes)}
                  {plays > 0 ? ` · ${plays.toLocaleString()} plays` : ""}
                  {ms > 0 ? ` · ${formatListeningMinutes(ms)} total` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="shrink-0 rounded-full p-2 text-black/50 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="notch-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {featuredName ? (
                <div className="mb-5 flex gap-3 rounded-xl border border-black/[0.06] bg-black/[0.02] p-3 dark:border-white/15 dark:bg-white/[0.06]">
                  {featuredArt ? (
                    <img
                      src={featuredArt}
                      alt=""
                      className="size-16 shrink-0 rounded-lg object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#1db954]/15 text-[#169c46]">
                      <Disc3 className="size-7" aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-black/45 dark:text-white/58">
                      Top track
                    </p>
                    <p className="mt-0.5 truncate text-[15px] font-semibold text-black/90 dark:text-white/95">
                      {featuredName}
                    </p>
                    {featuredArtist ? (
                      <p className="truncate text-[13px] text-black/55 dark:text-white/72">
                        {featuredArtist}
                      </p>
                    ) : null}
                    {featuredUri && onPlayUri ? (
                      <button
                        type="button"
                        onClick={() => onPlayUri(featuredUri)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#1db954] px-3 py-1.5 text-[12px] font-semibold text-black hover:bg-[#1ed760]"
                      >
                        <Play className="size-3.5 fill-current" aria-hidden />
                        Play
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : minutes <= 0 && !loading ? (
                <p className="mb-4 text-[13px] text-black/55 dark:text-white/70">
                  No listening recorded for this day in your imported history.
                </p>
              ) : null}

              {loading ? (
                <DayDetailSkeleton />
              ) : detail?.topArtists.length ? (
                <section className="mb-5" aria-label="Top artists">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45 dark:text-white/58">
                    Artists
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {detail.topArtists.map((a) => (
                      <li
                        key={a.name}
                        className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[12px] text-black/85 dark:border-white/22 dark:bg-white/[0.1] dark:text-white/92"
                      >
                        <span className="font-medium">{a.name}</span>
                        <span className="ml-1.5 text-black/50 dark:text-white/62">
                          {formatListeningMinutes(a.ms)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {!loading && detail?.tracks.length ? (
                <section aria-label="Tracks played">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45 dark:text-white/58">
                    Tracks
                  </h3>
                  <ul className="mt-2 flex flex-col">
                    {detail.tracks.map((track) => (
                      <li key={`${track.uri || track.name}-${track.artist}`}>
                        <TrackRow track={track} onPlayUri={onPlayUri} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {!loading && detail?.error ? (
                <p className="text-[12px] text-red-400/90">Couldn&apos;t load day detail.</p>
              ) : null}
            </div>

            <footer className="flex items-center gap-1.5 border-t border-black/8 px-4 py-2.5 text-[11px] text-black/45 dark:border-white/12 dark:text-white/58">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              From your Spotify streaming history import
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

function TrackRow({
  track,
  onPlayUri,
}: {
  track: SpotifyDayDetail["tracks"][number]
  onPlayUri?: (uri: string) => void
}) {
  const playable = Boolean(track.uri && onPlayUri)
  return (
    <div className="flex items-center gap-3 border-b border-black/[0.04] py-2.5 last:border-0 dark:border-white/[0.06]">
      {track.artUrl ? (
        <img src={track.artUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
      ) : (
        <SkeletonBlock className="size-10 shrink-0 rounded-md" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-black/88 dark:text-white/94">
          {track.name}
        </p>
        <p className="truncate text-[12px] text-black/55 dark:text-white/68">
          {[track.artist, formatListeningMinutes(track.ms), `${track.plays} plays`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {playable ? (
        <button
          type="button"
          aria-label={`Play ${track.name}`}
          onClick={() => onPlayUri!(track.uri!)}
          className="shrink-0 rounded-full p-2 text-black/50 hover:bg-black/5 dark:text-white/65 dark:hover:bg-white/10"
        >
          <Play className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

function DayDetailSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <SkeletonBlock className="h-3 w-20" />
      <div className="flex gap-2">
        <SkeletonBlock className="h-7 w-24 rounded-full" />
        <SkeletonBlock className="h-7 w-20 rounded-full" />
      </div>
      <SkeletonBlock className="h-3 w-16" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-3 py-1">
          <SkeletonBlock className="size-10 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3.5 w-[70%]" />
            <SkeletonBlock className="h-3 w-[45%]" />
          </div>
        </div>
      ))}
    </div>
  )
}