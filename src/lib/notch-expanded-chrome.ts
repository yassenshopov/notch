import type { NotchEdge } from "../config/settings"
import { EAR_PAD } from "./notch-shell-metrics"

/** Keep in sync with electron/notch-placement.cjs */
export const EXPANDED_SIDE_INSET = EAR_PAD
export const EXPANDED_RAIL_GUTTER = 56
export const EXPANDED_BOTTOM_BLEED = 12

/** OS window pixel size when the panel is open (top edge). */
export function expandedWindowPixelSize(
  expandedW: number,
  expandedH: number,
  edge: NotchEdge,
) {
  if (edge === "left" || edge === "right") {
    return {
      width: expandedH + 16 + EXPANDED_RAIL_GUTTER,
      height: expandedW + EXPANDED_SIDE_INSET * 2 + EXPANDED_BOTTOM_BLEED,
    }
  }
  return {
    width: expandedW + EXPANDED_SIDE_INSET * 2 + EXPANDED_RAIL_GUTTER,
    height: expandedH + EXPANDED_BOTTOM_BLEED,
  }
}

/** Padding inside the Electron window — island + rail sit in this box. */
export function expandedWindowPadding(edge: NotchEdge) {
  if (edge === "left" || edge === "right") {
    return {
      paddingTop: 0,
      paddingRight: EXPANDED_BOTTOM_BLEED,
      paddingBottom: EXPANDED_BOTTOM_BLEED,
      paddingLeft: EXPANDED_SIDE_INSET,
    }
  }
  return {
    paddingTop: 0,
    paddingRight: EXPANDED_SIDE_INSET + EXPANDED_RAIL_GUTTER,
    paddingBottom: EXPANDED_BOTTOM_BLEED,
    paddingLeft: EXPANDED_SIDE_INSET,
  }
}
