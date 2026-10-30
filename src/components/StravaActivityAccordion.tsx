import { ChevronDown } from "lucide-react"
import { useState } from "react"
import type { StravaActivitySummary } from "../lib/strava"
import { activityKind, formatDistance } from "../lib/strava"
import { cn } from "../lib/utils"
import { StravaActivityRoutePanel } from "./StravaActivityRoutePanel"
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

  const toggle = (activity: StravaActivitySummary) => {
    setOpenId((id) => (id === activity.id ? null : activity.id))
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
              {!open ? <StravaRouteThumbnail polyline={activity.polyline} /> : null}
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
                  "pb-4 pt-2",
                  plain
                    ? "border-t border-black/6 dark:border-white/8"
                    : "border-t border-black/6 px-2.5 pb-3 pt-2 dark:border-white/8",
                )}
              >
                <StravaActivityRoutePanel activity={activity} />
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
