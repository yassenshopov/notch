import { describe, expect, it } from "vitest"
import {
  activeContributionDays,
  bestContributionDay,
  contributionTotalForYear,
  currentContributionStreak,
  iterContributionDays,
  longestContributionStreak,
  rollingContributionAverage,
  sumContributionsInDays,
  trailingYearComparison,
} from "../../src/lib/github-contribution-stats"
import { sampleContributionWeeks } from "../fixtures/github-weeks"

const weeks = sampleContributionWeeks()

describe("iterContributionDays", () => {
  it("flattens and sorts", () => {
    const days = iterContributionDays(weeks)
    expect(days.length).toBe(14)
    expect(days[0].date < days[days.length - 1].date).toBe(true)
  })
})

describe("contributionTotalForYear", () => {
  it("sums only matching year prefix", () => {
    expect(contributionTotalForYear(weeks, 2026)).toBe(
      daysSum(weeks),
    )
    expect(contributionTotalForYear(weeks, 2020)).toBe(0)
  })
})

function daysSum(w: typeof weeks) {
  return iterContributionDays(w).reduce((s, d) => s + d.count, 0)
}

describe("longestContributionStreak", () => {
  it("finds longest consecutive active run", () => {
    const streakWeeks = [
      [
        { date: "2026-01-01", count: 1 },
        { date: "2026-01-02", count: 1 },
        { date: "2026-01-03", count: 0 },
        { date: "2026-01-04", count: 1 },
        { date: "2026-01-05", count: 1 },
        { date: "2026-01-06", count: 1 },
        { date: "2026-01-07", count: 1 },
      ],
    ]
    expect(longestContributionStreak(streakWeeks)).toBe(4)
  })
})

describe("rollingContributionAverage", () => {
  it("averages trailing window", () => {
    const avg = rollingContributionAverage(weeks, 7)
    expect(avg).toBeGreaterThan(0)
  })
})

describe("sumContributionsInDays", () => {
  it("sums recent window", () => {
    expect(sumContributionsInDays(weeks, 3)).toBeGreaterThan(0)
  })
})

describe("activeContributionDays", () => {
  it("counts days with activity", () => {
    expect(activeContributionDays(weeks, 365)).toBe(8)
  })
})

describe("bestContributionDay", () => {
  it("returns peak day", () => {
    expect(bestContributionDay(weeks)?.count).toBe(5)
  })
})

describe("trailingYearComparison", () => {
  it("compares halves when enough data", () => {
    const long = iterContributionDays(weeks)
    const padded = long.flatMap((d) => [[d]])
    while (padded.length < 400) {
      padded.push([{ date: `2025-01-${String(padded.length).padStart(2, "0")}`, count: 1 }])
    }
    const cmp = trailingYearComparison(padded as typeof weeks)
    expect(cmp.recentTotal).toBeGreaterThan(0)
  })
})

describe("currentContributionStreak", () => {
  it("returns 0 when today has no commits", () => {
    const key = new Date()
    key.setFullYear(2020)
    const oldWeeks = [[{ date: "2020-01-01", count: 5 }]]
    expect(currentContributionStreak(oldWeeks)).toBe(0)
  })
})