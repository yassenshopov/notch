import { ChevronDown, ExternalLink } from "lucide-react"
import { useState } from "react"
import type { StravaActivitySummary } from "../lib/strava"
import {
  activityKind,
  fetchStravaActivity,
  formatDistance,
  formatDuration,
  formatPace,
  openStravaUrl,
} from "../lib/strava"
import { cn } from "../lib/utils"
import { StravaOsmMap } from "./StravaOsmMap"
import { StravaRouteThumbnail } from "./StravaRouteThumbnail"

type Props = {
  activities: StravaActivitySummary[]
  loading?: boolean
  /** Flatter rows for full desktop page */
  listStyle?: "card" | "plain"
}

function formatActivityDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatSpeedKmh(metersPerSecond: number) {
  if (!metersPerSecond || !Number.isFinite(metersPerSecond)) return "—"
  return `${(metersPerSecond * 3.6).toFixed(1)} km/h`
}

function kindLabel(type: string) {
  const kind = activityKind(type)
  if (kind === "run") return "Run"
  if (kind === "ride") return "Ride"
  if (kind === "swim") return "Swim"
  if (kind === "workout") return "Workout"
  return type
}

export function StravaActivityAccordion({
  activities,
  loading,
  listStyle = "card",
}: Props) {
  const plain = listStyle === "plain"
  const [openId, setOpenId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, StravaActivitySummary>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const toggle = (activity: StravaActivitySummary) => {
    if (openId === activity.id) {
      setOpenId(null)
      return
    }
    setOpenId(activity.id)
    if (details[activity.id]) return

    setLoadingId(activity.id)
    void fetchStravaActivity(activity.id)
      .then((detail) => {
        setDetails((prev) => ({ ...prev, [activity.id]: detail }))
      })
      .catch(() => {
        setDetails((prev) => ({ ...prev, [activity.id]: activity }))
      })
      .finally(() => {
        setLoadingId((id) => (id === activity.id ? null : id))
      })
  }

  if (loading && activities.length === 0) {
    return <p className="text-[12px] text-black/40 dark:text-white/40">Loading activities…</p>
  }

  if (activities.length === 0) {
    return <p className="text-[12px] text-black/40 dark:text-white/40">No activities yet.</p>
  }

  return (
    <ul className={cn(plain ? "divide-y divide-black/8 dark:divide-white/10" : "space-y-1.5")}>
      {activities.map((activity) => {
        const open = openId === activity.id
        const detail = details[activity.id] ?? activity
        const mapLoading = open && loadingId === activity.id
        const kind = activityKind(detail.type)

        return (
          <li
            key={activity.id}
            className={cn(
              !plain &&
                "overflow-hidden rounded-xl border border-black/8 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(activity)}
              className={cn(
                "flex w-full items-center gap-2.5 text-left",
                plain ? "py-3.5" : "px-2.5 py-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold">{activity.name}</span>
                <span className="mt-0.5 block text-[10px] text-black/40 dark:text-white/40">
                  {formatActivityDate(activity.startDate)} · {kindLabel(activity.type)} ·{" "}
                  {formatDistance(activity.distance)}
                </span>
              </span>
              {!open ? (
                <StravaRouteThumbnail polyline={detail.polyline ?? activity.polyline} />
              ) : null}
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-black/35 transition-transform dark:text-white/35",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            {open ? (
              <div
                className={cn(
                  "pb-3 pt-2",
                  plain
                    ? "border-t border-black/6 dark:border-white/8"
                    : "border-t border-black/6 px-2.5 pb-2.5 pt-2 dark:border-white/8",
                )}
              >
                {mapLoading ? (
                  <div
                    className="mb-2 flex items-center justify-center rounded-xl border border-black/8 bg-black/[0.03] text-[11px] text-black/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/40"
                    style={{ height: 168 }}
                  >
                    Loading map…
                  </div>
                ) : (
                  <StravaOsmMap polyline={detail.polyline} className="mb-2" height={168} />
                )}

                <div className="mb-2 grid grid-cols-2 gap-1.5">
                  <MiniStat label="Distance" value={formatDistance(detail.distance)} />
                  <MiniStat label="Moving time" value={formatDuration(detail.movingTime)} />
                  <MiniStat
                    label={kind === "run" ? "Pace" : "Avg speed"}
                    value={
                      kind === "run" && detail.distance > 0
                        ? formatPace(detail.movingTime / (detail.distance / 1000))
                        : formatSpeedKmh(detail.averageSpeed)
                    }
                  />
                  <MiniStat label="Elevation" value={`${Math.round(detail.elevation)} m`} />
                </div>

                <button
                  type="button"
                  onClick={() => openStravaUrl(detail.url)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#fc4c02] hover:underline"
                >
                  Open on Strava
                  <ExternalLink className="size-3" aria-hidden />
                </button>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/[0.03] px-2 py-1.5 dark:bg-white/[0.04]">
      <p className="text-[10px] text-black/40 dark:text-white/40">{label}</p>
      <p className="text-[11px] font-semibold tabular-nums">{value}</p>
    </div>
  )
}
