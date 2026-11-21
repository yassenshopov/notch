import { Home, Maximize2, Minimize2, Move, RefreshCw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  APARTMENT_PLAN_REVISION,
  APARTMENT_ROOM_CARDS,
  footprintBounds,
  roomFootprintM2,
} from "../lib/apartment-floor-plan"
import {
  createApartmentScene,
  deviceById,
  roomById,
  type ApartmentPick,
  type ApartmentSceneHandle,
  type ApartmentViewMode,
} from "../lib/apartment-scene"
import type { MintServerStatus } from "../lib/mint"
import type { PiServerStatus } from "../lib/pi"
import type { NotchPanel } from "../lib/panel-routing"
import { usePanelLayout } from "../lib/panel-layout"
import { useTheme } from "../hooks/useTheme"
import {
  ApartmentArchitecturalSketch,
  type ApartmentPlanHandle,
} from "./ApartmentArchitecturalSketch"
import { SegmentedControl } from "./SegmentedControl"
import { cn } from "../lib/utils"

type Props = {
  mintStatus: MintServerStatus
  piStatus: PiServerStatus
  onNavigatePanel?: (panel: NotchPanel) => void
}

function pickLabel(pick: ApartmentPick | null): string | null {
  if (!pick) return null
  if (pick.kind === "room") return roomById(pick.roomId)?.label ?? pick.roomId
  return deviceById(pick.deviceId)?.label ?? pick.deviceId
}

function pickDetail(pick: ApartmentPick | null): string | null {
  if (!pick || pick.kind !== "room") return null
  const room = roomById(pick.roomId)
  if (!room) return null
  return `~${roomFootprintM2(pick.roomId).toFixed(1)} m²`
}

const studioBtn =
  "rounded-lg border p-1.5 transition-colors"

function ViewerToolbar({
  dark,
  panEnabled,
  viewerFs,
  onTogglePan,
  onToggleFs,
}: {
  dark: boolean
  panEnabled: boolean
  viewerFs: boolean
  onTogglePan: () => void
  onToggleFs: () => void
}) {
  const chrome = dark
    ? "border-white/15 bg-white/10 text-white/90 hover:bg-white/15"
    : "border-black/10 bg-black/[0.04] text-black/70 hover:bg-black/[0.07]"
  const chromeActive = dark
    ? "border-white/30 bg-white/20 text-white"
    : "border-black/20 bg-black/10 text-black"

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end gap-1.5 p-2">
      <button
        type="button"
        onClick={onTogglePan}
        className={cn(studioBtn, "pointer-events-auto", panEnabled ? chromeActive : chrome)}
        aria-label={panEnabled ? "Disable drag to pan" : "Enable drag to pan"}
        aria-pressed={panEnabled}
      >
        <Move className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={onToggleFs}
        className={cn(studioBtn, "pointer-events-auto", chrome)}
        aria-label={viewerFs ? "Exit full-screen viewer" : "Full-screen viewer"}
      >
        {viewerFs ? (
          <Minimize2 className="size-4" strokeWidth={1.75} />
        ) : (
          <Maximize2 className="size-4" strokeWidth={1.75} />
        )}
      </button>
    </div>
  )
}

