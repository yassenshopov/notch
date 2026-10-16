import { Icon } from "@iconify/react"
import { X } from "lucide-react"
import { motion } from "motion/react"
import type { LiveActivity } from "../lib/live-activities"
import { cn } from "../lib/utils"
import { WeatherIcon } from "./WeatherIcon"

type Props = {
  activity: LiveActivity
  onDismiss?: () => void
}

export function LiveActivityContent({ activity, onDismiss }: Props) {
  const dismissible =
    (activity.kind === "cursor-usage" || activity.kind === "weather-precip") &&
    onDismiss != null

  return (
    <motion.span
      key={activity.id}
      initial={{ opacity: 0, scale: 0.82, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.82, y: -4 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="flex max-w-full items-center justify-center gap-2 px-0.5"
    >
      {activity.kind === "weather-precip" && activity.weatherCode != null ? (
        <WeatherIcon
          code={activity.weatherCode}
          isDay={activity.isDay ?? true}
          className="size-[15px] shrink-0"
        />
      ) : (
        <Icon
          icon="simple-icons:cursor"
          className="size-3.5 shrink-0 opacity-90"
          aria-hidden
        />
      )}
      <span
        className={cn(
          "truncate text-[12px] font-semibold tracking-tight",
          activity.kind === "cursor-usage" && "text-amber-600 dark:text-amber-400",
        )}
      >
        {activity.label}
      </span>
      {dismissible ? (
        <button
          type="button"
          aria-label={
            activity.kind === "weather-precip"
              ? "Dismiss rain alert"
              : "Dismiss Cursor usage reminder"
          }
          className={cn(
            "ml-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
            "opacity-60 transition-opacity hover:opacity-100",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/40",
          )}
          onPointerDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          onClick={(e) => {
            e.stopPropagation()
            onDismiss?.()
          }}
        >
          <X className="size-3" strokeWidth={2.5} />
        </button>
      ) : null}
    </motion.span>
  )
}
