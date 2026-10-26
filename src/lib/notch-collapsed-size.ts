import type { NotchForm } from "../config/settings"

export function isCornerForm(form: NotchForm) {
  return form === "corner-tl" || form === "corner-tr"
}

/** Corner slots — square collapsed body (same width & height). */
export function collapsedContentDimensions(
  form: NotchForm,
  width: number,
  height: number,
) {
  if (!isCornerForm(form)) {
    return { width, height }
  }
  const side = Math.max(width, height)
  return { width: side, height: side }
}
