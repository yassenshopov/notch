import type { ThemeMode } from "../config/settings"
import { getSettings, updateSettings } from "../config/settings-store"

const THEME_CROSSFADE_MS = 480

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true
  if (mode === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function toggledLightDarkTheme(mode: ThemeMode): ThemeMode {
  return resolveDark(mode) ? "light" : "dark"
}

function runThemeCrossfade(apply: () => void) {
  const root = document.documentElement
  if (typeof document.startViewTransition === "function" && root.classList.contains("notch-desktop")) {
    document.startViewTransition(apply)
    return
  }

  root.classList.add("notch-theme-crossfade")
  apply()
  window.setTimeout(() => root.classList.remove("notch-theme-crossfade"), THEME_CROSSFADE_MS)
}

export function toggleLightDarkTheme() {
  const { theme } = getSettings()
  const next = toggledLightDarkTheme(theme)
  runThemeCrossfade(() => {
    void updateSettings({ theme: next })
  })
}
