const VIEWPORT_MARGIN = 8

export type ClampedTooltipPosition = {
  left: number
  top: number
  transform: string
}

/** Keep a fixed-position tooltip fully inside the viewport. */
export function clampFixedTooltipPosition(
  anchorX: number,
  anchorY: number,
  size: { width: number; height: number },
  options?: {
    /** Place above the anchor by default; flip below if needed */
    preferAbove?: boolean
    gap?: number
  },
): ClampedTooltipPosition {
  const preferAbove = options?.preferAbove ?? true
  const gap = options?.gap ?? 6
  const { width, height } = size
  const halfW = width / 2

  let left = anchorX
  left = Math.min(window.innerWidth - VIEWPORT_MARGIN - halfW, Math.max(VIEWPORT_MARGIN + halfW, left))

  let top = preferAbove ? anchorY - gap - height : anchorY + gap
  if (preferAbove && top < VIEWPORT_MARGIN) {
    top = anchorY + gap
  }
  top = Math.min(window.innerHeight - VIEWPORT_MARGIN - height, Math.max(VIEWPORT_MARGIN, top))

  return { left, top, transform: "translateX(-50%)" }
}
