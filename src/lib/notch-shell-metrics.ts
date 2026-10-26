import type { NotchForm, NotchPlacement } from "../config/settings"
import { collapsedContentDimensions } from "./notch-collapsed-size"

/** Match electron/notch-placement.cjs — room for concave ears beyond the pill */
export const EAR_PAD = 36

export function earPadsForPlacement(edge: NotchPlacement["edge"], form: NotchForm) {
  if (edge === "top") {
    return { start: EAR_PAD, end: EAR_PAD }
  }
  if (edge === "left") {
    if (form === "corner-tl") return { start: 0, end: EAR_PAD }
    return { start: EAR_PAD, end: EAR_PAD }
  }
  if (edge === "right") {
    if (form === "corner-tr") return { start: 0, end: EAR_PAD }
    return { start: EAR_PAD, end: EAR_PAD }
  }
  return { start: EAR_PAD, end: EAR_PAD }
}

export function collapsedShellSize(
  contentW: number,
  contentH: number,
  edge: NotchPlacement["edge"],
  form: NotchForm,
) {
  const sized = collapsedContentDimensions(
    form,
    Math.max(40, contentW),
    Math.max(24, contentH),
  )
  const w = sized.width
  const h = sized.height
  const pads = earPadsForPlacement(edge, form)
  if (edge === "left" || edge === "right") {
    return {
      shellW: h + 16,
      shellH: w + pads.start + pads.end,
    }
  }
  return {
    shellW: w + pads.start + pads.end,
    shellH: h + 16,
  }
}
