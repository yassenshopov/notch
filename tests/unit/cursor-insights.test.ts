import { describe, expect, it } from "vitest"
import {
  buildRollingUsageWeeks,
  formatCursorHeroTotal,
  formatCursorUsageHeatmapCount,
  listCursorHeroYearOptions,
  resolveCursorHeroView,
} from "../../src/lib/cursor-insights"

describe("formatCursorUsageHeatmapCount", () => {
  it("pluralizes requests", () => {
    expect(formatCursorUsageHeatmapCount(0)).toBe("No usage")
    expect(formatCursorUsageHeatmapCount(1)).toBe("1 request")
    expect(formatCursorUsageHeatmapCount(12)).toBe("12 requests")
  })
})

describe("formatCursorHeroTotal", () => {
  it("includes events and cents", () => {
    expect(formatCursorHeroTotal(10, 50)).toContain("10")
    expect(formatCursorHeroTotal(0, 0)).toContain("¢")
  })
})

describe("listCursorHeroYearOptions", () => {
  it("dedupes and sorts desc", () => {
    expect(listCursorHeroYearOptions([2024, 2025], 2025)).toEqual([2025, 2024])
  })
})

describe("resolveCursorHeroView", () => {
  it("aggregates rolling weeks", () => {
    const weeks = buildRollingUsageWeeks([
      { date: "2026-01-01", count: 2, spendCents: 10 },
      { date: "2026-01-02", count: 1, spendCents: 5 },
    ])
    const view = resolveCursorHeroView("rolling", [], weeks)
    expect(view?.totalEvents).toBeGreaterThan(0)
    expect(view?.periodLabel).toBe("last 52 weeks")
  })
})