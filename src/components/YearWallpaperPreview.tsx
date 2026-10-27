import { useLayoutEffect, useRef, useState } from "react"
import type { YearWallpaperSettings } from "../lib/year-wallpaper"
import { paintYearWallpaperPreview } from "../lib/year-wallpaper-preview"
import { cn } from "../lib/utils"

type Props = {
  year: number
  settings: YearWallpaperSettings
  className?: string
}

export function YearWallpaperPreview({ year, settings, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stats, setStats] = useState<{ passed: number; total: number } | null>(null)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const paint = () => {
      const result = paintYearWallpaperPreview(canvas, year, settings)
      if (result) setStats(result)
    }

    paint()
    const ro = new ResizeObserver(paint)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [
    year,
    settings.backgroundColor,
    settings.passedColor,
    settings.futureColor,
    settings.todayColor,
    settings.cellSize,
    settings.gap,
    settings.cornerRadius,
    settings.shape,
  ])

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        role="img"
        aria-label={`${year} week heatmap wallpaper preview`}
      />
      {stats ? (
        <p
          className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
          aria-hidden
        >
          {stats.passed}/{stats.total} days
        </p>
      ) : null}
    </div>
  )
}
