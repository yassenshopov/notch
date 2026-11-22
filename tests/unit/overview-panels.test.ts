import { describe, expect, it } from "vitest"
import {
  countEnabledOverviewCards,
  defaultOverviewCards,
  enabledOverviewCards,
  resolveOverviewCards,
} from "../../src/lib/overview-panels"
import { makeSettings } from "../fixtures/app-settings"

describe("overview panels", () => {
  it("defaults all cards on", () => {
    const cards = defaultOverviewCards()
    expect(countEnabledOverviewCards(cards)).toBe(9)
  })

  it("merges settings overrides", () => {
    const cards = resolveOverviewCards(
      makeSettings({ overview: { cards: { github: false } } }),
    )
    expect(cards.github).toBe(false)
    expect(enabledOverviewCards(cards)).not.toContain("github")
  })
})