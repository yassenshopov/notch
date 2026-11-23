import { describe, expect, it } from "vitest"
import { contributionLevel } from "../src/lib/github"

describe("contributionLevel", () => {
  it("maps counts to levels 0–4", () => {
    expect(contributionLevel(0, 10)).toBe(0)
    expect(contributionLevel(10, 10)).toBe(4)
    expect(contributionLevel(5, 10)).toBeGreaterThan(0)
  })
})