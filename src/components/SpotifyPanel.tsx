import { Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { CSSProperties, ReactNode } from "react"
import type { AlbumPalette } from "../lib/album-color"
import { formatMs, type SpotifyStatus } from "../lib/spotify"
import { cn } from "../lib/utils"
import { EqualizerBars } from "./EqualizerBars"

type Props = {
  status: SpotifyStatus
  onAction: (action: "play" | "pause" | "next" | "previous") => void
  onConnect: () => void
  connecting?: boolean
  palette?: AlbumPalette | null
}

export function SpotifyPanel({ status, onAction, onConnect, connecting, palette }: Props) {
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

  if (!status.track) {
    return <EmptyState title="Spotify" body="Nothing playing right now." />
  }

  const { track } = status
  const duration = status.durationMs ?? 0
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

  return (
    <div className="flex h-full flex-col pb-2" style={style}>
      <header className="flex items-center justify-between gap-3 pr-10">
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

      <div className="mt-5 flex flex-1 flex-col items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.8 }}
            className="flex w-full flex-col items-center"
          >
            <div
              className={cn(
                "relative aspect-square w-[72%] max-w-[220px] overflow-hidden rounded-[28px]",
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

            <div className="mt-6 w-full min-w-0 px-1 text-center">
              <p className="truncate text-[22px] font-semibold leading-tight tracking-tight">
                {track.name}
              </p>
              <p
                className={cn(
                  "mt-1.5 truncate text-[14px]",
                  themed ? "text-[color:var(--sp-muted)]" : "text-black/50 dark:text-white/50",
                )}
              >
                {track.artists}
              </p>
              {track.album ? (
                <p
                  className={cn(
                    "mt-1 truncate text-[12px]",
                    themed ? "text-[color:var(--sp-subtle)]" : "text-black/30 dark:text-white/30",
                  )}
                >
                  {track.album}
                </p>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-auto w-full pt-8">
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
