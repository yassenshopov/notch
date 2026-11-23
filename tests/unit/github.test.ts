import { describe, expect, it } from "vitest"
import {
  contributionLevel,
  contributionLevelClass,
  contributionLegendLevelClass,
  contributionCountForDate,
  dayBreakdownMatchesCalendar,
  formatContributionCount,
  localContributionDateKey,
  maxContributionCount,
  scaleRepoCountsToTarget,
  formatGitHubRepoAge,
  shortRepoName,
  sumGitHubRepoCounts,
  todayContributionCount,
} from "../../src/lib/github"
import { sampleContributionWeeks } from "../fixtures/github-weeks"

describe("contributionLevel", () => {
  it("buckets relative to max", () => {
    expect(contributionLevel(0, 10)).toBe(0)
    expect(contributionLevel(10, 10)).toBe(4)
    expect(contributionLevel(3, 12)).toBe(1)
  })
})

describe("contributionLevelClass", () => {
  it("returns tailwind classes for each level", () => {
    expect(contributionLevelClass(0, 8)).toContain("bg-black")
    expect(contributionLevelClass(8, 8)).toContain("bg-black")
  })
})

describe("contributionLegendLevelClass", () => {
  it("covers legend bands", () => {
    expect(contributionLegendLevelClass(0)).toBe(contributionLevelClass(0, 100))
    expect(contributionLegendLevelClass(4)).toBe(contributionLevelClass(100, 100))
  })
})

describe("formatContributionCount", () => {
  it("pluralizes contributions", () => {
    expect(formatContributionCount(0)).toBe("No contributions")
    expect(formatContributionCount(1)).toBe("1 contribution")
    expect(formatContributionCount(3)).toBe("3 contributions")
  })
})

describe("localContributionDateKey", () => {
  it("formats YYYY-MM-DD", () => {
    expect(localContributionDateKey(new Date(2026, 2, 5))).toBe("2026-03-05")
  })
})

describe("contribution stats from weeks", () => {
  const weeks = sampleContributionWeeks()

  it("counts for a date", () => {
    expect(contributionCountForDate(weeks, "2026-03-04")).toBe(5)
    expect(contributionCountForDate(weeks, "2099-01-01")).toBe(0)
  })

  it("computes max", () => {
    expect(maxContributionCount(weeks)).toBe(5)
  })

  it("today uses local date key", () => {
    const key = localContributionDateKey()
    const weeksWithToday: typeof weeks = [
      [{ date: key, count: 7 }],
    ]
    expect(todayContributionCount(weeksWithToday)).toBe(7)
  })
})

describe("scaleRepoCountsToTarget", () => {
  it("scales repo rows to calendar total", () => {
    const repos = [
      { repo: "a/b", url: "", count: 60 },
      { repo: "c/d", url: "", count: 40 },
    ]
    const scaled = scaleRepoCountsToTarget(repos, 10)
    expect(sumGitHubRepoCounts(scaled)).toBe(10)
  })

  it("zeros when target is zero", () => {
    const scaled = scaleRepoCountsToTarget([{ repo: "a", url: "", count: 3 }], 0)
    expect(scaled[0].count).toBe(0)
  })
})

describe("dayBreakdownMatchesCalendar", () => {
  it("matches expected calendar count", () => {
    expect(
      dayBreakdownMatchesCalendar(
        { date: "2026-03-01", repos: [], expectedCount: 4 },
        "2026-03-01",
        4,
      ),
    ).toBe(true)
    expect(
      dayBreakdownMatchesCalendar(
        { date: "2026-03-01", repos: [], expectedCount: 4 },
        "2026-03-01",
        3,
      ),
    ).toBe(false)
  })
})

describe("shortRepoName", () => {
  it("returns name segment after slash", () => {
    expect(shortRepoName("org/notch")).toBe("notch")
  })
})

describe("formatGitHubRepoAge", () => {
  it("formats relative age", () => {
    const recent = new Date(Date.now() - 3 * 86_400_000).toISOString()
    expect(formatGitHubRepoAge(recent)).toBe(
      new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-3, "day"),
    )
  })
})