import { describe, expect, it } from "vitest"
import { seriesTimeSpanMs } from "../../src/lib/chart-axis"

describe("seriesTimeSpanMs", () => {
  it("returns delta between first and last point", () => {
    const span = seriesTimeSpanMs([
      { time: "2026-01-01T10:00:00Z" },
      { time: "2026-01-01T11:00:00Z" },
    ])
    expect(span).toBe(3_600_000)
  })

  it("returns 0 for short series", () => {
    expect(seriesTimeSpanMs([{ time: "2026-01-01T10:00:00Z" }])).toBe(0)
  })
})