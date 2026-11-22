import { describe, expect, it } from "vitest"
import { formatListeningMinutes } from "../../src/lib/spotify-insights"

describe("formatListeningMinutes", () => {
  it("formats sub-hour listening", () => {
    expect(formatListeningMinutes(90_000)).toBe("2 min")
  })

  it("formats hours with remainder", () => {
    expect(formatListeningMinutes(3_600_000 + 1_200_000)).toBe("1h 20m")
  })

  it("formats long spans as hours", () => {
    expect(formatListeningMinutes(100 * 3_600_000)).toMatch(/h$/)
  })
})