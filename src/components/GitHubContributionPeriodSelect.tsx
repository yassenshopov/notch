import type { GitHubHeroPeriod } from "../lib/github-hero-period"
import { cn } from "../lib/utils"

type Props = {
  value: GitHubHeroPeriod
  yearOptions: number[]
  currentYear: number
  onChange: (period: GitHubHeroPeriod) => void
  className?: string
}

function serializePeriod(period: GitHubHeroPeriod) {
  if (period === "all") return "all"
  if (period === "rolling") return "rolling"
  return String(period)
}

export function GitHubContributionPeriodSelect({
  value,
  yearOptions,
  onChange,
  className,
}: Props) {
  return (
    <select
      value={serializePeriod(value)}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === "all") onChange("all")
        else if (raw === "rolling") onChange("rolling")
        else onChange(Number(raw))
      }}
      className={cn(
        "max-w-full truncate rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-1.5 text-[12px] font-medium text-black/70 dark:border-white/12 dark:bg-white/[0.06] dark:text-white/80",
        className,
      )}
      aria-label="Contribution period"
    >
      <option value="rolling">Last 52 weeks</option>
      {yearOptions.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
      <option value="all">All time</option>
    </select>
  )
}