/**
 * Notch defaults — user overrides live in Electron userData
 * and are merged at runtime via the settings store.
 */

export type TemperatureUnit = "celsius" | "fahrenheit"
export type ThemeMode = "system" | "light" | "dark"
export type WindSpeedUnit = "kmh" | "mph" | "ms"
export type ClockFormat = "24h" | "12h"
export type IslandFace = "weather" | "battery" | "clock"

export type LocationConfig =
  | { mode: "auto" }
  | { mode: "manual"; latitude: number; longitude: number; label: string }

export type AppSettings = {
  appName: string
  /** Open Notch when the OS starts (Electron login item) */
  launchAtLogin: boolean
  refreshIntervalMs: number
  temperatureUnit: TemperatureUnit
  windSpeedUnit: WindSpeedUnit
  location: LocationConfig
  theme: ThemeMode
  /** Collapsed pill — one face at a time, then rotate */
  island: {
    /** How long each face stays before the next */
    rotateIntervalMs: number
    faces: {
      weather: boolean
      battery: boolean
      clock: boolean
    }
  }
  clock: {
    format: ClockFormat
  }
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
  launchAtLogin: true,
  refreshIntervalMs: 10 * 60 * 1000,
  temperatureUnit: "celsius",
  windSpeedUnit: "kmh",
  location: { mode: "auto" },
  theme: "system",
  island: {
    rotateIntervalMs: 5_000,
    faces: {
      weather: true,
      battery: true,
      clock: true,
    },
  },
  clock: {
    format: "24h",
  },
  collapsed: {
    // Apple compact Dynamic Island is ~126×36pt; stay close
    width: 126,
    height: 36,
    musicExtraWidth: 52,
  },
  spotify: {
    pollIntervalMs: 4_000,
  },
  expanded: {
    width: 380,
    height: 580,
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
