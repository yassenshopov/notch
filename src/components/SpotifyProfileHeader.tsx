import type { ReactNode } from "react"
import type { SpotifyActivityInsights } from "../lib/spotify-insights"
import { cn } from "../lib/utils"
import { AnimatedNumber } from "./AnimatedNumber"

type Props = {
  insights: SpotifyActivityInsights
  actions?: ReactNode
  className?: string
}

export function SpotifyProfileHeader({ insights, actions, className }: Props) {
  const profile = insights.profile
  const displayName = profile?.displayName?.trim() || "Spotify"
  const avatarUrl = profile?.imageUrl ?? null
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-11 shrink-0 rounded-full border border-black/10 object-cover dark:border-white/15"
          />
        ) : (
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1db954]/15 text-[15px] font-bold text-[#169c46] dark:bg-[#1db954]/20"
            aria-hidden
          >
            ♫
          </span>
        )}
        <div className="min-w-0 space-y-1.5">
          <div>
            <p className="text-[22px] font-semibold tracking-tight">{displayName}</p>
            <p className="text-[13px] text-black/45 dark:text-white/45">Listening library</p>
          </div>

          {insights.ready ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-black/55 dark:text-white/55">
              <span>
                <AnimatedNumber
                  value={insights.totalStreams}
                  format={(n) => n.toLocaleString()}
                  className="text-[12px] font-semibold"
                />{" "}
                streams in Neon
              </span>
              {insights.firstPlayed && insights.lastPlayed ? (
                <>
                  <span className="text-black/25 dark:text-white/25" aria-hidden>
                    ·
                  </span>
                  <span>
                    {formatShortRange(insights.firstPlayed, insights.lastPlayed)}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}

          {insights.lastImport?.finishedAt ? (
            <p className="text-[12px] text-black/45 dark:text-white/45">
              Last import{" "}
              {new Date(insights.lastImport.finishedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {insights.lastImport.rowsInserted
                ? ` · ${insights.lastImport.rowsInserted.toLocaleString()} rows`
                : null}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}

function formatShortRange(fromIso: string, toIso: string) {
  const from = new Date(fromIso)
  const to = new Date(toIso)
  const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" }
  if (from.getFullYear() === to.getFullYear()) {
    return `${from.toLocaleDateString(undefined, { month: "short", year: "numeric" })} – ${to.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
  }
  return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`
}