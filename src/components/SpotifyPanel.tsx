import { Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { useSettings } from "../config/settings-store"
import { useSpotifyLyrics } from "../hooks/useSpotifyLyrics"
import type { AlbumPalette } from "../lib/album-color"
import {
  fetchSpotifyRecentlyPlayed,
  formatMs,
  type SpotifyRecentItem,
  type SpotifyStatus,
} from "../lib/spotify"
import { cn } from "../lib/utils"
import { EqualizerBars } from "./EqualizerBars"
import { usePanelLayout } from "../lib/panel-layout"
import { BentoGrid, BentoTile, bentoPad } from "./desktop/DesktopBento"
import { SpotifyLyrics } from "./SpotifyLyrics"

type Props = {
  status: SpotifyStatus
  onAction: (action: "play" | "pause" | "next" | "previous") => void
  onPlayUri: (uri: string) => void
  onConnect: () => void
  connecting?: boolean
  palette?: AlbumPalette | null
}

export function SpotifyPanel({
  status,
  onAction,
  onPlayUri,
  onConnect,
  connecting,
  palette,
}: Props) {
  const settings = useSettings()
  const desktop = usePanelLayout() === "desktop"
  const showLyrics = settings.spotify.showLyrics ?? true
  const track = status.track
  const duration = status.durationMs ?? 0
  const { lyrics, loading: lyricsLoading } = useSpotifyLyrics({
    enabled: showLyrics && status.connected && Boolean(track),
    track,
    durationMs: duration,
  })

  if (!status.configured) {
    return (
      <EmptyState
        title="Spotify"
        body={
          <>
            Add your Spotify keys to <span className="font-medium">.env</span> to enable Now
            Playing.
          </>
        }
      />
    )
  }

  if (!status.connected) {
    return (
      <EmptyState
        title="Spotify"
        body="Connect once to show what’s playing in the notch."
        action={
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onConnect()
            }}
            className="rounded-full bg-[#111] px-5 py-2.5 text-[13px] font-semibold text-white dark:bg-white dark:text-[#111]"
          >
            {connecting ? "Waiting…" : "Connect Spotify"}
          </button>
        }
      />
    )
  }

  if (!track) {
    return (
      <SpotifyIdlePanel
        onAction={onAction}
        onPlayUri={onPlayUri}
      />
    )
  }

  const progress = Math.min(duration, status.progressMs ?? 0)
  const pct = duration > 0 ? (progress / duration) * 100 : 0
  const themed = Boolean(palette)

  const style = palette
    ? ({
        color: palette.fg,
        "--sp-muted": palette.muted,
        "--sp-subtle": palette.subtle,
        "--sp-control": palette.control,
        "--sp-control-fg": palette.controlFg,
      } as CSSProperties)
    : undefined

  const nowPlaying = (
    <div className={cn("flex min-h-0 flex-col pb-2", desktop && "h-full")} style={style}>
      <header className="flex shrink-0 items-center justify-between gap-3 pr-10 lg:pr-0">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.16em]",
            themed ? "text-[color:var(--sp-subtle)]" : "text-black/40 dark:text-white/40",
          )}
        >
          Now playing
        </p>
        {status.isPlaying ? (
          <EqualizerBars
            active
            className={themed ? "text-[color:var(--sp-muted)]" : "text-black/50 dark:text-white/50"}
          />
        ) : (
          <span
            className={cn(
              "text-[11px] font-medium",
              themed ? "text-[color:var(--sp-subtle)]" : "text-black/30 dark:text-white/30",
            )}
          >
            Paused
          </span>
        )}
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center",
          showLyrics && !desktop ? "mt-3" : "mt-5",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.8 }}
            className="flex w-full shrink-0 flex-col items-center"
          >
            <div
              className={cn(
                "relative aspect-square overflow-hidden rounded-[28px]",
                showLyrics ? "w-[56%] max-w-[168px]" : "w-[72%] max-w-[220px]",
                themed ? "bg-black/20" : "bg-black/5 dark:bg-white/10",
              )}
            >
              {track.artUrl ? (
                <img
                  src={track.artUrl}
                  alt=""
                  className="size-full object-cover"
                  draggable={false}
                  crossOrigin="anonymous"
                />
              ) : (
                <div
                  className={cn(
                    "flex size-full items-center justify-center text-[13px]",
                    themed ? "text-[color:var(--sp-subtle)]" : "text-black/30 dark:text-white/30",
                  )}
                >
                  No art
                </div>
              )}
            </div>

            <div
              className={cn(
                "w-full min-w-0 px-1 text-center",
                showLyrics ? "mt-3" : "mt-6",
              )}
            >
              <p
                className={cn(
                  "truncate font-semibold leading-tight tracking-tight",
                  showLyrics ? "text-[18px]" : "text-[22px]",
                )}
              >
                {track.name}
              </p>
              <p
                className={cn(
                  "mt-1 truncate text-[14px]",
                  themed ? "text-[color:var(--sp-muted)]" : "text-black/50 dark:text-white/50",
                )}
              >
                {track.artists}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {showLyrics && !desktop ? (
          <SpotifyLyrics
            lyrics={lyrics}
            loading={lyricsLoading}
            progressMs={progress}
            themed={themed}
          />
        ) : null}

        <div className={cn("mt-auto w-full shrink-0", showLyrics && !desktop ? "pt-3" : "pt-8")}>
          <div
            className={cn(
              "h-[3px] overflow-hidden rounded-full",
              themed ? "bg-white/20" : "bg-black/10 dark:bg-white/12",
            )}
          >
            <motion.div
              className="h-full rounded-full bg-current"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.25, ease: "linear" }}
            />
          </div>
          <div
            className={cn(
              "mt-2 flex justify-between text-[11px] tabular-nums",
              themed ? "text-[color:var(--sp-subtle)]" : "text-black/40 dark:text-white/40",
            )}
          >
            <span>{formatMs(progress)}</span>
            <span>{formatMs(duration)}</span>
          </div>

          <div className="mt-5 flex items-center justify-center gap-6">
            <Control
              label="Previous"
              themed={themed}
              onClick={() => onAction("previous")}
              icon={<SkipBack className="size-[18px]" strokeWidth={1.75} />}
            />
            <Control
              label={status.isPlaying ? "Pause" : "Play"}
              primary
              themed={themed}
              onClick={() => onAction(status.isPlaying ? "pause" : "play")}
              icon={
                status.isPlaying ? (
                  <Pause className="size-5" strokeWidth={1.75} fill="currentColor" />
                ) : (
                  <Play
                    className="size-5 translate-x-[1px]"
                    strokeWidth={1.75}
                    fill="currentColor"
                  />
                )
              }
            />
            <Control
              label="Next"
              themed={themed}
              onClick={() => onAction("next")}
              icon={<SkipForward className="size-[18px]" strokeWidth={1.75} />}
            />
          </div>
        </div>
      </div>
    </div>
  )

  if (desktop) {
    return (
      <BentoGrid>
        <BentoTile col={5} className={bentoPad()}>{nowPlaying}</BentoTile>
        <BentoTile col={7} className={bentoPad()}>
          {showLyrics ? (
            <SpotifyLyrics
              lyrics={lyrics}
              loading={lyricsLoading}
              progressMs={progress}
              themed={themed}
            />
          ) : (
            <p className="text-[13px] text-black/45 dark:text-white/45">
              Enable lyrics in Settings to see them here.
            </p>
          )}
        </BentoTile>
      </BentoGrid>
    )
  }

  return nowPlaying
}

