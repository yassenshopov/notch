/**
 * Notch defaults — user overrides live in Electron userData
 * and are merged at runtime via the settings store.
 */

import { DEFAULT_WEATHER_LOCATION } from "./default-location"
import { topCenterSlot } from "../lib/notch-placement-grid"

export type TemperatureUnit = "celsius" | "fahrenheit"
export type ThemeMode = "system" | "light" | "dark"
export type WindSpeedUnit = "kmh" | "mph" | "ms"
export type ClockFormat = "24h" | "12h"
export type ChartStyle = "line" | "bar"
export type IslandFace =
  | "weather"
  | "battery"
  | "clock"
  | "markets"
  | "github"
  | "strava"
  | "mint"
  | "air"
  | "calendar"

export type MarketWatchItem = {
  id: string
  symbol: string
  name?: string
  type: "crypto" | "stock"
}

export type TimerSession = import("../lib/timers").TimerSession

export type LocationConfig =
  | { mode: "auto" }
  | {
      mode: "manual"
      latitude: number
      longitude: number
      label: string
      countryCode: string
    }

export type NotchEdge = "top" | "left" | "right"

export type NotchForm = "pill" | "corner-tl" | "corner-tr"

export type NotchPlacement = {
  displayId: number | null
  edge: NotchEdge
  /** Discrete index along the edge (see placement-grid.json). */
  slot: number
  form: NotchForm
}

