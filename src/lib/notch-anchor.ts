import type { NotchForm, NotchPlacement } from "../config/settings"
import { clampSlot, fractionForSlot, slotCount, topCenterSlot } from "./notch-placement-grid"
import { collapsedShellSize } from "./notch-shell-metrics"

export { EAR_PAD } from "./notch-shell-metrics"

/** Top-left of the collapsed OS shell within the current display viewport. */
export function collapsedShellOrigin(
  placement: NotchPlacement,
  viewportW: number,
  viewportH: number,
  contentW: number,
  contentH: number,
) {
  const { shellW, shellH } = collapsedShellSize(
    contentW,
    contentH,
    placement.edge,
    placement.form,
  )
  const frac = fractionForSlot(placement.edge, placement.slot)
  const topSlot = clampSlot("top", placement.slot)
  const topMax = slotCount("top") - 1
  const centerSlot = topCenterSlot()

  switch (placement.edge) {
    case "top": {
      const travel = Math.max(0, viewportW - shellW)
      if (topSlot === 0) {
        return { left: 0, top: 0, shellW, shellH }
      }
      if (topSlot === topMax) {
        return {
          left: Math.max(0, viewportW - shellW),
          top: 0,
          shellW,
          shellH,
        }
      }
      if (topSlot === centerSlot) {
        return {
          left: Math.max(0, Math.round((viewportW - shellW) / 2)),
          top: 0,
          shellW,
          shellH,
        }
      }
      return {
        left: frac * travel,
        top: 0,
        shellW,
        shellH,
      }
    }
    case "left":
      return {
        left: 0,
        top: frac * Math.max(0, viewportH - shellH),
        shellW,
        shellH,
      }
    case "right":
      return {
        left: Math.max(0, viewportW - shellW),
        top: frac * Math.max(0, viewportH - shellH),
        shellW,
        shellH,
      }
    default:
      return { left: 0, top: 0, shellW, shellH }
  }
}

export function transformOriginForPlacement(
  edge: NotchPlacement["edge"],
  form: NotchForm,
): string {
  if (form === "corner-tl") return "top left"
  if (form === "corner-tr") return "top right"
  if (edge === "left") return "left center"
  if (edge === "right") return "right center"
  return "top center"
}

export function panelRailPlacementClass(edge: NotchPlacement["edge"]) {
  if (edge === "right") {
    return "right-full top-1/2 mr-2.5 -translate-y-1/2"
  }
  return "left-full top-1/2 ml-2.5 -translate-y-1/2"
}

export function isSidePlacement(edge: NotchPlacement["edge"]) {
  return edge === "left" || edge === "right"
}

/** Local island box before the side-edge rotation is applied. */
export function islandLayoutSize(
  edge: NotchPlacement["edge"],
  expanded: boolean,
  collapsedWidth: number,
  collapsedHeight: number,
  expandedWidth: number,
  expandedHeight: number,
) {
  if (!expanded) {
    return { width: collapsedWidth, height: collapsedHeight }
  }
  if (isSidePlacement(edge)) {
    return { width: expandedHeight, height: expandedWidth }
  }
  return { width: expandedWidth, height: expandedHeight }
}
