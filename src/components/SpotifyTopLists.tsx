import type { SpotifyTopArtist, SpotifyTopTrack } from "../lib/spotify-insights"
import { formatListeningMinutes } from "../lib/spotify-insights"
import { cn } from "../lib/utils"

type Props = {
  topArtists: SpotifyTopArtist[]
  topTracks: SpotifyTopTrack[]
  onPlayUri?: (uri: string) => void
  className?: string
}

export function SpotifyTopLists({ topArtists, topTracks, onPlayUri, className }: Props) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-2", className)}>
      <RankedList
        title="Top artists"
        artShape="circle"
        rows={topArtists.map((a) => ({
          key: a.name,
          primary: a.name,
          secondary: `${formatListeningMinutes(a.ms)} · ${a.plays.toLocaleString()} plays`,
          artUrl: a.artUrl,
        }))}
      />
      <RankedList
        title="Top tracks"
        artShape="square"
        rows={topTracks.map((t) => ({
          key: t.uri || `${t.name}-${t.artist}`,
          primary: t.name,
          secondary: [t.artist, formatListeningMinutes(t.ms), `${t.plays.toLocaleString()} plays`]
            .filter(Boolean)
            .join(" · "),
          uri: t.uri,
          artUrl: t.artUrl,
        }))}
        onPlayUri={onPlayUri}
      />
    </div>
  )
}

type Row = {
  key: string
  primary: string
  secondary: string
  uri?: string | null
  artUrl?: string | null
}

function RankedList({
  title,
  rows,
  onPlayUri,
  artShape,
}: {
  title: string
  rows: Row[]
  onPlayUri?: (uri: string) => void
  artShape: "circle" | "square"
}) {
  if (!rows.length) {
    return (
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          {title}
        </h3>
        <p className="mt-3 text-[13px] text-black/45 dark:text-white/45">No data for this year.</p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
        {title}
      </h3>
      <ol className="mt-3 space-y-2">
        {rows.map((row, index) => {
          const content = (
            <>
              <span className="w-6 shrink-0 text-[12px] tabular-nums text-black/35 dark:text-white/35">
                {index + 1}
              </span>
              <RankArt url={row.artUrl} shape={artShape} label={row.primary} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{row.primary}</p>
                <p className="truncate text-[12px] text-black/45 dark:text-white/45">{row.secondary}</p>
              </div>
            </>
          )
          if (row.uri && onPlayUri) {
            return (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlayUri(row.uri!)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-1 py-1.5 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                >
                  {content}
                </button>
              </li>
            )
          }
          return (
            <li key={row.key} className="flex items-center gap-2.5 px-1 py-1.5">
              {content}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function RankArt({
  url,
  shape,
  label,
}: {
  url?: string | null
  shape: "circle" | "square"
  label: string
}) {
  const rounded = shape === "circle" ? "rounded-full" : "rounded-md"
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={cn("size-10 shrink-0 border border-black/10 object-cover dark:border-white/12", rounded)}
        draggable={false}
      />
    )
  }
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center border border-black/[0.08] bg-black/[0.04] text-[11px] font-semibold text-black/35 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/35",
        rounded,
      )}
      aria-hidden
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}