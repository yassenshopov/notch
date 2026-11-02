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
