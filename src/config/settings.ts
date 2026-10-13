/**
 * Notch defaults — user overrides live in Electron userData
 * and are merged at runtime via the settings store.
 */

export type TemperatureUnit = "celsius" | "fahrenheit"
export type ThemeMode = "system" | "light" | "dark"
export type WindSpeedUnit = "kmh" | "mph" | "ms"

export type LocationConfig =
  | { mode: "auto" }
  | { mode: "manual"; latitude: number; longitude: number; label: string }

export type AppSettings = {
  appName: string
  refreshIntervalMs: number
  temperatureUnit: TemperatureUnit
  windSpeedUnit: WindSpeedUnit
  location: LocationConfig
  theme: ThemeMode
  collapsed: {
    width: number
    height: number
    musicExtraWidth: number
  }
  spotify: {
    pollIntervalMs: number
  }
  expanded: {
    width: number
    height: number
  }
  window: {
    width: number
    height: number
  }
  motion: {
    type: "spring"
    stiffness: number
    damping: number
    mass: number
  }
}

export const defaultSettings: AppSettings = {
  appName: "notch",
  refreshIntervalMs: 10 * 60 * 1000,
  temperatureUnit: "celsius",
  windSpeedUnit: "kmh",
  location: { mode: "auto" },
  theme: "system",
  collapsed: {
    width: 152,
    height: 34,
    musicExtraWidth: 44,
  },
  spotify: {
    pollIntervalMs: 4_000,
  },
  expanded: {
    width: 400,
    height: 600,
  },
  window: {
    width: 440,
    height: 660,
  },
  motion: {
    type: "spring",
    stiffness: 380,
    damping: 32,
    mass: 0.85,
  },
}

/** @deprecated Prefer useSettings() / getSettings() — kept for gradual imports */
export const settings = defaultSettings
