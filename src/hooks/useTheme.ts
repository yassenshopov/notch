import { useEffect, useState } from "react"
import type { ThemeMode } from "../config/settings"
import { useSettings } from "../config/settings-store"

function resolveDark(mode: ThemeMode) {
  if (mode === "dark") return true
  if (mode === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function useTheme() {
  const { theme } = useSettings()
  const [dark, setDark] = useState(() => resolveDark(theme))

  useEffect(() => {
    const apply = () => setDark(resolveDark(theme))
    apply()

    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  return dark
}
