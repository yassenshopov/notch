import { Monitor, Pause, Play, RefreshCw, SkipBack, SkipForward, Tv } from "lucide-react"
import type { ReactNode } from "react"
import { usePiDisplay } from "../hooks/usePiDisplay"
import { piDisplayErrorMessage } from "../lib/pi-display"
import { formatMs, type SpotifyAction, type SpotifyStatus } from "../lib/spotify"
import { PI_PANEL_RED } from "../lib/pi-theme"
import { cn } from "../lib/utils"
import { usePanelLayout } from "../lib/panel-layout"

type Props = {
  spotify: SpotifyStatus
  onTvAction: (action: SpotifyAction) => void
}

export function PiTvPanel({ spotify, onTvAction }: Props) {
  const desktop = usePanelLayout() === "desktop"
  const { nowPlaying, mode, loading, switchingMode, refresh, changeMode } = usePiDisplay(true)

  const duration = nowPlaying.durationMs ?? 0
  const progress = Math.min(duration, nowPlaying.progressMs ?? 0)
  const pct = duration > 0 ? (progress / duration) * 100 : 0
  const transportDisabled = !spotify.configured || !spotify.connected

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <Tv className="size-4 opacity-70" aria-hidden />
            TV display
          </p>
          <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
            Layout on HDMI · playback targets Raspotify on the Pi
            {nowPlaying.connected ? (
              <span className="text-black/35 dark:text-white/35"> · ssh {nowPlaying.host}</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-full p-2 text-black/45 transition hover:bg-black/6 hover:text-black/70 dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white/80"
          aria-label="Refresh TV display"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </button>
      </div>

      {!nowPlaying.connected && (
        <p className="rounded-2xl bg-black/5 px-4 py-3 text-[13px] text-black/55 dark:bg-white/8 dark:text-white/55">
          {piDisplayErrorMessage(nowPlaying.error)}
        </p>
      )}

      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
          Layout
        </p>
        <div className={cn("grid gap-2", desktop ? "grid-cols-9" : "grid-cols-3")}>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => {
            const active = mode === n
            return (
              <button
                key={n}
                type="button"
                disabled={!nowPlaying.connected || switchingMode}
                onClick={() => void changeMode(n)}
                className={cn(
                  "flex aspect-[4/3] flex-col items-center justify-center rounded-xl border text-[13px] font-semibold tabular-nums transition",
                  active
                    ? "border-transparent text-white shadow-sm"
                    : "border-black/10 bg-black/[0.03] text-black/55 hover:bg-black/[0.06] dark:border-white/12 dark:bg-white/[0.06] dark:text-white/55 dark:hover:bg-white/10",
                  (!nowPlaying.connected || switchingMode) && "opacity-50",
                )}
                style={active ? { backgroundColor: PI_PANEL_RED } : undefined}
              >
                <Monitor className="mb-1 size-3.5 opacity-80" aria-hidden />
                {n}
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-black/8 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
          On TV now
        </p>
        {nowPlaying.playing && nowPlaying.track ? (
          <div className="flex gap-3">
            {nowPlaying.artUrl ? (
              <img
                src={nowPlaying.artUrl}
                alt=""
                className="size-16 shrink-0 rounded-lg object-cover shadow-sm"
              />
            ) : (
              <div className="size-16 shrink-0 rounded-lg bg-black/10 dark:bg-white/10" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold tracking-tight">{nowPlaying.track}</p>
              <p className="truncate text-[13px] text-black/50 dark:text-white/50">
                {nowPlaying.artist}
              </p>
              {duration > 0 && (
                <div className="mt-2">
                  <div className="h-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: PI_PANEL_RED }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] tabular-nums text-black/40 dark:text-white/40">
                    {formatMs(progress)} / {formatMs(duration)}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-black/45 dark:text-white/45">
            Nothing playing on the TV widget right now.
          </p>
        )}
      </section>

      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
          Playback
        </p>
        {transportDisabled ? (
          <p className="text-[13px] text-black/45 dark:text-white/45">
            Connect Spotify in Notch to control the Pi speaker.
          </p>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <TransportButton label="Previous" onClick={() => onTvAction("previous")}>
              <SkipBack className="size-5" />
            </TransportButton>
            <TransportButton
              label={nowPlaying.playing ? "Pause" : "Play"}
              primary
              onClick={() => onTvAction(nowPlaying.playing ? "pause" : "play")}
            >
              {nowPlaying.playing ? <Pause className="size-5" /> : <Play className="size-5" />}
            </TransportButton>
            <TransportButton label="Next" onClick={() => onTvAction("next")}>
              <SkipForward className="size-5" />
            </TransportButton>
          </div>
        )}
      </section>
    </div>
  )
}

function TransportButton({
  children,
  label,
  onClick,
  primary,
}: {
  children: ReactNode
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-11 items-center justify-center rounded-full transition",
        primary
          ? "bg-[#111] text-white dark:bg-white dark:text-[#111]"
          : "bg-black/8 text-black/70 hover:bg-black/12 dark:bg-white/12 dark:text-white/80 dark:hover:bg-white/18",
      )}
    >
      {children}
    </button>
  )
}
