import { ExternalLink, Flame, RefreshCw } from "lucide-react"
import type { StravaActivitySummary, StravaStatus } from "../lib/strava"
import {
  activityKind,
  formatDistance,
  formatDuration,
  formatPace,
  openStravaUrl,
} from "../lib/strava"
import { cn } from "../lib/utils"
import { StravaActivityAccordion } from "./StravaActivityAccordion"
import { StravaActivityCalendar } from "./StravaActivityCalendar"
import { usePanelLayout } from "../lib/panel-layout"
import { PanelHeaderActions } from "./PanelHeaderActions"
import { StravaOsmMap } from "./StravaOsmMap"
import { StravaRouteHeatmap } from "./StravaRouteHeatmap"

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
  const layout = usePanelLayout()
  const desktop = layout === "desktop"

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

  const streakCard = (
      <div className="flex items-center gap-3 rounded-2xl border border-[#fc4c02]/25 bg-[#fc4c02]/10 px-3 py-2.5">
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
  )

  const header = (
      <header className="mb-4 flex items-start justify-between gap-2 pr-8 lg:mb-0 lg:pr-0">
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
        <PanelHeaderActions>
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
        </PanelHeaderActions>
      </header>
  )

  if (desktop) {
    const featured = status.featuredActivity
    const streakActivities = status.streak?.activitiesInStreak ?? 0

    return (
      <div className="space-y-10" onClick={(e) => e.stopPropagation()}>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {status.avatarUrl ? (
              <img
                src={status.avatarUrl}
                alt=""
                className="size-11 rounded-full border border-black/10 dark:border-white/15"
              />
            ) : (
              <span className="flex size-11 items-center justify-center rounded-full bg-[#fc4c02]/15 text-[#fc4c02]">
                <Flame className="size-5" strokeWidth={2} aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold tracking-tight">Strava</h1>
              <p className="text-[13px] text-black/45 dark:text-white/45">{status.login}</p>
            </div>
          </div>
          <PanelHeaderActions>
            {onDisconnect ? (
              <button
                type="button"
                onClick={onDisconnect}
                className="rounded-full px-3 py-1.5 text-[12px] text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/10"
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
          </PanelHeaderActions>
        </header>

        <div className="grid gap-6 border-b border-black/8 pb-8 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10">
          <HeroStat
            label="Weekly streak"
            value={`${streakWeeks}`}
            suffix={streakWeeks === 1 ? "week" : "weeks"}
            hint={
              streakActivities > 0
                ? `${streakActivities} activities in streak`
                : "Keep moving each week"
            }
            accent
          />
          <HeroStat
            label="This month"
            value={formatDistance(status.monthDistance)}
            hint="Distance logged"
          />
          {status.stats ? (
            <>
              <HeroStat label="YTD run" value={formatDistance(status.stats.ytdRunDistance)} />
              <HeroStat label="YTD ride" value={formatDistance(status.stats.ytdRideDistance)} />
            </>
          ) : null}
        </div>

        {status.stats ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <InlineStat label="Last 4 weeks · run" value={formatDistance(status.stats.recentRunDistance)} />
            <InlineStat label="Last 4 weeks · ride" value={formatDistance(status.stats.recentRideDistance)} />
            <InlineStat label="Last 4 weeks · swim" value={formatDistance(status.stats.recentSwimDistance)} />
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          {status.calendarActivities.length > 0 || status.calendar ? (
            <section className="min-w-0 lg:col-span-5">
              <SectionLabel>Calendar</SectionLabel>
              <StravaActivityCalendar
                activities={status.calendarActivities}
                calendar={status.calendar}
                variant="panel"
                surface={false}
              />
            </section>
          ) : null}
          <section
            className={cn(
              "min-w-0",
              status.calendarActivities.length > 0 || status.calendar ? "lg:col-span-7" : "lg:col-span-12",
            )}
          >
            <SectionLabel>Where you move</SectionLabel>
            <p className="mb-3 text-[12px] text-black/40 dark:text-white/40">
              Route density from your latest GPS activities
            </p>
            <StravaRouteHeatmap heatmap={status.heatmap} height={380} className="rounded-2xl" />
          </section>
        </div>

        {featured ? (
          <section>
            <SectionLabel>Featured route</SectionLabel>
            <FeaturedActivity activity={featured} />
          </section>
        ) : null}

        <section>
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <SectionLabel className="mb-0">Recent activities</SectionLabel>
            <span className="text-[11px] tabular-nums text-black/35 dark:text-white/35">
              {status.activities.length}
            </span>
          </div>
          <StravaActivityAccordion
            activities={status.activities}
            loading={loading}
            listStyle="plain"
          />
        </section>
      </div>
    )
  }

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      {header}
      <div className="mb-4">{streakCard}</div>

      <div className={cn(desktop && "mb-4 grid gap-4 lg:grid-cols-2")}>
        {status.calendarActivities.length > 0 || status.calendar ? (
          <StravaActivityCalendar
            activities={status.calendarActivities}
            calendar={status.calendar}
            variant="panel"
            className={cn(!desktop && "mb-4")}
          />
        ) : null}

        <section className={cn(!desktop && "mb-4")}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
            Route heatmap
          </p>
          <StravaRouteHeatmap heatmap={status.heatmap} height={desktop ? 320 : 200} />
          <p className="mt-1.5 text-[10px] text-black/35 dark:text-white/35">
            Density from your last ~40 activities with GPS
          </p>
        </section>
      </div>

      {status.stats ? (
        <section className={cn("mb-4 grid gap-2", desktop ? "grid-cols-3 md:grid-cols-6" : "grid-cols-3")}>
          <Stat label="YTD run" value={formatDistance(status.stats.ytdRunDistance)} />
          <Stat label="YTD ride" value={formatDistance(status.stats.ytdRideDistance)} />
          <Stat label="YTD swim" value={formatDistance(status.stats.ytdSwimDistance)} />
        </section>
      ) : null}

      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          Activities
        </p>
        <StravaActivityAccordion activities={status.activities} loading={loading} />
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

function SectionLabel({ children, className }: { children: string; className?: string }) {
  return (
    <p
      className={cn(
        "mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40",
        className,
      )}
    >
      {children}
    </p>
  )
}

function HeroStat({
  label,
  value,
  suffix,
  hint,
  accent,
}: {
  label: string
  value: string
  suffix?: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-[28px] font-bold tabular-nums tracking-tight",
            accent && "text-[#fc4c02]",
          )}
        >
          {value}
        </span>
        {suffix ? (
          <span className="text-[13px] font-medium text-black/45 dark:text-white/45">{suffix}</span>
        ) : null}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-black/40 dark:text-white/40">{hint}</p> : null}
    </div>
  )
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/6 pb-2 dark:border-white/8">
      <span className="text-[12px] text-black/45 dark:text-white/45">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function FeaturedActivity({ activity }: { activity: StravaActivitySummary }) {
  const kind = activityKind(activity.type)
  const paceOrSpeed =
    kind === "run" && activity.distance > 0
      ? formatPace(activity.movingTime / (activity.distance / 1000))
      : activity.averageSpeed > 0
        ? `${(activity.averageSpeed * 3.6).toFixed(1)} km/h`
        : "—"

  const date = new Date(activity.startDate).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <StravaOsmMap polyline={activity.polyline} height={280} className="rounded-2xl" />
      <div className="min-w-0">
        <p className="text-[17px] font-semibold tracking-tight">{activity.name}</p>
        <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
          {date} · {activity.type}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
          <FeaturedMetric label="Distance" value={formatDistance(activity.distance)} />
          <FeaturedMetric label="Moving time" value={formatDuration(activity.movingTime)} />
          <FeaturedMetric label={kind === "run" ? "Pace" : "Avg speed"} value={paceOrSpeed} />
          <FeaturedMetric label="Elevation" value={`${Math.round(activity.elevation)} m`} />
        </dl>
        <button
          type="button"
          onClick={() => openStravaUrl(activity.url)}
          className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#fc4c02] hover:underline"
        >
          Open on Strava
          <ExternalLink className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}

function FeaturedMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-black/40 dark:text-white/40">{label}</dt>
      <dd className="text-[14px] font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
