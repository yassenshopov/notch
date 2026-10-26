import type { NotchForm } from "../config/settings"

export type NotchShellRadii = {
  borderTopLeftRadius: number
  borderTopRightRadius: number
  borderBottomLeftRadius: number
  borderBottomRightRadius: number
}

export function notchShellRadii(
  form: NotchForm,
  expanded: boolean,
  collapsedHeight: number,
  collapsedWidth?: number,
): NotchShellRadii {
  const cap = expanded ? 22 : collapsedHeight / 2

  if (!expanded && (form === "corner-tl" || form === "corner-tr")) {
    const side = Math.max(collapsedWidth ?? collapsedHeight, collapsedHeight)
    const r = Math.min(cap, side / 2)
    if (form === "corner-tl") {
      return {
        borderTopLeftRadius: 0,
        borderTopRightRadius: r,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: r,
      }
    }
    return {
      borderTopLeftRadius: r,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: r,
      borderBottomRightRadius: 0,
    }
  }

  return {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: cap,
    borderBottomRightRadius: cap,
  }
}
