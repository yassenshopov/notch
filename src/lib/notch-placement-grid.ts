import grid from "../../placement-grid.json"
import type { NotchEdge, NotchForm, NotchPlacement } from "../config/settings"

export const TOP_SLOTS = Math.max(3, grid.topSlots | 0)
export const SIDE_SLOTS = Math.max(2, grid.sideSlots | 0)

export function slotCount(edge: NotchEdge) {
  return edge === "top" ? TOP_SLOTS : SIDE_SLOTS
}

export function topCenterSlot() {
  return Math.floor((slotCount("top") - 1) / 2)
}

export function clampSlot(edge: NotchEdge, slot: number) {
  const max = slotCount(edge) - 1
  return Math.min(max, Math.max(0, Math.round(slot)))
}

export function fractionForSlot(edge: NotchEdge, slot: number) {
  const max = slotCount(edge) - 1
  if (max <= 0) return 0.5
  return clampSlot(edge, slot) / max
}

export function resolveForm(edge: NotchEdge, slot: number): NotchForm {
  const s = clampSlot(edge, slot)
  const topMax = slotCount("top") - 1
  if (edge === "top" && s === 0) return "corner-tl"
  if (edge === "top" && s === topMax) return "corner-tr"
  if (edge === "left" && s === 0) return "corner-tl"
  if (edge === "right" && s === 0) return "corner-tr"
  return "pill"
}

export function withPlacementForm(placement: Omit<NotchPlacement, "form">): NotchPlacement {
  const edge = placement.edge
  const slot = clampSlot(edge, placement.slot)
  return {
    displayId: placement.displayId,
    edge,
    slot,
    form: resolveForm(edge, slot),
  }
}
