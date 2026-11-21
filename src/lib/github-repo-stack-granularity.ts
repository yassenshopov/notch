import type { GitHubRepoWeekBucket } from "./github"

/** Roll weekly buckets into calendar months (week attributed to its start month). */
export function aggregateRepoStackMonths(weeks: GitHubRepoWeekBucket[]): GitHubRepoWeekBucket[] {
  const byMonth = new Map<
    string,
    { total: number; repos: Map<string, { repo: string; url: string; count: number }> }
  >()

  for (const week of weeks) {
    const monthKey = week.weekStart.slice(0, 7)
    let bucket = byMonth.get(monthKey)
    if (!bucket) {
      bucket = { total: 0, repos: new Map() }
      byMonth.set(monthKey, bucket)
    }
    bucket.total += week.total
    for (const row of week.repos) {
      const prev = bucket.repos.get(row.repo)
      if (prev) prev.count += row.count
      else bucket.repos.set(row.repo, { repo: row.repo, url: row.url, count: row.count })
    }
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, bucket]) => ({
      weekStart: `${monthKey}-01`,
      total: bucket.total,
      repos: [...bucket.repos.values()].filter((r) => r.count > 0),
    }))
}

export type RepoStackGranularity = "daily" | "weekly" | "monthly"

export function bucketsForRepoStackGranularity(
  granularity: RepoStackGranularity,
  weeks: GitHubRepoWeekBucket[],
  days: GitHubRepoWeekBucket[] | undefined,
): GitHubRepoWeekBucket[] {
  if (granularity === "daily") return days ?? []
  if (granularity === "monthly") return aggregateRepoStackMonths(weeks)
  return weeks
}