export type AppSettings = {
  appName: string
  /** Open Notch when the OS starts (Electron login item) */
  launchAtLogin: boolean
  refreshIntervalMs: number
  temperatureUnit: TemperatureUnit
  windSpeedUnit: WindSpeedUnit
  location: LocationConfig
  theme: ThemeMode
  charts: {
    style: ChartStyle
  }
  /** Collapsed pill — one face at a time, then rotate */
  island: {
    /** How long each face stays before the next */
    rotateIntervalMs: number
    faces: {
      weather: boolean
      battery: boolean
      clock: boolean
      markets: boolean
      github: boolean
      strava: boolean
      mint: boolean
      air: boolean
      calendar: boolean
    }
  }
  mint: {
    pollIntervalMs: number
    /** SSH config host (e.g. mint via Tailscale) */
    sshHost: string
  }
  calendar: {
    pollIntervalMs: number
    /** Secret ICS URL (e.g. Google Calendar → Integrate calendar) */
    icsUrl: string
  }
  media: {
    pollIntervalMs: number
    /** Show browser / YouTube system media when Spotify is idle */
    enabled: boolean
  }
  clock: {
    format: ClockFormat
  }
  timers: {
    soundEnabled: boolean
    pomodoro: {
      workMs: number
      shortBreakMs: number
      longBreakMs: number
      longEvery: number
    }
    session: TimerSession
  }
  markets: {
    pollIntervalMs: number
    watchlist: MarketWatchItem[]
  }
  github: {
    pollIntervalMs: number
  }
  strava: {
    pollIntervalMs: number
  }
  collapsed: {
    width: number
    height: number
    musicExtraWidth: number
    /** Extra width when a live activity label is showing */
    activityExtraWidth: number
    /** Extra width when a countdown timer is showing */
    timerExtraWidth: number
    /** Extra width when the GitHub contribution mini-heatmap is showing */
    githubExtraWidth: number
    /** Extra width when the Strava activity mini-calendar is showing */
    stravaExtraWidth: number
  }
  /** Transient collapsed-pill alerts (rain soon, Cursor usage, …) */
  liveActivities: {
    enabled: boolean
    /** How long each activity stays before rotating to the next */
    dwellMs: number
    weather: {
      enabled: boolean
      minPrecipProbability: number
      lookaheadMinutes: number
      /** Hide the current precip alert until this time (after dismiss or auto-snooze) */
      snoozedUntilMs: number
      /** Activity id that snoozedUntilMs applies to */
      snoozedForId: string
      /** How long to hide a precip alert before it can appear again */
      remindAfterMs: number
    }
    cursor: {
      enabled: boolean
      /** Hide cursor-usage live activity (and tray balloon) until this timestamp */
      snoozedUntilMs: number
    }
  }
  spotify: {
    pollIntervalMs: number
    /** Synced lyrics in the Now Playing panel (LRCLIB) */
    showLyrics: boolean
  }
  cursor: {
    pollIntervalMs: number
    /** Tray tooltip + balloon when included usage crosses this % */
    usageWarningPercent: number
    trayPollIntervalMs: number
  }
  yearWallpaper: {
    /** Regenerate (and apply when enabled) once per local calendar day */
    autoUpdateDaily: boolean
    /** YYYY-MM-DD — last successful auto run (main process) */
    lastAutoDate: string
    /** Set Windows desktop background after generating */
    applyAfterRegenerate: boolean
    backgroundColor: string
    passedColor: string
    futureColor: string
    todayColor: string
    cellSize: number
    gap: number
    cornerRadius: number
    shape: "square" | "circle"
    /** Folder for year-{year}-wallpaper.png; empty = Pictures/Notch */
    outputDir: string
  }
  expanded: {
    width: number
    height: number
  }
  placement: NotchPlacement
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
  location: {
    mode: "manual",
    ...DEFAULT_WEATHER_LOCATION,
  },
  theme: "system",
  charts: {
    style: "bar",
  },
  island: {
    rotateIntervalMs: 5_000,
    faces: {
      weather: true,
      battery: true,
      clock: true,
      markets: true,
      github: true,
      strava: true,
      mint: true,
      air: true,
      calendar: true,
    },
  },
  mint: {
    pollIntervalMs: 30_000,
    sshHost: "mint",
  },
  calendar: {
    pollIntervalMs: 5 * 60 * 1000,
    icsUrl: "",
  },
  media: {
    pollIntervalMs: 2_000,
    enabled: true,
  },
  clock: {
    format: "24h",
  },
  timers: {
    soundEnabled: true,
    pomodoro: {
      workMs: 25 * 60_000,
      shortBreakMs: 5 * 60_000,
      longBreakMs: 15 * 60_000,
      longEvery: 4,
    },
    session: {
      kind: "idle",
      phase: "countdown",
      label: "",
      endsAt: null,
      startedAt: null,
      elapsedMs: 0,
      pomodoroRound: 1,
      segmentMs: 0,
    },
  },
  markets: {
    pollIntervalMs: 90_000,
    watchlist: [
      { id: "bitcoin", symbol: "BTC", name: "Bitcoin", type: "crypto" },
      { id: "ethereum", symbol: "ETH", name: "Ethereum", type: "crypto" },
      { id: "aapl", symbol: "AAPL", name: "Apple", type: "stock" },
    ],
  },
  github: {
    pollIntervalMs: 120_000,
  },
  strava: {
    pollIntervalMs: 180_000,
  },
  collapsed: {
    // Apple compact Dynamic Island is ~126×36pt; stay close
    width: 126,
    height: 36,
    musicExtraWidth: 52,
    activityExtraWidth: 108,
    /** Extra width when a countdown timer is showing */
    timerExtraWidth: 40,
    githubExtraWidth: 52,
    stravaExtraWidth: 56,
  },
  liveActivities: {
    enabled: true,
    dwellMs: 8_000,
    weather: {
      enabled: true,
      minPrecipProbability: 50,
      lookaheadMinutes: 180,
      snoozedUntilMs: 0,
      snoozedForId: "",
      remindAfterMs: 30 * 60 * 1000,
    },
    cursor: {
      enabled: true,
      snoozedUntilMs: 0,
    },
  },
  spotify: {
    pollIntervalMs: 4_000,
    showLyrics: true,
  },
  cursor: {
    pollIntervalMs: 5 * 60 * 1000,
    usageWarningPercent: 85,
    trayPollIntervalMs: 10 * 60 * 1000,
  },
  expanded: {
    width: 380,
    height: 580,
  },
  placement: {
    displayId: null,
    edge: "top",
    slot: topCenterSlot(),
    form: "pill",
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
  yearWallpaper: {
    autoUpdateDaily: true,
    lastAutoDate: "",
    applyAfterRegenerate: true,
    backgroundColor: "#ffffff",
    passedColor: "#373737",
    futureColor: "#d2d2d2",
    todayColor: "#ff5f00",
    cellSize: 13,
    gap: 6,
    cornerRadius: 2,
    shape: "square",
    outputDir: "",
  },
}

/** @deprecated Prefer useSettings() / getSettings() — kept for gradual imports */
export const settings = defaultSettings
