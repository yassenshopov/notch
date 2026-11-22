import { describe, expect, it } from "vitest"
import {
  calendarYearGridBounds,
  isDateInCalendarYear,
  padContributionWeeksToCalendarYear,
} from "../../src/lib/contribution-calendar-year"

describe("isDateInCalendarYear", () => {
  it("checks inclusive bounds", () => {
    expect(isDateInCalendarYear("2026-01-01", 2026)).toBe(true)
    expect(isDateInCalendarYear("2026-12-31", 2026)).toBe(true)
    expect(isDateInCalendarYear("2025-12-31", 2026)).toBe(false)
  })
})

describe("calendarYearGridBounds", () => {
  it("pads to Sunday-aligned weeks", () => {
    const { gridStart, gridEnd } = calendarYearGridBounds(2026)
    expect(gridStart.getUTCDay()).toBe(0)
    expect(gridEnd.getUTCDay()).toBe(6)
  })
})

describe("padContributionWeeksToCalendarYear", () => {
  it("fills missing days with zeros", () => {
    const weeks = padContributionWeeksToCalendarYear(
      [[{ date: "2026-06-15", count: 3 }]],
      2026,
    )
    expect(weeks.length).toBeGreaterThan(50)
    const mid = weeks.flat().find((d) => d.date === "2026-06-15")
    expect(mid?.count).toBe(3)
    const empty = weeks.flat().find((d) => d.date === "2026-06-16")
    expect(empty?.count).toBe(0)
  })
})