import { Icon, addCollection } from "@iconify/react"
import weatherEmoji from "../assets/weather-emoji-icons.json"
import type { WeatherCode } from "../lib/weather"
import { cn } from "../lib/utils"

addCollection(weatherEmoji)

type Props = {
  code: WeatherCode
  isDay?: boolean
  className?: string
}

/** Flat color emoji-style weather glyphs (Fluent Emoji Flat). */
const ICONS = {
  clearDay: "fluent-emoji-flat:sun",
  clearNight: "fluent-emoji-flat:crescent-moon",
  partlyDay: "fluent-emoji-flat:sun-behind-cloud",
  partlyNight: "fluent-emoji-flat:cloud",
  cloudy: "fluent-emoji-flat:cloud",
  fog: "fluent-emoji-flat:fog",
  drizzle: "fluent-emoji-flat:sun-behind-rain-cloud",
  rain: "fluent-emoji-flat:cloud-with-rain",
  snow: "fluent-emoji-flat:cloud-with-snow",
  thunder: "fluent-emoji-flat:cloud-with-lightning",
} as const

function iconFor(code: WeatherCode, isDay: boolean) {
  switch (code) {
    case "clear":
      return isDay ? ICONS.clearDay : ICONS.clearNight
    case "partly":
      return isDay ? ICONS.partlyDay : ICONS.partlyNight
    case "cloudy":
      return ICONS.cloudy
    case "fog":
      return ICONS.fog
    case "drizzle":
      return ICONS.drizzle
    case "rain":
      return ICONS.rain
    case "snow":
      return ICONS.snow
    case "thunder":
      return ICONS.thunder
    default:
      return ICONS.cloudy
  }
}

export function WeatherIcon({ code, isDay = true, className }: Props) {
  return <Icon icon={iconFor(code, isDay)} className={cn("shrink-0", className)} aria-hidden />
}
