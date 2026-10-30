import { Icon } from "@iconify/react"
import { ExternalLink, RefreshCw } from "lucide-react"
import type { ReactNode } from "react"
import {
  formatCursorCents,
  openCursorDashboard,
  openCursorUrl,
  type CursorStatus,
} from "../lib/cursor"
import { useSettings } from "../config/settings-store"
import { cn, formatShortDate } from "../lib/utils"
import { usePanelLayout } from "../lib/panel-layout"
import { BentoGrid, BentoTile, bentoPad } from "./desktop/DesktopBento"
import { PanelHeaderActions } from "./PanelHeaderActions"
import { CursorModelBars } from "./CursorModelBars"
import { MetricChart } from "./MetricChart"
import { CursorCyclePace } from "./CursorCyclePace"
import { maskEmail, usePrivacyMode } from "../lib/privacy"

type Props = {
  status: CursorStatus
  analyticsLoading?: boolean
  refreshing: boolean
  onRefresh: () => void
}

function formatCycleDate(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  } catch {
    return "—"
  }
}

function formatPlanLabel(type: string | null | undefined) {
  if (!type) return "Cursor"
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function formatDayKey(key: string) {
  const d = new Date(`${key}T12:00:00`)
  if (Number.isNaN(d.getTime())) return key
  return formatShortDate(key)
}

function formatRelativeTime(ms: number) {
  if (!ms) return "—"
  const delta = Date.now() - ms
  const mins = Math.round(delta / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return formatShortDate(new Date(ms).toISOString().slice(0, 10))
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
        {title}
      </p>
      {subtitle ? (
        <p className="mt-0.5 text-[11px] text-black/35 dark:text-white/35">{subtitle}</p>
      ) : null}
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
  bare,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  bare?: boolean
}) {
  if (bare) {
    return (
      <section>
        <SectionTitle title={title} subtitle={subtitle} />
        {children}
      </section>
    )
  }
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
      <SectionTitle title={title} subtitle={subtitle} />
      {children}
    </section>
  )
}

function UsageBar({
  label,
  percent,
  hint,
}: {
  label: string
  percent: number
  hint?: string | null
}) {
  const clamped = Math.min(100, Math.max(0, percent))
  const hot = clamped >= 90

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-black/70 dark:text-white/70">{label}</span>
        <span
          className={cn(
            "text-[12px] font-semibold tabular-nums",
            hot ? "text-black dark:text-white" : "text-black/50 dark:text-white/50",
          )}
        >
          {Math.round(clamped)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            hot ? "bg-black dark:bg-white" : "bg-black/45 dark:bg-white/45",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {hint ? (
        <p className="text-[11px] leading-snug text-black/38 dark:text-white/38">{hint}</p>
      ) : null}
    </div>
  )
}

