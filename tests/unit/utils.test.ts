import { describe, expect, it } from "vitest"
import {
  cn,
  formatClock,
  formatDateLong,
  formatHour,
  formatShortDate,
  formatTemp,
  normalizeWindDegrees,
  parseSunTime,
  windDirection,
} from "../../src/lib/utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4")
  })
})

describe("formatTemp", () => {
  it("rounds temperature", () => {
    expect(formatTemp(21.6)).toBe("22°")
  })
})

describe("windDirection", () => {
  it("maps degrees to compass", () => {
    expect(windDirection(0)).toBe("N")
    expect(windDirection(90)).toBe("E")
  })
})

describe("normalizeWindDegrees", () => {
  it("wraps negative and overflow", () => {
    expect(normalizeWindDegrees(-90)).toBe(270)
    expect(normalizeWindDegrees(450)).toBe(90)
  })
})

describe("formatDateLong", () => {
  it("matches host locale long date formatting", () => {
    const d = new Date(2026, 2, 5)
    expect(formatDateLong(d)).toBe(
      d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
    )
  })
})

describe("formatShortDate", () => {
  it("formats date-only keys", () => {
    const iso = "2026-03-05"
    const d = new Date(`${iso}T12:00:00`)
    expect(formatShortDate(iso)).toBe(
      d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    )
  })
})

describe("formatHour and formatClock", () => {
  it("formats clock strings", () => {
    const iso = "2026-03-05T14:30:00"
    const d = new Date(iso)
    expect(formatHour(iso, "24h")).toBe(
      d.toLocaleTimeString(undefined, { hour: "numeric", hour12: false }).replace(" ", ""),
    )
    expect(formatClock(iso, "12h")).toBe(
      d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    )
  })
})

describe("parseSunTime", () => {
  it("parses ISO strings", () => {
    expect(parseSunTime("2026-06-01T05:00:00Z")).toBeTypeOf("number")
    expect(parseSunTime(null)).toBeNull()
  })
})