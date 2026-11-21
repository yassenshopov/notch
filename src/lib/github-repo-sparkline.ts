import type { GitHubRepoWeekBucket } from "./github"

const OTHER = "__other__"

/** Your contributions per repo aligned to weekly stack buckets (~365 days). */
export function buildRepoSparklinesFromWeeks(
  weeks: GitHubRepoWeekBucket[],
  repoNames: string[],
): Record<string, number[]> {
  const out: Record<string, number[]> = Object.fromEntries(repoNames.map((r) => [r, []]))
  for (const week of weeks) {
    const counts = new Map(
      week.repos.filter((r) => r.repo !== OTHER).map((r) => [r.repo, r.count]),
    )
    for (const repo of repoNames) {
      out[repo]!.push(counts.get(repo) ?? 0)
    }
  }
  return out
}