function SpotifyIdlePanel({
  onAction,
  onPlayUri,
}: {
  onAction: (action: "play" | "pause" | "next" | "previous") => void
  onPlayUri: (uri: string) => void
}) {
  const [recent, setRecent] = useState<SpotifyRecentItem[]>([])
  const [recentLoading, setRecentLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setRecentLoading(true)
    void fetchSpotifyRecentlyPlayed(6)
      .then((items) => {
        if (!cancelled) setRecent(items)
      })
      .catch(() => {
        if (!cancelled) setRecent([])
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      className="notch-scroll flex h-full min-h-0 flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="shrink-0 pr-10">
        <p className="text-[15px] font-semibold tracking-tight">Spotify</p>
        <p className="mt-1 text-[12px] leading-relaxed text-black/45 dark:text-white/45">
          Nothing playing — resume playback or jump back into something recent.
        </p>
      </header>

      <div className="mt-6 flex shrink-0 items-center justify-center gap-5">
        <Control label="Previous" onClick={() => onAction("previous")} icon={<SkipBack className="size-[18px]" strokeWidth={1.75} />} />
        <Control
          label="Play"
          primary
          onClick={() => onAction("play")}
          icon={<Play className="size-5 translate-x-[1px]" strokeWidth={1.75} fill="currentColor" />}
        />
        <Control label="Next" onClick={() => onAction("next")} icon={<SkipForward className="size-[18px]" strokeWidth={1.75} />} />
      </div>

      <div className="mt-6 min-h-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/40 dark:text-white/40">
          Listen again
        </p>
        {recentLoading ? (
          <p className="mt-4 text-[13px] text-black/35 dark:text-white/35">Loading recent tracks…</p>
        ) : recent.length === 0 ? (
          <p className="mt-4 text-[13px] leading-relaxed text-black/45 dark:text-white/45">
            Open Spotify on this PC or your phone, then hit Play here to wake your active device.
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {recent.map(({ track }) => (
              <li key={track.id}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlayUri(track.uri)
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-black/[0.04] active:bg-black/[0.06] dark:hover:bg-white/[0.06] dark:active:bg-white/[0.08]"
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
                    <p className="mt-0.5 truncate text-[12px] text-black/45 dark:text-white/45">
                      {track.artists}
                    </p>
                  </div>
                  <Play className="size-4 shrink-0 opacity-35" strokeWidth={1.75} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
      <div>
        <p className="text-[15px] font-semibold tracking-tight">{title}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-black/45 dark:text-white/45">{body}</p>
      </div>
      {action}
    </div>
  )
}

function Control({
  label,
  onClick,
  icon,
  primary,
  themed,
}: {
  label: string
  onClick: () => void
  icon: ReactNode
  primary?: boolean
  themed?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        "flex items-center justify-center rounded-full transition-transform active:scale-95",
        primary
          ? themed
            ? "size-14 bg-[color:var(--sp-control)] text-[color:var(--sp-control-fg)]"
            : "size-14 bg-[#111] text-white dark:bg-white dark:text-[#111]"
          : themed
            ? "size-11 opacity-80 hover:opacity-100"
            : "size-11 text-current opacity-70 hover:opacity-100",
      )}
    >
      {icon}
    </button>
  )
}
