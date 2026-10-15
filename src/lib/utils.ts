import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ClockFormat } from "../config/settings"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTemp(value: number, unit: "celsius" | "fahrenheit" = "celsius") {
  const rounded = Math.round(value)
  return unit === "celsius" ? `${rounded}°` : `${rounded}°`
}

export function formatDateLong(date = new Date()) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function formatShortDate(isoDate: string) {
  const d = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`)
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

function hour12(format: ClockFormat) {
  return format === "12h"
}

export function formatHour(iso: string, format: ClockFormat) {
  const d = new Date(iso)
  return d
    .toLocaleTimeString(undefined, { hour: "numeric", hour12: hour12(format) })
    .replace(" ", "")
}

export function formatClock(iso: string, format: ClockFormat) {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: hour12(format),
  })
}

export function parseSunTime(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isFinite(ms) ? ms : null
}

export function windDirection(degrees: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  return dirs[Math.round(degrees / 45) % 8]
}

/** Normalize meteorological degrees (0–360, wind FROM). */
export function normalizeWindDegrees(degrees: number) {
  const d = Number.isFinite(degrees) ? degrees : 0
  return ((d % 360) + 360) % 360
}
