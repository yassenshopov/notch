import type { GitHubContributionWeek } from "./github"
import { localContributionDateKey } from "./github"

export function iterContributionDays(weeks: GitHubContributionWeek[]) {
  const out: { date: string; count: number }[] = []
  for (const week of weeks) {
    for (const day of week) {
      if (day?.date) out.push({ date: day.date, count: day.count ?? 0 })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export function contributionTotalForYear(weeks: GitHubContributionWeek[], year: number) {
  const prefix = `${year}-`
  let total = 0
  for (const day of iterContributionDays(weeks)) {
    if (day.date.startsWith(prefix)) total += day.count
  }
  return total
}

export function currentContributionStreak(weeks: GitHubContributionWeek[]) {
  const map = new Map(iterContributionDays(weeks).map((d) => [d.date, d.count]))
  let streak = 0
  const cursor = new Date()
  for (let i = 0; i < 400; i++) {
    const key = localContributionDateKey(cursor)
    const count = map.get(key) ?? 0
    if (count <= 0) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function longestContributionStreak(weeks: GitHubContributionWeek[]) {
  const days = iterContributionDays(weeks)
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const day of days) {
    if (day.count <= 0) {
      run = 0
      prev = day.date
      continue
    }
    if (prev) {
      const prevMs = new Date(`${prev}T12:00:00`).getTime()
      const curMs = new Date(`${day.date}T12:00:00`).getTime()
      const gapDays = Math.round((curMs - prevMs) / 86_400_000)
      run = gapDays === 1 ? run + 1 : 1
    } else {
      run = 1
    }
    if (run > best) best = run
    prev = day.date
  }
  return best
}

export function rollingContributionAverage(weeks: GitHubContributionWeek[], windowDays = 28) {
  const days = iterContributionDays(weeks)
  const slice = days.slice(-windowDays)
  if (slice.length === 0) return 0
  const sum = slice.reduce((s, d) => s + d.count, 0)
  return sum / slice.length
}

export function yearToDateComparison(weeks: GitHubContributionWeek[], now = new Date()) {
  const year = now.getFullYear()
  const prevYear = year - 1
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const ytdEnd = `${year}-${m}-${d}`
  const prevEnd = `${prevYear}-${m}-${d}`

  let current = 0
  let previous = 0
  for (const day of iterContributionDays(weeks)) {
    if (day.date >= `${year}-01-01` && day.date <= ytdEnd) current += day.count
    if (day.date >= `${prevYear}-01-01` && day.date <= prevEnd) previous += day.count
  }

  const delta = current - previous
  const deltaPct =
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0

  return { year, prevYear, current, previous, delta, deltaPct }
}