export function ApartmentPanel(_props: Props) {
  const desktop = usePanelLayout() === "desktop"
  const dark = useTheme()
  const mountRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ApartmentSceneHandle | null>(null)
  const planRef = useRef<ApartmentPlanHandle | null>(null)
  const [view, setView] = useState<ApartmentViewMode>("orbit")
  const [pick, setPick] = useState<ApartmentPick | null>(null)
  const [doorOpen, setDoorOpen] = useState(false)
  const [lampOn, setLampOn] = useState(false)
  const [sceneEpoch, setSceneEpoch] = useState(0)
  const [panEnabled, setPanEnabled] = useState(false)
  const [viewerFs, setViewerFs] = useState(false)

  const bounds = footprintBounds()

  const refreshScene = () => {
    setPick(null)
    setDoorOpen(false)
    setLampOn(false)
    setSceneEpoch((n) => n + 1)
  }

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const handle = createApartmentScene(el, {
      dark,
      defaultView: view,
      onPick: (next) => setPick(next),
      onBalconyDoorChange: setDoorOpen,
      onSofaLampChange: setLampOn,
    })
    sceneRef.current = handle
    handle.setPan(panEnabled && view === "orbit")
    return () => {
      handle.dispose()
      sceneRef.current = null
    }
  }, [dark, sceneEpoch, APARTMENT_PLAN_REVISION])

  useEffect(() => {
    sceneRef.current?.setView(view)
  }, [view])

  useEffect(() => {
    if (view === "plan") setPanEnabled(true)
  }, [view])

  useEffect(() => {
    sceneRef.current?.setPan(panEnabled && view === "orbit")
  }, [panEnabled, view])

  useEffect(() => {
    sceneRef.current?.highlight(pick)
  }, [pick])

  useEffect(() => {
    if (!viewerFs) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewerFs(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [viewerFs])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      sceneRef.current?.resize()
    })
    return () => cancelAnimationFrame(id)
  }, [viewerFs, view, desktop])

  const togglePan = () => {
    setPanEnabled((p) => {
      const next = !p
      if (!next) planRef.current?.resetView()
      return next
    })
  }

  const viewerChromeDark = view === "orbit" ? dark : false

  const viewport = (
    <div
      ref={viewportRef}
      className={cn(
        "relative overflow-hidden",
        view === "plan" ? "bg-white" : "bg-black/[0.03] dark:bg-white/[0.04]",
        viewerFs ? "h-full min-h-0 flex-1 rounded-none border-0" : "h-full min-h-0 flex-1 rounded-2xl border border-black/8 dark:border-white/10",
      )}
    >
      <ViewerToolbar
        dark={viewerChromeDark}
        panEnabled={panEnabled}
        viewerFs={viewerFs}
        onTogglePan={togglePan}
        onToggleFs={() => setViewerFs((v) => !v)}
      />
      <div
        key={`${APARTMENT_PLAN_REVISION}-${sceneEpoch}`}
        ref={mountRef}
        className={cn(
          "absolute inset-0",
          view === "plan" && "pointer-events-none invisible",
        )}
      />
      {view === "plan" ? (
        <ApartmentArchitecturalSketch
          ref={planRef}
          pick={pick}
          doorOpen={doorOpen}
          panEnabled={panEnabled}
          onSelect={setPick}
          className="absolute inset-0"
        />
      ) : null}
    </div>
  )

  const sidebar = (
    <aside
      className={cn(
        "flex shrink-0 flex-col gap-3 rounded-2xl border border-black/8 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]",
        desktop ? "w-[220px]" : "w-full",
        viewerFs && "hidden",
      )}
    >
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
          Selection
        </p>
        <p className="mt-1 text-[14px] font-medium">{pickLabel(pick) ?? "Tap balcony or living"}</p>
        {pickDetail(pick) ? (
          <p className="mt-1 text-[12px] leading-snug text-black/50 dark:text-white/50">
            {pickDetail(pick)}
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
          Floor lamp
        </p>
        <button
          type="button"
          className="mt-1.5 w-full rounded-lg bg-black/6 px-2.5 py-2 text-[12px] font-medium hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
          onClick={() => sceneRef.current?.toggleSofaLamp()}
        >
          {lampOn ? "Turn off" : "Turn on"}
        </button>
        <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">
          Click the lamp by the sofa in Orbit (warm light)
        </p>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
          Balcony door
        </p>
        <button
          type="button"
          className="mt-1.5 w-full rounded-lg bg-black/6 px-2.5 py-2 text-[12px] font-medium hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
          onClick={() => sceneRef.current?.toggleBalconyDoor()}
        >
          {doorOpen ? "Close door" : "Open door"}
        </button>
        <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">Or click the glazed door in Orbit</p>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
          Spaces (2)
        </p>
        <ul className="mt-1.5 flex flex-col gap-1">
          {APARTMENT_ROOM_CARDS.map((room) => (
            <li key={room.pickId}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors",
                  pick?.kind === "room" && pick.roomId === room.pickId
                    ? "bg-black/8 font-medium dark:bg-white/10"
                    : "hover:bg-black/5 dark:hover:bg-white/5",
                )}
                onClick={() => setPick({ kind: "room", roomId: room.pickId })}
              >
                {room.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
          <Home className="size-4 opacity-70" strokeWidth={1.75} aria-hidden />
          Living + balcony
        </p>
        <p className="mt-0.5 text-[11px] text-black/45 dark:text-white/45">
          {bounds.maxX.toFixed(2)}×{bounds.maxZ.toFixed(2)} m · plan {APARTMENT_PLAN_REVISION}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-black/[0.04] px-2 py-1 text-[11px] font-medium hover:bg-black/8 dark:border-white/15 dark:bg-white/8 dark:hover:bg-white/12"
          title="Rebuild 3D scene (pick up plan code changes)"
          onClick={refreshScene}
        >
          <RefreshCw className="size-3.5" strokeWidth={2} aria-hidden />
          Refresh
        </button>
        <SegmentedControl<ApartmentViewMode>
          value={view}
          options={[
            { value: "orbit", label: "Orbit" },
            { value: "plan", label: "Plan" },
          ]}
          onChange={setView}
          variant="bordered"
          aria-label="Apartment view"
        />
      </div>
    </div>
  )

  const mainLayout = (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3",
        desktop && "lg:min-h-[min(78vh,720px)] lg:flex-row lg:gap-4",
        viewerFs && "fixed inset-0 z-[300] gap-0 bg-[#f6f6f5] p-3 dark:bg-[#0c0c0d]",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-col gap-2",
          desktop ? "min-w-0 flex-1" : "flex-1",
          viewerFs && "min-h-0 flex-1",
        )}
      >
        {!viewerFs ? header : (
          <div className="flex shrink-0 items-center justify-between gap-2 pb-2">
            <p className="text-[14px] font-semibold">Living + balcony</p>
            <div className="flex items-center gap-2">
              <SegmentedControl<ApartmentViewMode>
                value={view}
                options={[
                  { value: "orbit", label: "Orbit" },
                  { value: "plan", label: "Plan" },
                ]}
                onChange={setView}
                variant="bordered"
                aria-label="Apartment view"
              />
              <button
                type="button"
                className="rounded-lg border border-black/10 px-2 py-1 text-[11px] font-medium dark:border-white/15"
                onClick={() => setViewerFs(false)}
              >
                Esc · exit
              </button>
            </div>
          </div>
        )}
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col",
            !viewerFs && (desktop ? "min-h-[min(72vh,680px)]" : "min-h-[280px]"),
          )}
        >
          {viewport}
        </div>
      </div>
      {sidebar}
    </div>
  )

  if (viewerFs && typeof document !== "undefined") {
    return createPortal(mainLayout, document.body)
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col", desktop && "min-h-[min(78vh,720px)]")}>
      {mainLayout}
    </div>
  )
}