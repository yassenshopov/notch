import { useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import { resolveDark } from "../lib/theme"

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
