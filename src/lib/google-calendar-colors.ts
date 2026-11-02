/** Google Calendar event colorId → hex (calendar & event colors). */
export const GOOGLE_CALENDAR_COLOR_BY_ID: Record<string, string> = {
  "1": "#7986cb",
  "2": "#33b679",
  "3": "#8e24aa",
  "4": "#e67c73",
  "5": "#f6bf26",
  "6": "#f4511e",
  "7": "#039be5",
  "8": "#616161",
  "9": "#3f51b5",
  "10": "#0b8043",
  "11": "#d50000",
}

export const DEFAULT_CALENDAR_COLOR = "#039be5"

export function colorFromGoogleId(colorId: string | null | undefined): string | null {
  if (!colorId) return null
  return GOOGLE_CALENDAR_COLOR_BY_ID[String(colorId)] ?? null
}

export function eventDisplayColor(event: { color?: string | null }): string {
  return event.color?.trim() || DEFAULT_CALENDAR_COLOR
}

export function withAlpha(hex: string, alphaHex: string) {
  const h = hex.replace("#", "")
  if (h.length !== 6) return hex
  return `#${h}${alphaHex}`
}

type Rgb = { r: number; g: number; b: number }

function parseHex6(hex: string): Rgb | null {
  const h = hex.replace("#", "")
  if (h.length !== 6) return null
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function srgbLuminance({ r, g, b }: Rgb) {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function blendOver(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
  }
}

/** Black or white text for event chips/blocks on a translucent calendar color fill. */
export function textColorOnCalendarFill(
  hex: string,
  fillAlphaHex = "cc",
  backdrop: Rgb = { r: 255, g: 255, b: 255 },
) {
  const fg = parseHex6(hex)
  if (!fg) return "#111827"
  const alpha = parseInt(fillAlphaHex, 16) / 255
  const blended = blendOver(fg, backdrop, alpha)
  return srgbLuminance(blended) > 0.45 ? "#111827" : "#ffffff"
}
