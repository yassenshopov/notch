import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { LayoutGroup, motion } from "motion/react"
import { useState } from "react"
import { useSettings } from "../../config/settings-store"
import {
  DESKTOP_NAV_GROUPS,
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "../../lib/desktop-nav"
import { panelLabel, type NotchPanel } from "../../lib/panel-routing"
import { cn } from "../../lib/utils"
import { PanelNavIcon } from "../PanelNavIcon"

type Props = {
  activePanel: NotchPanel
  dark: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
  onSelect: (panel: NotchPanel) => void
}

export function DesktopSidebar({
  activePanel,
  dark,
  collapsed,
  onToggleCollapsed,
  onSelect,
}: Props) {
  const { motion: feel } = useSettings()
  const navSpring = {
    type: "spring" as const,
    stiffness: Math.round(feel.stiffness * 0.75),
    damping: Math.round(feel.damping * 0.85),
    mass: feel.mass * 1.05,
  }
  const tapSpring = { type: "spring" as const, stiffness: 520, damping: 28, mass: 0.55 }

  const sidebar = dark ? "border-white/10 bg-[#0d0d0d]" : "border-black/8 bg-[#efefec]"
  const navIdle = dark ? "text-white/55 hover:text-white/75" : "text-black/55 hover:text-black/80"
  const navActiveText = dark ? "text-white" : "text-black"
  const indicatorBg = dark ? "bg-white/12" : "bg-black/8"
  const groupLabel = dark ? "text-white/30" : "text-black/35"
  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r transition-[width] duration-300 ease-[var(--notch-ease)]",
        sidebar,
        collapsed ? "w-[3.75rem]" : "w-[14.5rem]",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-black/6 px-2 py-3 dark:border-white/8",
          collapsed ? "justify-center" : "justify-between gap-2 px-3",
        )}
      >
        {!collapsed ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
            Notch
          </p>
        ) : null}
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapsed}
          className={cn("rounded-xl p-2 transition-colors", navIdle)}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="size-4" strokeWidth={1.75} />
          )}
        </button>
      </div>

      <LayoutGroup id="desktop-sidebar-nav">
        <nav className="desktop-scroll desktop-scroll-sidebar min-h-0 flex-1 basis-0 space-y-4 px-2 py-3">
          {DESKTOP_NAV_GROUPS.map((group) => (
            <div key={group.id}>
              {!collapsed ? (
                <p
                  className={cn(
                    "mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    groupLabel,
                  )}
                >
                  {group.label}
                </p>
              ) : (
                <div
                  className="mx-auto mb-2 h-px w-6 bg-black/10 dark:bg-white/10"
                  aria-hidden
                />
              )}
              <ul className="space-y-0.5">
                {group.panels.map((id) => {
                  const active = id === activePanel
                  return (
                    <li key={id}>
                      <motion.button
                        type="button"
                        title={collapsed ? panelLabel(id) : undefined}
                        aria-current={active ? "page" : undefined}
                        onClick={() => onSelect(id)}
                        whileTap={{ scale: 0.97 }}
                        transition={tapSpring}
                        className={cn(
                          "relative flex w-full items-center rounded-xl text-[13px] font-medium transition-colors duration-200",
                          collapsed ? "justify-center p-2.5" : "gap-2.5 px-2.5 py-2 text-left",
                          active ? navActiveText : navIdle,
                        )}
                      >
                        {active ? (
                          <motion.span
                            layoutId="desktop-sidebar-indicator"
                            className={cn("absolute inset-0 rounded-xl", indicatorBg)}
                            transition={navSpring}
                            aria-hidden
                          />
                        ) : null}
                        <span
                          className={cn(
                            "relative z-10 flex min-w-0 items-center",
                            collapsed ? "justify-center" : "gap-2.5",
                          )}
                        >
                          <PanelNavIcon panel={id} className="size-4 shrink-0" />
                          {!collapsed ? (
                            <span className="truncate">{panelLabel(id)}</span>
                          ) : null}
                        </span>
                      </motion.button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </LayoutGroup>
    </aside>
  )
}

export function useDesktopSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed())
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c
      writeSidebarCollapsed(next)
      return next
    })
  }
  return { collapsed, toggle, setCollapsed }
}
