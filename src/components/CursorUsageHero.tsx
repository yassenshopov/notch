import { useMemo, useState } from "react"
import type { CursorActivityInsights } from "../lib/cursor-insights"
import {
  buildRollingUsageWeeks,
  formatCursorHeroTotal,
  formatCursorUsageHeatmapCount,
  listCursorHeroYearOptions,
  resolveCursorHeroView,
  type CursorHeroPeriod,
} from "../lib/cursor-insights"
import { padContributionWeeksToCalendarYear } from "../lib/contribution-calendar-year"
import { GitHubContributionHeatmap } from "./GitHubContributionHeatmap"
import { GitHubContributionPeriodSelect } from "./GitHubContributionPeriodSelect"
import { AnimatedNumber } from "./AnimatedNumber"
import { cn } from "../lib/utils"

type Props = {
  insights: CursorActivityInsights
  chartYear: number
  onChartYearChange: (year: number) => void
  loading?: boolean
  className?: string
}

export function CursorUsageHero({ insights, chartYear, onChartYearChange, loading, className }: Props) {
  const currentYear = new Date().getFullYear()
  const [heroPeriod, setHeroPeriod] = useState<CursorHeroPeriod>("rolling")

  const yearOptions = useMemo(
    () => listCursorHeroYearOptions(insights.years, chartYear),
    [insights.years, chartYear],
  )

  const rollingWeeks = useMemo(() => buildRollingUsageWeeks(insights.days), [insights.days])

  const heroView = useMemo(
    () =>
      heroPeriod === "rolling"
        ? resolveCursorHeroView("rolling", insights.yearsData, rollingWeeks)
        : resolveCursorHeroView(heroPeriod, insights.yearsData, null),
    [heroPeriod, insights.yearsData, rollingWeeks],
  )

  const periodSelectValue =
    heroPeriod === "rolling" ? "rolling" : heroPeriod

  if (loading && !insights.ready) {
    return (
      <section className={cn("min-h-[120px] animate-pulse rounded-2xl bg-black/[0.03] dark:bg-white/[0.04]", className)} />
    )
  }

  if (!insights.ready && !loading) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-black/10 p-5 dark:border-white/15",
          className,
        )}
      >
        <p className="text-[14px] font-semibold">Usage history</p>
        <p className="mt-2 text-[13px] leading-relaxed text-black/45 dark:text-white/45">
          Historical heatmaps load from your Cursor dashboard and sync to Notch&apos;s database when{" "}
          <span className="font-medium">DATABASE_URL</span> is set. Tap refresh to fetch your year.
        </p>
      </section>
    )
  }

  const heatmapWeeks =
    heroPeriod === "rolling"
      ? heroView?.weeks ?? []
      : padContributionWeeksToCalendarYear(
          insights.yearsData.find((y) => y.year === heroPeriod)?.weeks ?? insights.weeks,
          typeof heroPeriod === "number" ? heroPeriod : chartYear,
        )

  return (
    <section className={cn("min-w-0 space-y-6", className)} aria-label="Cursor usage history">
      <div className="w-full min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[28px] font-bold tracking-tight">
              <AnimatedNumber
                value={heroView?.totalEvents ?? insights.totalEvents}
                format={(n) => n.toLocaleString()}
                className="text-[28px] font-bold tracking-tight"
              />
              <span className="ml-2 text-[13px] font-medium text-black/40 dark:text-white/40">
                requests · {heroView?.periodLabel ?? chartYear}
              </span>
            </p>
            <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
              {formatCursorHeroTotal(
                heroView?.totalEvents ?? insights.totalEvents,
                heroView?.totalCents ?? insights.totalCents,
              )}
            </p>
          </div>
          <GitHubContributionPeriodSelect
            value={periodSelectValue === "rolling" ? "rolling" : periodSelectValue}
            yearOptions={yearOptions}
            currentYear={currentYear}
            onChange={(p) => {
              if (p === "rolling") setHeroPeriod("rolling")
              else if (p === "all") return
              else {
                setHeroPeriod(p)
                onChartYearChange(p)
              }
            }}
            className="max-w-[9rem]"
          />
        </div>
        {heatmapWeeks.length ? (
          <GitHubContributionHeatmap
            weeks={heatmapWeeks}
            variant="desktop"
            weekLimit={heroPeriod === "rolling" ? 53 : undefined}
            calendarYear={typeof heroPeriod === "number" ? heroPeriod : undefined}
            disableDayBreakdown
            formatCount={formatCursorUsageHeatmapCount}
            ariaDescription="Cursor API usage by day"
            heatmapPalette="classic"
          />
        ) : (
          <p className="text-[12px] text-black/45 dark:text-white/45">No usage days in this period.</p>
        )}
        {insights.eventsInYear != null && insights.eventsSampled != null && insights.eventsSampled < insights.eventsInYear ? (
          <p className="mt-3 text-[11px] text-black/35 dark:text-white/35">
            Heatmap from {insights.eventsSampled.toLocaleString()} of{" "}
            {insights.eventsInYear.toLocaleString()} events (synced{" "}
            {insights.syncedAt ? new Date(insights.syncedAt).toLocaleDateString() : "recently"}).
          </p>
        ) : null}
      </div>
    </section>
  )
}