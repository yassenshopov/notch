import { Grid3x3, Hand, Moon, Sun, Warehouse } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { CarStatus } from "../lib/car-mock"
import { createCarScene, type CarSceneHandle } from "../lib/car-scene"
import type { CarViewerBackdrop } from "../lib/car-viewer-backdrop"
import { cn } from "../lib/utils"
import { useTheme } from "../hooks/useTheme"

type Props = {
  bodyColor: string
  status: CarStatus
  plate?: string
  className?: string
  label?: string
}

const studioBtn =
  "rounded-lg border p-1.5 transition-colors"

export function CarModelViewer({ bodyColor, status, plate = "", className, label = "3D car model" }: Props) {
  const appDark = useTheme()
  const [viewerDark, setViewerDark] = useState(appDark)
  const [panEnabled, setPanEnabled] = useState(false)
  const [backdrop, setBackdrop] = useState<CarViewerBackdrop>("studio")
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<CarSceneHandle | null>(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const handle = createCarScene(el, { bodyColor, status, plate, dark: viewerDark })
    sceneRef.current = handle
    return () => {
      handle.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setDark(viewerDark)
  }, [viewerDark])

  useEffect(() => {
    sceneRef.current?.setBodyColor(bodyColor)
  }, [bodyColor])

  useEffect(() => {
    sceneRef.current?.setStatus(status)
  }, [status])

  useEffect(() => {
    sceneRef.current?.setPlate(plate)
  }, [plate])

  useEffect(() => {
    sceneRef.current?.setPan(panEnabled)
  }, [panEnabled])

  useEffect(() => {
    sceneRef.current?.setBackdrop(backdrop)
  }, [backdrop])

  const chrome = viewerDark
    ? "border-white/15 bg-white/10 text-white/90 hover:bg-white/15"
    : "border-black/10 bg-black/[0.04] text-black/70 hover:bg-black/[0.07]"
  const chromeActive = viewerDark
    ? "border-white/30 bg-white/20 text-white"
    : "border-black/20 bg-black/10 text-black"

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        viewerDark
          ? "border-white/12 bg-[#0c0c0d]"
          : "border-black/[0.07] bg-[#f4f4f3]",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 z-10 flex justify-end gap-1.5 p-2">
        <button
          type="button"
          onClick={() => setPanEnabled((p) => !p)}
          className={cn(studioBtn, panEnabled ? chromeActive : chrome)}
          aria-label={panEnabled ? "Disable drag to pan" : "Enable drag to pan"}
          aria-pressed={panEnabled}
        >
          <Hand className="size-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => setBackdrop((b) => (b === "studio" ? "garage" : "studio"))}
          className={cn(studioBtn, backdrop === "garage" ? chromeActive : chrome)}
          aria-label={backdrop === "garage" ? "Switch to studio scene" : "Switch to garage scene"}
          aria-pressed={backdrop === "garage"}
        >
          {backdrop === "garage" ? (
            <Grid3x3 className="size-4" strokeWidth={1.75} />
          ) : (
            <Warehouse className="size-4" strokeWidth={1.75} />
          )}
        </button>
        <button
          type="button"
          onClick={() => setViewerDark((d) => !d)}
          className={cn(studioBtn, chrome)}
          aria-label={viewerDark ? "Switch 3D studio to light mode" : "Switch 3D studio to dark mode"}
        >
          {viewerDark ? <Sun className="size-4" strokeWidth={1.75} /> : <Moon className="size-4" strokeWidth={1.75} />}
        </button>
      </div>
      <div ref={mountRef} className="absolute inset-0 size-full" aria-label={label} role="img" />
    </div>
  )
}