import { useMemo, useState } from "react"
import { ExternalLink, RefreshCw } from "lucide-react"
import { openGitHubUrl, type GitHubStatus } from "../lib/github"
import { cn } from "../lib/utils"
import { GitHubContributionHeatmap } from "./GitHubContributionHeatmap"
import { usePanelLayout } from "../lib/panel-layout"
import { GitHubTodayPanel } from "./GitHubTodayPanel"
import { PanelHeaderActions } from "./PanelHeaderActions"
import { BentoGrid, BentoTile, bentoPad } from "./desktop/DesktopBento"
import { useGitHubInsights } from "../hooks/useGitHubInsights"
import { useGitHubWeeklyRepoStack } from "../hooks/useGitHubWeeklyRepoStack"
import { GitHubRepositoriesPanel } from "./GitHubRepositoriesPanel"
import { GitHubRepoWeeklyStackChart } from "./GitHubRepoWeeklyStackChart"
import { GitHubContributionStats } from "./GitHubContributionStats"
import { GitHubContributionPeriodSelect } from "./GitHubContributionPeriodSelect"
import {
  listHeroYearOptions,
  resolveHeroContributionView,
  type GitHubHeroPeriod,
} from "../lib/github-hero-period"
import { AnimatedNumber } from "./AnimatedNumber"
import { GitHubProfileHeader } from "./GitHubProfileHeader"
import { GitHubNotificationsMenu } from "./GitHubNotificationsMenu"
import { maskLogin, usePrivacyMode } from "../lib/privacy"
import { GitHubPanelDesktopSkeleton } from "./desktop/DesktopSkeleton"
import { readDesktopRouteFromLocation } from "../lib/desktop-route"

type Props = {
  status: GitHubStatus
  loading?: boolean
  refreshing: boolean
  onRefresh: () => void
  /** Expanded notch shell — same full-page GitHub layout as the desktop window. */
  expanded?: boolean
}

