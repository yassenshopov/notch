import { useEffect, useState } from "react"
import { DesktopApp } from "./components/DesktopApp"
import { Notch } from "./components/Notch"
import { parsePanelId, readDesktopRouteFromLocation } from "./lib/desktop-route"
import { TimerEngineProvider } from "./hooks/useTimerEngine"

export default function App() {
  const [desktopRoute, setDesktopRoute] = useState(() => readDesktopRouteFromLocation())

  useEffect(() => {
    const sync = () => setDesktopRoute(readDesktopRouteFromLocation())
    sync()
    window.addEventListener("hashchange", sync)
    const off = window.notch?.desktop?.onNavigate?.((panel) => {
      const id = parsePanelId(panel)
      if (id) setDesktopRoute({ isDesktop: true, panel: id })
    })
    return () => {
      window.removeEventListener("hashchange", sync)
      off?.()
    }
  }, [])

  if (desktopRoute.isDesktop) {
    return (
      <TimerEngineProvider>
        <main className="flex h-full min-h-0 w-full flex-col overflow-hidden">
          <DesktopApp initialPanel={desktopRoute.panel} />
        </main>
      </TimerEngineProvider>
    )
  }

  return (
    <TimerEngineProvider>
      <main className="block h-full w-full min-h-0 overflow-hidden bg-transparent">
        <Notch />
      </main>
    </TimerEngineProvider>
  )
}