export function CursorPanel({ status, analyticsLoading, refreshing, onRefresh }: Props) {
  const settings = useSettings()
  const desktop = usePanelLayout() === "desktop"
  const privacy = usePrivacyMode()

  if (status.error === "no_electron") {
    return (
      <EmptyState
        title="Cursor"
        body={status.message ?? "Open Notch in Electron to see usage."}
        fullHeight={!desktop}
      />
    )
  }

  if (!status.connected) {
    return (
      <EmptyState
        title="Cursor"
        body={
          status.message ??
          "Sign in to the Cursor desktop app on this PC so Notch can read your usage."
        }
        fullHeight={!desktop}
        action={
          <button
            type="button"
            disabled={refreshing}
            onClick={(e) => {
              e.stopPropagation()
              onRefresh()
            }}
            className="rounded-full bg-[#111] px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-[#111]"
          >
            {refreshing ? "Checking…" : "Retry"}
          </button>
        }
      />
    )
  }

  const usage = status.usage
  const billing = status.billing
  const breakdown = usage?.breakdown
  const analytics = status.analytics
  const daily = analytics?.dailySpend ?? []
  const cloud = status.cloud

  const hasAnalytics =
    Boolean(analytics?.tokenTotals) ||
    Boolean(analytics?.models?.length) ||
    Boolean(analytics?.recentEvents?.length) ||
    Boolean(cloud?.agents?.length)

  const refreshButton = (
    <button
      type="button"
      aria-label="Refresh usage"
      disabled={refreshing}
      onClick={(e) => {
        e.stopPropagation()
        onRefresh()
      }}
      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-black/[0.07] bg-black/[0.03] text-black/50 transition-colors hover:bg-black/[0.06] hover:text-black/75 disabled:pointer-events-none disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/50 dark:hover:bg-white/[0.08] dark:hover:text-white/80"
    >
      <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
    </button>
  )

  const planSummary = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[15px] font-semibold tracking-tight">Cursor</p>
        {status.limits?.overageBlocked ? (
          <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/50 dark:bg-white/10 dark:text-white/50">
            Overage off
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
        {formatPlanLabel(billing?.membershipType)}
        {billing?.daysLeft != null ? ` · ${billing.daysLeft}d left` : ""}
        {" · "}
        {formatCycleDate(billing?.cycleStart)} – {formatCycleDate(billing?.cycleEnd)}
      </p>
      {status.user?.email ? (
        <p className="mt-0.5 truncate text-[11px] text-black/35 dark:text-white/35">
          {maskEmail(status.user.email, privacy)}
        </p>
      ) : null}
    </>
  )

  const quotaBlock =
    billing?.isUnlimited ? (
      <Section title="Plan" bare={desktop}>
        <p className="text-[13px] leading-relaxed text-black/55 dark:text-white/55">
          Unlimited included usage reported for this cycle.
        </p>
      </Section>
    ) : usage ? (
      <Section title="Included quota" bare={desktop}>
        <div className="flex flex-col gap-4">
          <UsageBar
            label="Total"
            percent={usage.totalPercentUsed}
            hint={status.messages?.auto}
          />
          <UsageBar
            label="API models"
            percent={usage.apiPercentUsed}
            hint={status.messages?.api}
          />
          <div className="grid grid-cols-3 gap-2 border-t border-black/[0.06] pt-3 dark:border-white/10">
            <Stat label="Used" value={usage.used.toLocaleString()} />
            <Stat label="Limit" value={usage.limit.toLocaleString()} />
            <Stat label="Left" value={usage.remaining.toLocaleString()} />
          </div>
          {breakdown ? (
            <p className="text-[11px] leading-relaxed text-black/38 dark:text-white/38">
              Pool {breakdown.total.toLocaleString()} · included{" "}
              {breakdown.included.toLocaleString()} · bonus {breakdown.bonus.toLocaleString()}
            </p>
          ) : null}
        </div>
      </Section>
    ) : null

  const tokensBlock = analytics?.tokenTotals ? (
    <Section
      title="Tokens this cycle"
      subtitle={
        analytics.eventsSampled < analytics.eventsInCycle
          ? `Daily chart from ${analytics.eventsSampled.toLocaleString()} of ${analytics.eventsInCycle.toLocaleString()} events`
          : `${analytics.eventsInCycle.toLocaleString()} requests`
      }
      bare={desktop}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] tabular-nums text-black/50 dark:text-white/50">
        <span>In {formatTokenMillions(analytics.tokenTotals.inputTokens)}</span>
        <span>Out {formatTokenMillions(analytics.tokenTotals.outputTokens)}</span>
        <span className="col-span-2">
          Est. value {formatCursorCents(analytics.tokenTotals.costCents)}
        </span>
      </div>
      {daily.length > 1 ? (
        <MetricChart
          points={daily}
          variant={settings.charts.style}
          className="min-h-[7.5rem]"
          accent="currentColor"
          formatValue={(v) => formatCursorCents(v)}
          formatTime={formatDayKey}
        />
      ) : (
        <p className="text-[12px] text-black/35 dark:text-white/35">Not enough daily data yet.</p>
      )}
    </Section>
  ) : null

  const modelsBlock =
    analytics?.models && analytics.models.length > 0 ? (
      <Section title="By model" subtitle="Share of estimated cost this cycle" bare={desktop}>
        <CursorModelBars models={analytics.models} />
      </Section>
    ) : null

  const recentBlock =
    analytics?.recentEvents && analytics.recentEvents.length > 0 ? (
      <Section title="Recent" bare={desktop}>
        <ul className="flex flex-col gap-2">
          {analytics.recentEvents.map((ev, i) => (
            <li
              key={`${ev.timestamp}-${i}`}
              className="flex items-center justify-between gap-2 text-[12px]"
            >
              <span className="min-w-0 truncate text-black/65 dark:text-white/65">{ev.label}</span>
              <span className="shrink-0 tabular-nums text-black/40 dark:text-white/40">
                {formatRelativeTime(ev.timestamp)} · {formatCursorCents(ev.chargedCents)}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    ) : null

  const cloudBlock =
    cloud?.configured && cloud.agents.length > 0 ? (
      <Section
        title="Cloud agents"
        subtitle={cloud.apiKeyName ? `Key: ${cloud.apiKeyName}` : undefined}
        bare={desktop}
      >
        <ul className="flex flex-col gap-2">
          {cloud.agents.map((agent) => (
            <li key={agent.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-black/70 dark:text-white/70">
                  {agent.name}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-black/35 dark:text-white/35">
                  {agent.status}
                </p>
              </div>
              {agent.url ? (
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-medium text-black/55 hover:bg-black/[0.04] dark:border-white/15 dark:text-white/55 dark:hover:bg-white/[0.06]"
                  onClick={(e) => {
                    e.stopPropagation()
                    void openCursorUrl(agent.url!)
                  }}
                >
                  Open
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>
    ) : null

  const onDemandBlock = status.onDemand?.enabled ? (
    <Section title="On-demand" bare={desktop}>
      <p className="text-[13px] tabular-nums text-black/70 dark:text-white/70">
        {formatCursorCents(status.onDemand.used)}
        {status.onDemand.limit != null ? ` / ${formatCursorCents(status.onDemand.limit)}` : ""}
      </p>
    </Section>
  ) : null

  const analyticsFallback =
    analyticsLoading && !hasAnalytics ? (
      <Section title="Usage details" bare={desktop}>
        <p className="text-[12px] text-black/45 dark:text-white/45">
          Loading charts, models, and cloud agents…
        </p>
      </Section>
    ) : !analyticsLoading && !hasAnalytics ? (
      <Section title="Usage details" bare={desktop}>
        <p className="text-[12px] text-black/45 dark:text-white/45">
          Couldn’t load analytics. Tap refresh or fully quit and restart Notch (Electron must reload
          the main process).
        </p>
      </Section>
    ) : null

  const dashboardButton = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        void openCursorDashboard()
      }}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-black/[0.08] bg-black/[0.03] py-2.5 text-[13px] font-medium text-black/65 transition-colors hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:bg-white/[0.07]"
    >
      Open Cursor dashboard
      <ExternalLink className="size-3.5 opacity-60" />
    </button>
  )

  if (desktop) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <BentoGrid>
          <BentoTile col={4} className={bentoPad()}>
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="min-w-0">{planSummary}</div>
              <PanelHeaderActions>{refreshButton}</PanelHeaderActions>
            </div>
            {quotaBlock}
            <div className="mt-4">
              <CursorCyclePace status={status} bare />
            </div>
          </BentoTile>
          {tokensBlock ? (
            <BentoTile col={8} className={bentoPad()}>{tokensBlock}</BentoTile>
          ) : null}
          {modelsBlock ? (
            <BentoTile col={6} className={bentoPad()}>{modelsBlock}</BentoTile>
          ) : null}
          {recentBlock ? (
            <BentoTile col={6} className={bentoPad()} scroll>
              {recentBlock}
            </BentoTile>
          ) : null}
          {cloudBlock ? (
            <BentoTile col={6} className={bentoPad()} scroll>
              {cloudBlock}
            </BentoTile>
          ) : null}
          {onDemandBlock ? (
            <BentoTile col={6} className={bentoPad()}>{onDemandBlock}</BentoTile>
          ) : null}
          {analyticsFallback ? (
            <BentoTile col={12} className={bentoPad()}>{analyticsFallback}</BentoTile>
          ) : null}
          <BentoTile col={12} className={bentoPad()} surface={false}>
            {dashboardButton}
          </BentoTile>
        </BentoGrid>
      </div>
    )
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-3 flex shrink-0 items-start justify-between gap-3 pr-6">
        <div className="min-w-0">{planSummary}</div>
        {refreshButton}
      </header>

      <div className="notch-scroll min-h-0 flex-1 flex flex-col gap-4 pr-1">
        {quotaBlock}
        <CursorCyclePace status={status} />
        {analyticsFallback}
        {tokensBlock}
        {modelsBlock}
        {recentBlock}
        {cloud?.configured && cloud.agents.length > 0 ? (
          <Section
            title="Cloud agents"
            subtitle={cloud.apiKeyName ? `Key: ${cloud.apiKeyName}` : undefined}
          >
            <ul className="flex flex-col gap-2">
              {cloud.agents.slice(0, 3).map((agent) => (
                <li key={agent.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-black/70 dark:text-white/70">
                      {agent.name}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-black/35 dark:text-white/35">
                      {agent.status}
                    </p>
                  </div>
                  {agent.url ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-medium text-black/55 hover:bg-black/[0.04] dark:border-white/15 dark:text-white/55 dark:hover:bg-white/[0.06]"
                      onClick={(e) => {
                        e.stopPropagation()
                        void openCursorUrl(agent.url!)
                      }}
                    >
                      Open
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
        {onDemandBlock}
      </div>

      <div className="mt-2 shrink-0">{dashboardButton}</div>
    </div>
  )
}

function formatTokenMillions(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35 dark:text-white/35">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

function EmptyState({
  title,
  body,
  action,
  fullHeight = true,
}: {
  title: string
  body: ReactNode
  action?: ReactNode
  fullHeight?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center",
        fullHeight && "h-full",
      )}
    >
      <Icon icon="simple-icons:cursor" className="mb-3 size-8 text-black/20 dark:text-white/20" />
      <p className="text-[15px] font-semibold tracking-tight">{title}</p>
      <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-black/45 dark:text-white/45">
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