export function GitHubPanel({ status, loading, refreshing, onRefresh, expanded }: Props) {
  const layout = usePanelLayout()
  const routeDesktop = readDesktopRouteFromLocation().isDesktop
  const fullPage = layout === "desktop" || routeDesktop || Boolean(expanded)
  const heatmapVariant = fullPage ? "desktop" : "panel"
  const currentYear = new Date().getFullYear()
  const [heroPeriod, setHeroPeriod] = useState<GitHubHeroPeriod>("rolling")
  const chartYear =
    heroPeriod === "all" || heroPeriod === "rolling" ? currentYear : heroPeriod
  const insightsActive = fullPage && status.connected
  const {
    insights,
    loading: insightsLoading,
    refresh: refreshInsights,
  } = useGitHubInsights(insightsActive, chartYear)
  const {
    weeklyStack,
    loading: weeklyStackLoading,
    refresh: refreshWeeklyStack,
  } = useGitHubWeeklyRepoStack(insightsActive)
  const privacy = usePrivacyMode()
  const loginLabel = status.login ? `@${maskLogin(status.login, privacy)}` : ""

  const heroYearOptions = useMemo(
    () => listHeroYearOptions(insights.years, currentYear),
    [insights.years, currentYear],
  )
  const heroView = useMemo(
    () =>
      fullPage && status.connected
        ? resolveHeroContributionView(
            heroPeriod,
            insights.years,
            status.contributions,
            currentYear,
          )
        : null,
    [fullPage, status.connected, heroPeriod, insights.years, status.contributions, currentYear],
  )

  if (fullPage && loading && !status.connected) {
    return (
      <GitHubPanelDesktopSkeleton refreshing={refreshing} onRefresh={onRefresh} />
    )
  }

  if (!status.configured) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <p className="text-[15px] font-semibold">GitHub</p>
        <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
          Add <span className="font-medium">GITHUB_TOKEN</span> to{" "}
          <span className="font-medium">.env</span> and restart Notch.
        </p>
      </div>
    )
  }

  if (!status.connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <p className="text-[15px] font-semibold">GitHub</p>
        <p className="mt-2 text-[12px] text-red-400">
          {status.error ?? status.message ?? "Could not connect"}
        </p>
      </div>
    )
  }

  const handleRefresh = () => {
    onRefresh()
    if (insightsActive) {
      refreshInsights()
      refreshWeeklyStack()
    }
  }

  const header = (
      <header className="mb-4 flex items-start justify-between gap-2 pr-8 lg:mb-0 lg:pr-0">
        <div className="flex items-center gap-2.5">
          {status.avatarUrl ? (
            <img
              src={status.avatarUrl}
              alt=""
              className="size-9 rounded-full border border-black/10 dark:border-white/15"
            />
          ) : null}
          <div>
            <p className="text-[15px] font-semibold tracking-tight">GitHub</p>
            <p className="text-[12px] text-black/45 dark:text-white/45">{loginLabel}</p>
          </div>
        </div>
        <PanelHeaderActions>
          <GitHubNotificationsMenu seed={status.notifications} onInboxChanged={() => void handleRefresh()} />
          <button
            type="button"
            aria-label="Refresh GitHub"
            disabled={refreshing}
            onClick={onRefresh}
            className="rounded-full p-2 text-black/40 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-50 dark:text-white/40 dark:hover:bg-white/10"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          </button>
        </PanelHeaderActions>
      </header>
  )

  const prSection = (
      <Section title="Pull requests" count={status.pullRequests.length}>
        {status.pullRequests.length === 0 ? (
          <EmptyRow text="No open PRs on your radar." />
        ) : (
          status.pullRequests.map((pr) => (
            <RowButton
              key={`${pr.repo}-${pr.number}`}
              title={`#${pr.number} ${pr.title}`}
              subtitle={pr.repo}
              onOpen={() => openGitHubUrl(pr.url)}
            />
          ))
        )}
      </Section>
  )

  const refreshButton = (
    <button
      type="button"
      aria-label="Refresh GitHub"
      disabled={refreshing || insightsLoading || weeklyStackLoading}
      onClick={handleRefresh}
      className="rounded-full p-2 text-black/40 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-50 dark:text-white/40 dark:hover:bg-white/10"
    >
      <RefreshCw
        className={cn("size-4", (refreshing || insightsLoading || weeklyStackLoading) && "animate-spin")}
      />
    </button>
  )

  if (fullPage) {
    const showHero = Boolean(heroView?.weeks.length || insightsLoading)
    const heroContributionLabel =
      heroPeriod === "all"
        ? "contributions · all time"
        : heroPeriod === "rolling"
          ? "contributions · last 52 weeks"
          : `contributions · ${heroPeriod}`
    return (
      <div
        className={cn(
          "space-y-6",
          layout === "compact" && "notch-scroll min-h-0 max-h-full pr-1",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GitHubProfileHeader
          className="pb-2"
          login={status.login ?? ""}
          loginLabel={loginLabel}
          avatarUrl={status.avatarUrl}
          profile={status.profile}
          actions={
            <PanelHeaderActions>
              <GitHubNotificationsMenu seed={status.notifications} onInboxChanged={() => void handleRefresh()} />
              {refreshButton}
            </PanelHeaderActions>
          }
        />

        {showHero ? (
          <section className="w-full min-w-0" aria-label="Contributions">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[28px] font-bold tracking-tight">
                  <AnimatedNumber
                    value={heroView?.total ?? 0}
                    format={(n) => n.toLocaleString()}
                    className="text-[28px] font-bold tracking-tight"
                  />
                  <span className="ml-2 text-[13px] font-medium text-black/40 dark:text-white/40">
                    {heroContributionLabel}
                  </span>
                </p>
              </div>
              <GitHubContributionPeriodSelect
                value={heroPeriod}
                yearOptions={heroYearOptions}
                currentYear={currentYear}
                onChange={setHeroPeriod}
              />
            </div>
            {heroView?.weeks.length ? (
              <GitHubContributionHeatmap
                weeks={heroView.weeks}
                calendarYear={typeof heroPeriod === "number" ? heroPeriod : undefined}
                variant={heroView.heatmapVariant}
                weekLimit={heroView.weekLimit}
                dayBreakdownSeed={
                  heroPeriod === currentYear || heroPeriod === "rolling"
                    ? status.todayBreakdown
                    : undefined
                }
              />
            ) : insightsLoading ? (
              <p className="text-[12px] text-black/45 dark:text-white/45">Loading contributions…</p>
            ) : insights.error ? (
              <p className="text-[12px] text-red-400/90">
                Couldn&apos;t load contributions ({insights.error}).
              </p>
            ) : null}
            {heroView?.weeks.length ? (
              <div className="mt-8">
                <GitHubContributionStats
                  weeks={heroView.weeks}
                  total12Months={heroView.total}
                  reposCreated={insights.reposCreated}
                  statsWindowDays={heroView.statsWindowDays}
                  bare
                />
              </div>
            ) : null}
          </section>
        ) : null}

        <GitHubRepoWeeklyStackChart
          className="w-full min-w-0"
          data={weeklyStack}
          loading={weeklyStackLoading}
        />

        <BentoGrid className="mt-10">
        <BentoTile col={12} surface={false} className="py-1">
          <GitHubRepositoriesPanel
            repoCatalog={insights.repoCatalog}
            weeklyStack={weeklyStack}
            chartYear={chartYear}
            viewerLogin={status.login}
            viewerAvatarUrl={status.avatarUrl}
            loading={insightsLoading}
            weeklyLoading={weeklyStackLoading}
          />
        </BentoTile>
        <BentoTile col={12} className={bentoPad()}>{prSection}</BentoTile>
      </BentoGrid>
      </div>
    )
  }

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      {header}
      <div className="mb-4">
        <GitHubTodayPanel
          weeks={status.contributions?.weeks ?? []}
          breakdown={status.todayBreakdown}
          loading={loading}
          className="mb-4"
        />
        {status.contributions?.weeks?.length ? (
          <section className="mb-4">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
                Contributions
              </p>
              <span className="text-[11px] text-black/35 dark:text-white/35">
                <AnimatedNumber value={status.contributions.total} className="text-[11px]" />
              </span>
            </div>
            <GitHubContributionHeatmap
              weeks={status.contributions.weeks ?? []}
              variant={heatmapVariant}
              dayBreakdownSeed={status.todayBreakdown}
            />
          </section>
        ) : null}
      </div>
      {prSection}
    </div>
  )
}

function Section({
  title,
  count,
  children,
  className,
}: {
  title: string
  count: number
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          {title}
        </p>
        <span className="text-[11px] tabular-nums text-black/35 dark:text-white/35">{count}</span>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  )
}

function RowButton({
  title,
  subtitle,
  unread,
  onOpen,
}: {
  title: string
  subtitle: string
  unread?: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-start justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-black/4 dark:hover:bg-white/6",
        unread && "bg-black/[0.03] dark:bg-white/[0.04]",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium">{title}</p>
        <p className="truncate text-[11px] text-black/40 dark:text-white/40">{subtitle}</p>
      </div>
      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-black/30 dark:text-white/30" />
    </button>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-2 py-1 text-[12px] text-black/40 dark:text-white/40">{text}</p>
}
