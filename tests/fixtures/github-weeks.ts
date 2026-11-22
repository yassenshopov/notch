import type { GitHubContributionWeek } from "../../src/lib/github"

/** Two weeks with increasing activity for streak / stats tests. */
export function sampleContributionWeeks(): GitHubContributionWeek[] {
  return [
    [
      { date: "2026-03-02", count: 2 },
      { date: "2026-03-03", count: 0 },
      { date: "2026-03-04", count: 5 },
      { date: "2026-03-05", count: 1 },
      { date: "2026-03-06", count: 0 },
      { date: "2026-03-07", count: 3 },
      { date: "2026-03-08", count: 4 },
    ],
    [
      { date: "2026-03-09", count: 0 },
      { date: "2026-03-10", count: 2 },
      { date: "2026-03-11", count: 2 },
      { date: "2026-03-12", count: 0 },
      { date: "2026-03-13", count: 1 },
      { date: "2026-03-14", count: 0 },
      { date: "2026-03-15", count: 0 },
    ],
  ]
}