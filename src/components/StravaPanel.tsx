import { ExternalLink, Flame, RefreshCw } from "lucide-react"
import type { StravaStatus } from "../lib/strava"
import {
  activityKind,
  formatDistance,
  formatDuration,
  formatPace,
  openStravaUrl,
} from "../lib/strava"
import { cn } from "../lib/utils"
import { StravaActivityCalendar } from "./StravaActivityCalendar"
import { StravaRouteHeatmap } from "./StravaRouteHeatmap"
import { StravaRouteMap } from "./StravaRouteMap"

type Props = {
  status: StravaStatus
  loading?: boolean
  refreshing: boolean
  connecting?: boolean
  onRefresh: () => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function StravaPanel({
  status,
  loading,
  refreshing,
  connecting,
  onRefresh,
  onConnect,
  onDisconnect,
}: Props) {
  if (!status.configured) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <p className="text-[15px] font-semibold">Strava</p>
        <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
          Add <span className="font-medium">STRAVA_CLIENT_ID</span> and{" "}
          <span className="font-medium">STRAVA_CLIENT_SECRET</span> to{" "}
          <span className="font-medium">.env</span> (same Strava API app as life-app) and
          restart Notch.
        </p>
      </div>
    )
  }

  if (!status.connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-[15px] font-semibold">Strava</p>
        <p className="text-[12px] text-black/45 dark:text-white/45">
          {status.error ?? status.message ?? "Connect your athlete account"}
        </p>
        {onConnect ? (
          <button
            type="button"
            disabled={connecting}
            onClick={onConnect}
            className="rounded-full bg-[#fc4c02] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {connecting ? "Waiting for browser…" : "Connect Strava"}
          </button>
        ) : null}
      </div>
    )
  }

  const streakWeeks = status.streak?.weeks ?? 0

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-4 flex items-start justify-between gap-2 pr-8">
        <div className="flex items-center gap-2.5">
          {status.avatarUrl ? (
            <img
              src={status.avatarUrl}
              alt=""
              className="size-9 rounded-full border border-black/10 dark:border-white/15"
            />
          ) : null}
          <div>
            <p className="text-[15px] font-semibold tracking-tight">Strava</p>
            <p className="text-[12px] text-black/45 dark:text-white/45">{status.login}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onDisconnect ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="rounded-full px-2 py-1.5 text-[11px] text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/10"
            >
              Disconnect
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Refresh Strava"
            disabled={refreshing}
            onClick={onRefresh}
            className="rounded-full p-2 text-black/40 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-50 dark:text-white/40 dark:hover:bg-white/10"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#fc4c02]/25 bg-[#fc4c02]/10 px-3 py-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#fc4c02] text-white">
          <Flame className="size-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45 dark:text-white/45">
            Weekly streak
          </p>
          <p className="text-[20px] font-bold tabular-nums tracking-tight">
            {streakWeeks} {streakWeeks === 1 ? "week" : "weeks"}
          </p>
        </div>
        <div className="text-right text-[11px] text-black/45 dark:text-white/45">
          <p className="font-semibold text-black/70 dark:text-white/75">
            {formatDistance(status.monthDistance)}
          </p>
          <p>this month</p>
        </div>
      </div>

      {status.calendar ? (
        <StravaActivityCalendar calendar={status.calendar} variant="panel" className="mb-4" />
      ) : null}

      {status.featuredActivity ? (
        <section className="mb-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
              Latest route
            </p>
            <button
              type="button"
              onClick={() => openStravaUrl(status.featuredActivity!.url)}
              className="text-[11px] text-[#fc4c02] hover:underline"
            >
              Open
            </button>
          </div>
          <StravaRouteMap activity={status.featuredActivity} />
          <p className="mt-2 truncate text-[13px] font-semibold">{status.featuredActivity.name}</p>
          <p className="text-[11px] text-black/45 dark:text-white/45">
            {formatDistance(status.featuredActivity.distance)} ·{" "}
            {formatDuration(status.featuredActivity.movingTime)}
            {activityKind(status.featuredActivity.type) === "run" &&
            status.featuredActivity.distance > 0
              ? ` · ${formatPace(
                  status.featuredActivity.movingTime /
                    (status.featuredActivity.distance / 1000),
                )}`
              : null}
          </p>
        </section>
      ) : null}

      <section className="mb-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          Route heatmap
        </p>
        <StravaRouteHeatmap heatmap={status.heatmap} />
        <p className="mt-1.5 text-[10px] text-black/35 dark:text-white/35">
          Density from your last ~40 activities with GPS
        </p>
      </section>

      {status.stats ? (
        <section className="mb-4 grid grid-cols-3 gap-2">
          <Stat label="YTD run" value={formatDistance(status.stats.ytdRunDistance)} />
          <Stat label="YTD ride" value={formatDistance(status.stats.ytdRideDistance)} />
          <Stat label="YTD swim" value={formatDistance(status.stats.ytdSwimDistance)} />
        </section>
      ) : null}

      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          Recent
        </p>
        {loading && status.activities.length === 0 ? (
          <p className="text-[12px] text-black/40 dark:text-white/40">Loading activities…</p>
        ) : status.activities.length === 0 ? (
          <p className="text-[12px] text-black/40 dark:text-white/40">No activities yet.</p>
        ) : (
          <ul className="space-y-1">
            {status.activities.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => openStravaUrl(a.url)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-black/5 dark:hover:bg-white/8"
                >
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{a.name}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-black/40 dark:text-white/40">
                    {formatDistance(a.distance)}
                  </span>
                  <ExternalLink className="size-3 shrink-0 opacity-35" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/8 bg-black/[0.02] px-2 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[10px] text-black/40 dark:text-white/40">{label}</p>
      <p className="text-[12px] font-semibold tabular-nums">{value}</p>
    </div>
  )
}
