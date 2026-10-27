import { useEffect, useRef, useState } from "react"
import type { NotchPanel } from "../lib/panel-routing"
import { desktopHashForPanel, parsePanelId, readDesktopRouteFromLocation } from "../lib/desktop-route"
import { PanelLayoutContext } from "../lib/panel-layout"
import { useTheme } from "../hooks/useTheme"
import { useNotchActivePanelProps } from "../hooks/useNotchActivePanelProps"
import { NotchActivePanel } from "./NotchActivePanel"
import { DesktopSidebar, useDesktopSidebarCollapsed } from "./desktop/DesktopSidebar"
import { cn } from "../lib/utils"

type Props = {
  initialPanel: NotchPanel
}

export function DesktopApp({ initialPanel }: Props) {
  const [activePanel, setActivePanel] = useState<NotchPanel>(initialPanel)
  const mainRef = useRef<HTMLElement>(null)
  const { collapsed, toggle: toggleSidebar } = useDesktopSidebarCollapsed()
  const dark = useTheme()
  const panelProps = useNotchActivePanelProps(activePanel, "desktop")

  useEffect(() => {
    document.documentElement.classList.add("notch-desktop")
    return () => document.documentElement.classList.remove("notch-desktop")
  }, [])

  useEffect(() => {
    const syncFromHash = () => {
      const route = readDesktopRouteFromLocation()
      if (route.isDesktop) setActivePanel(route.panel)
    }
    syncFromHash()
    window.addEventListener("hashchange", syncFromHash)
    const off = window.notch?.desktop?.onNavigate?.((panel) => {
      const id = parsePanelId(panel)
      if (id) {
        setActivePanel(id)
        const next = desktopHashForPanel(id)
        if (window.location.hash !== next) {
          window.location.hash = next
        }
      }
    })
    return () => {
      window.removeEventListener("hashchange", syncFromHash)
      off?.()
    }
  }, [])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [activePanel])

  const selectPanel = (panel: NotchPanel) => {
    setActivePanel(panel)
    const next = desktopHashForPanel(panel)
    if (window.location.hash !== next) {
      window.location.hash = next
    }
  }

  const bg = dark ? "bg-[#111111]" : "bg-[#f7f7f5]"

  return (
    <PanelLayoutContext.Provider value="desktop">
      <div className={cn("flex h-full min-h-0 w-full flex-1", bg, dark ? "text-white" : "text-[#111111]")}>
        <DesktopSidebar
          activePanel={activePanel}
          dark={dark}
          collapsed={collapsed}
          onToggleCollapsed={toggleSidebar}
          onSelect={selectPanel}
        />
        <main
          ref={mainRef}
          className="desktop-scroll min-h-0 min-w-0 flex-1 basis-0 overflow-y-scroll overflow-x-hidden px-6 py-6 sm:px-8 sm:py-8"
        >
          <div className="mx-auto w-full max-w-7xl">
            <NotchActivePanel {...panelProps} layout="desktop" />
          </div>
        </main>
      </div>
    </PanelLayoutContext.Provider>
  )
}
