import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const grid = require("../../electron/notch-placement-grid.cjs")

describe("notch-placement-grid", () => {
  it("clamps slots", () => {
    expect(grid.clampSlot("top", -1)).toBe(0)
    expect(grid.clampSlot("top", 999)).toBeLessThanOrEqual(grid.slotCount("top") - 1)
  })

  it("resolves corner forms", () => {
    expect(grid.resolveForm("top", 0)).toBe("corner-tl")
    const max = grid.slotCount("top") - 1
    expect(grid.resolveForm("top", max)).toBe("corner-tr")
  })
})