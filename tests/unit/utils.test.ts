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
  it("returns a non-empty label", () => {
    expect(formatDateLong(new Date(2026, 2, 5))).toMatch(/2026|5|March/i)
  })
})

describe("formatShortDate", () => {
  it("formats date-only keys", () => {
    expect(formatShortDate("2026-03-05")).toMatch(/Mar/)
  })
})

describe("formatHour and formatClock", () => {
  it("formats clock strings", () => {
    const iso = "2026-03-05T14:30:00"
    expect(formatHour(iso, "24h").length).toBeGreaterThan(0)
    expect(formatClock(iso, "12h")).toMatch(/\d/)
  })
})

describe("parseSunTime", () => {
  it("parses ISO strings", () => {
    expect(parseSunTime("2026-06-01T05:00:00Z")).toBeTypeOf("number")
    expect(parseSunTime(null)).toBeNull()
  })
})