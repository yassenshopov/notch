import { Icon } from "@iconify/react"
import { Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import type { MediaSessionStatus } from "../lib/media-session"
import { cn } from "../lib/utils"

type Props = {
  status: MediaSessionStatus
  onAction: (action: "toggle" | "next" | "previous") => void
}

export function BrowserMediaPanel({ status, onAction }: Props) {
  const [thumbFailed, setThumbFailed] = useState(false)
  const title = status.title || "Now playing"
  const subtitle = status.artist || status.album || "System media"
  const youtube = status.isYoutube
  const thumbUrl = status.thumbnailUrl
  const showThumb = Boolean(thumbUrl && !thumbFailed)

  useEffect(() => {
    setThumbFailed(false)
  }, [thumbUrl])

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-5 pr-10">
        <div className="flex items-center gap-2">
          {youtube ? (
            <Icon icon="simple-icons:youtube" className="size-5 text-[#FF0000]" aria-hidden />
          ) : null}
          <p className="text-[15px] font-semibold tracking-tight">
            {youtube ? "YouTube" : "Browser media"}
          </p>
        </div>
        <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
          Playback from your browser via Windows system media controls.
        </p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
        <div
          className={cn(
            "relative mb-4 overflow-hidden",
            showThumb
              ? "aspect-square w-[56%] max-w-[168px] rounded-[28px] bg-black/5 dark:bg-white/10"
              : cn(
                  "flex size-24 items-center justify-center rounded-2xl",
                  youtube ? "bg-[#FF0000]/10" : "bg-black/[0.04] dark:bg-white/[0.06]",
                ),
          )}
        >
          {showThumb ? (
            <img
              src={thumbUrl!}
              alt=""
              className="size-full object-cover"
              draggable={false}
              onError={() => setThumbFailed(true)}
            />
          ) : youtube ? (
            <Icon icon="simple-icons:youtube" className="size-10 text-[#FF0000]" aria-hidden />
          ) : (
            <Icon icon="lucide:monitor-play" className="size-10 opacity-50" aria-hidden />
          )}
        </div>
        <p className="max-w-full truncate text-[17px] font-semibold tracking-tight">{title}</p>
        <p className="mt-1 max-w-full truncate text-[13px] text-black/45 dark:text-white/45">
          {subtitle}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-center gap-4 pb-2">
        <MediaButton label="Previous" onClick={() => onAction("previous")}>
          <SkipBack className="size-5" strokeWidth={1.75} />
        </MediaButton>
        <MediaButton
          label={status.playing ? "Pause" : "Play"}
          primary
          onClick={() => onAction("toggle")}
        >
          {status.playing ? (
            <Pause className="size-5" strokeWidth={1.75} />
          ) : (
            <Play className="size-5" strokeWidth={1.75} />
          )}
        </MediaButton>
        <MediaButton label="Next" onClick={() => onAction("next")}>
          <SkipForward className="size-5" strokeWidth={1.75} />
        </MediaButton>
      </div>
    </div>
  )
}

function MediaButton({
  label,
  children,
  onClick,
  primary,
}: {
  label: string
  children: ReactNode
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-11 items-center justify-center rounded-full transition-colors",
        primary
          ? "bg-[#111111] text-white dark:bg-white dark:text-[#111111]"
          : "bg-black/[0.06] hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15",
      )}
    >
      {children}
    </button>
  )
}
