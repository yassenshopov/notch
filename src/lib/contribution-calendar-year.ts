import type { GitHubContributionDay, GitHubContributionWeek } from "./github"

function utcDateKey(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Sunday-aligned grid bounds for a calendar year (includes leading/trailing week pads). */
export function calendarYearGridBounds(year: number) {
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year, 11, 31))
  const gridStart = new Date(start)
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay())
  const gridEnd = new Date(end)
  const endDow = gridEnd.getUTCDay()
  if (endDow < 6) gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - endDow))
  return { gridStart, gridEnd }
}

/** Fill Sun→Sat week columns through the end of `year`, including future empty days. */
export function padContributionWeeksToCalendarYear<T extends GitHubContributionDay>(
  weeks: GitHubContributionWeek[],
  year: number,
  createEmptyDay: (dateKey: string) => T = (date) => ({ date, count: 0 }) as T,
): T[][] {
  const byDate = new Map<string, T>()
  for (const week of weeks ?? []) {
    for (const day of week) {
      if (day?.date) byDate.set(day.date, day as T)
    }
  }

  const { gridStart, gridEnd } = calendarYearGridBounds(year)
  const output: T[][] = []
  const cursor = new Date(gridStart)

  while (cursor <= gridEnd) {
    const column: T[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor)
      d.setUTCDate(cursor.getUTCDate() + i)
      const key = utcDateKey(d)
      column.push(byDate.get(key) ?? createEmptyDay(key))
    }
    output.push(column)
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  return output
}