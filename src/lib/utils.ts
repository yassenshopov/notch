import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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

export function formatHour(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: "numeric", hour12: true }).replace(" ", "")
}

export function formatClock(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
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
