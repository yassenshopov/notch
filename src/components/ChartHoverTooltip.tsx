import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { clampFixedTooltipPosition } from "../lib/chart-tooltip-position"
import { cn } from "../lib/utils"

type Props = {
  anchorX: number
  anchorY: number
  open: boolean
  className?: string
  children: ReactNode
  preferAbove?: boolean
  gap?: number
}

export function ChartHoverTooltip({
  anchorX,
  anchorY,
  open,
  className,
  children,
  preferAbove = true,
  gap = 6,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<{ left: number; top: number; transform: string } | null>(null)

  useLayoutEffect(() => {
    if (!open || !ref.current) {
      setStyle(null)
      return
    }
    const rect = ref.current.getBoundingClientRect()
    setStyle(
      clampFixedTooltipPosition(anchorX, anchorY, rect, { preferAbove, gap }),
    )
  }, [anchorX, anchorY, open, preferAbove, gap, children])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      ref={ref}
      className={cn(
        "pointer-events-none fixed z-[9999] flex flex-col items-center gap-0.5 whitespace-nowrap rounded-lg px-2 py-1 text-center shadow-md",
        !style && "invisible",
        className,
      )}
      style={
        style
          ? { left: style.left, top: style.top, transform: style.transform }
          : { left: anchorX, top: anchorY, transform: "translateX(-50%)" }
      }
    >
      {children}
    </div>,
    document.body,
  )
}
