import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { updateSettings, useSettings } from "../../config/settings-store"
import { DESKTOP_NAV_PANELS, panelLabel, type NotchPanel } from "../../lib/panel-routing"
import { cn } from "../../lib/utils"
import { PanelNavIcon } from "../PanelNavIcon"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  activePanel: NotchPanel
  onSelectPanel: (panel: NotchPanel) => void
}

type Row =
  | { kind: "panel"; id: NotchPanel; label: string; search: string }
  | { kind: "action"; id: string; label: string; search: string; run: () => void }

export function DesktopCommandPalette({
  open,
  onOpenChange,
  activePanel,
  onSelectPanel,
}: Props) {
  const settings = useSettings()
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const rows = useMemo<Row[]>(() => {
    const panels: Row[] = DESKTOP_NAV_PANELS.map((id) => ({
      kind: "panel",
      id,
      label: panelLabel(id),
      search: `${panelLabel(id)} ${id}`.toLowerCase(),
    }))
    const actions: Row[] = [
      {
        kind: "action",
        id: "privacy",
        label: settings.privacyMode ? "Disable privacy mode" : "Enable privacy mode",
        search: "privacy screenshot sensitive email hide",
        run: () => void updateSettings({ privacyMode: !settings.privacyMode }),
      },
      {
        kind: "action",
        id: "theme-dark",
        label: "Use dark theme",
        search: "theme dark appearance",
        run: () => void updateSettings({ theme: "dark" }),
      },
      {
        kind: "action",
        id: "theme-light",
        label: "Use light theme",
        search: "theme light appearance",
        run: () => void updateSettings({ theme: "light" }),
      },
    ]
    return [...panels, ...actions]
  }, [settings.privacyMode])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.label.toLowerCase().includes(q) || r.search.includes(q))
  }, [query, rows])

  useEffect(() => {
    if (!open) {
      setQuery("")
      setHighlight(0)
      return
    }
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    setHighlight(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onOpenChange(false)
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlight((h) => Math.min(filtered.length - 1, h + 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlight((h) => Math.max(0, h - 1))
      }
      if (e.key === "Enter" && filtered[highlight]) {
        e.preventDefault()
        runRow(filtered[highlight])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, filtered, highlight, onOpenChange])

  const runRow = (row: Row) => {
    if (row.kind === "panel") onSelectPanel(row.id)
    else row.run()
    onOpenChange(false)
  }

  if (!open) return null

  const panels = filtered.filter((r) => r.kind === "panel")
  const actions = filtered.filter((r) => r.kind === "action")

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm dark:bg-black/55"
      onClick={() => onOpenChange(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-black/10 bg-[#f7f7f5] shadow-2xl dark:border-white/10 dark:bg-[#161616]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search panels and actions…"
          className="w-full border-b border-black/8 bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-black/35 dark:border-white/10 dark:placeholder:text-white/35"
        />
        <div className="max-h-[min(24rem,50vh)] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-black/45 dark:text-white/45">
              No matches.
            </p>
          ) : (
            <>
              {panels.length > 0 ? (
                <Group title="Navigate">
                  {panels.map((row) => {
                    const idx = filtered.indexOf(row)
                    return (
                      <PaletteRow
                        key={row.id}
                        label={row.label}
                        active={row.kind === "panel" && row.id === activePanel}
                        highlighted={idx === highlight}
                        icon={
                          row.kind === "panel" ? (
                            <PanelNavIcon panel={row.id} className="size-4" />
                          ) : undefined
                        }
                        onMouseEnter={() => setHighlight(idx)}
                        onClick={() => runRow(row)}
                      />
                    )
                  })}
                </Group>
              ) : null}
              {actions.length > 0 ? (
                <Group title="Actions" className="mt-1">
                  {actions.map((row) => {
                    const idx = filtered.indexOf(row)
                    return (
                      <PaletteRow
                        key={row.id}
                        label={row.label}
                        highlighted={idx === highlight}
                        onMouseEnter={() => setHighlight(idx)}
                        onClick={() => runRow(row)}
                      />
                    )
                  })}
                </Group>
              ) : null}
            </>
          )}
        </div>
        <div className="border-t border-black/8 px-3 py-2 text-[10px] text-black/35 dark:border-white/10 dark:text-white/35">
          <kbd className="rounded bg-black/5 px-1 dark:bg-white/10">Ctrl</kbd>+
          <kbd className="rounded bg-black/5 px-1 dark:bg-white/10">K</kbd> ·{" "}
          <kbd className="rounded bg-black/5 px-1 dark:bg-white/10">↑</kbd>
          <kbd className="rounded bg-black/5 px-1 dark:bg-white/10">↓</kbd> ·{" "}
          <kbd className="rounded bg-black/5 px-1 dark:bg-white/10">Enter</kbd>
        </div>
      </div>
    </div>
  )
}

function Group({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35 dark:text-white/35">
        {title}
      </p>
      {children}
    </div>
  )
}

function PaletteRow({
  label,
  icon,
  active,
  highlighted,
  onClick,
  onMouseEnter,
}: {
  label: string
  icon?: ReactNode
  active?: boolean
  highlighted?: boolean
  onClick: () => void
  onMouseEnter: () => void
}) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors",
        highlighted ? "bg-black/8 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/[0.06]",
        active && "font-medium",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {active ? (
        <span className="text-[10px] uppercase tracking-wide text-black/35 dark:text-white/35">
          Current
        </span>
      ) : null}
    </button>
  )
}
