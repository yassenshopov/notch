import { describe, expect, it } from "vitest"
import {
  formatListeningHeatmapCount,
  isSpotifyListeningDay,
} from "../src/lib/spotify-listening"

describe("formatListeningHeatmapCount", () => {
  it("formats zero and plural minutes", () => {
    expect(formatListeningHeatmapCount(0)).toBe("No listening")
    expect(formatListeningHeatmapCount(1)).toBe("1 minute listened")
    expect(formatListeningHeatmapCount(42)).toBe("42 minutes listened")
  })
})

describe("isSpotifyListeningDay", () => {
  it("narrows days with a date", () => {
    expect(isSpotifyListeningDay({ date: "2026-01-01", count: 1 })).toBe(true)
    expect(isSpotifyListeningDay({ date: "", count: 0 })).toBe(false)
  })
})