import type { ReactNode } from "react"
import { RefreshCw, Server } from "lucide-react"
import { useSettings } from "../config/settings-store"
import type { ServerStatsHistory, ServerStatsMetricPoint } from "../lib/server-stats-history"
import { formatUptime, type ServerStatsStatus } from "../lib/server-stats"
import { MINT_PANEL_GREEN } from "../lib/mint-theme"
import { PI_PANEL_RED } from "../lib/pi-theme"
import { formatHour } from "../lib/utils"
import { cn } from "../lib/utils"
import type { ChartYAxisKind } from "../lib/chart-axis"
import { MetricChart } from "./MetricChart"

type Props = {
  title: string
  sshHint: ReactNode
  status: ServerStatsStatus
  history: ServerStatsHistory
  loading?: boolean
  refreshing: boolean
  onRefresh: () => void
  /** Third stat column: git mirrors (mint) vs CPU temp (pi) */
  tertiary?: "mirrors" | "temp"
  /** Mint shows mirror + CPU rows; pi emphasizes thermals */
  flavor?: "mint" | "pi"
}

function barOpacity(pct: number): number {
  return pct >= 90 ? 1 : pct >= 75 ? 0.92 : 0.82
}

function Bar({
  label,
  pct,
  detail,
  accentColor,
}: {
  label: string
  pct: number | null
  detail: string
  accentColor?: string
}) {
  const p = pct == null ? 0 : Math.min(100, Math.max(0, pct))
  const branded = accentColor != null
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
          {label}
        </span>
        <span className="text-[11px] tabular-nums text-black/45 dark:text-white/45">{detail}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            !branded &&
              (p >= 90 ? "bg-red-500/80" : p >= 75 ? "bg-amber-500/80" : "bg-emerald-500/80"),
          )}
          style={
            branded
              ? {
                  width: `${p}%`,
                  backgroundColor: accentColor,
                  opacity: barOpacity(p),
                }
              : { width: `${p}%` }
          }
        />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  accentColor,
}: {
  label: string
  value: string
  sub?: string
  accentColor?: string
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-2.5 py-2",
        !accentColor && "bg-black/[0.04] dark:bg-white/[0.06]",
      )}
      style={accentColor ? { backgroundColor: `${accentColor}1a` } : undefined}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40 dark:text-white/40">
        {label}
      </p>
      <p className="text-[15px] font-semibold tabular-nums tracking-tight">{value}</p>
      {sub ? <p className="text-[10px] text-black/35 dark:text-white/35">{sub}</p> : null}
    </div>
  )
}

function TrendChart({
  label,
  points,
  accent,
  gradientId,
  formatValue,
  clockFormat,
  yAxis,
}: {
  label: string
  points: ServerStatsMetricPoint[]
  accent: string
  gradientId: string
  formatValue: (v: number) => string
  clockFormat: "12h" | "24h"
  yAxis: ChartYAxisKind
}) {
  if (points.length === 0) return null
  return (
    <div
      className="max-h-[6.5rem] overflow-hidden rounded-xl px-2.5 pb-1.5 pt-2"
      style={{ backgroundColor: `${accent}14` }}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40 dark:text-white/40">
        {label}
      </p>
      <MetricChart
        points={points}
        variant="area"
        compact
        yAxis={yAxis}
        accent={accent}
        gradientId={gradientId}
        formatValue={formatValue}
        formatTime={(iso) => formatHour(iso, clockFormat)}
        markNow
      />
    </div>
  )
}

export function ServerStatsPanel({
  title,
  sshHint,
  status,
  history,
  loading,
  refreshing,
  onRefresh,
  tertiary = "mirrors",
  flavor = "pi",
}: Props) {
  const clockFormat = useSettings().clock.format
  const panelAccent = flavor === "mint" ? MINT_PANEL_GREEN : PI_PANEL_RED

  if (!status.connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <Server className="mb-2 size-8 text-black/30 dark:text-white/30" strokeWidth={1.5} />
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
          SSH to <span className="font-medium">{status.host}</span> failed.
        </p>
        {status.error ? (
          <p className="mt-1 max-w-[280px] break-all text-[11px] text-red-400/90">{status.error}</p>
        ) : null}
        <p className="mt-3 text-[11px] text-black/35 dark:text-white/35">{sshHint}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-4 rounded-full px-4 py-2 text-[12px] font-medium bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
        >
          Retry
        </button>
      </div>
    )
  }

  const name = status.hostname ?? title
  const loadSub =
    status.load5 != null && status.load15 != null
      ? `5m ${status.load5.toFixed(2)} · 15m ${status.load15.toFixed(2)}`
      : status.load5 != null
        ? `5m ${status.load5.toFixed(2)}`
        : undefined

  const tertiaryStat =
    tertiary === "temp"
      ? {
          label: "CPU",
          value: status.cpuTempC != null ? `${status.cpuTempC.toFixed(1)}°` : "—",
          sub: "temp",
        }
      : {
          label: "Mirrors",
          value: status.mirrorRepoCount != null ? String(status.mirrorRepoCount) : "—",
          sub: "git repos",
        }

  const showTempChart =
    flavor === "pi" ||
    flavor === "mint" ||
    status.cpuTempC != null ||
    history.cpuTempC.length > 0

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-4 flex items-start justify-between gap-2 pr-8">
        <div>
          <p className="text-[15px] font-semibold tracking-tight">{name}</p>
          <p className="text-[12px] text-black/45 dark:text-white/45">
            {status.host}
            {status.tailscaleIp ? ` · ${status.tailscaleIp}` : ""}
            {status.cpuCount != null ? ` · ${status.cpuCount} cores` : ""}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Refresh ${title}`}
          disabled={refreshing}
          onClick={onRefresh}
          className="rounded-full p-2 text-black/40 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-50 dark:text-white/40 dark:hover:bg-white/10"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        </button>
      </header>

      {loading ? (
        <p className="text-[12px] text-black/40 dark:text-white/40">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat accentColor={panelAccent} label="Uptime" value={formatUptime(status.uptimeSec)} />
            <Stat
              accentColor={panelAccent}
              label="Load"
              value={status.load1 != null ? status.load1.toFixed(2) : "—"}
              sub={loadSub}
            />
            <Stat
              accentColor={panelAccent}
              label={tertiaryStat.label}
              value={tertiaryStat.value}
              sub={tertiaryStat.sub}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat
              accentColor={panelAccent}
              label="CPU temp"
              value={status.cpuTempC != null ? `${status.cpuTempC.toFixed(1)}°` : "—"}
              sub="now"
            />
            <Stat
              accentColor={panelAccent}
              label="Swap"
              value={status.swapUsedPct != null ? `${status.swapUsedPct.toFixed(0)}%` : "—"}
              sub={
                status.swapUsedMb != null && status.swapTotalMb != null
                  ? `${status.swapUsedMb} / ${status.swapTotalMb} MB`
                  : undefined
              }
            />
            {flavor === "mint" ? (
              <Stat
                accentColor={panelAccent}
                label="Processes"
                value={status.processCount != null ? String(status.processCount) : "—"}
                sub="running"
              />
            ) : (
              <Stat
                accentColor={panelAccent}
                label="Load 15m"
                value={status.load15 != null ? status.load15.toFixed(2) : "—"}
                sub={status.processCount != null ? `${status.processCount} procs` : undefined}
              />
            )}
          </div>

          {flavor === "mint" ? (
            <div className="grid grid-cols-2 gap-2">
              <Stat
                accentColor={panelAccent}
                label="Load 15m"
                value={status.load15 != null ? status.load15.toFixed(2) : "—"}
                sub={
                  status.cpuCount != null && status.load15 != null
                    ? `${((status.load15 / status.cpuCount) * 100).toFixed(0)}% of cores`
                    : undefined
                }
              />
              <Stat
                accentColor={panelAccent}
                label="Cores"
                value={status.cpuCount != null ? String(status.cpuCount) : "—"}
                sub="CPU"
              />
            </div>
          ) : null}

          <Bar
            label="Memory"
            pct={status.memUsedPct}
            accentColor={panelAccent}
            detail={
              status.memUsedMb != null && status.memTotalMb != null
                ? `${status.memUsedMb} / ${status.memTotalMb} MB`
                : "—"
            }
          />
          <Bar
            label="Disk /"
            pct={status.diskUsedPct}
            accentColor={panelAccent}
            detail={
              status.diskUsedGb != null && status.diskTotalGb != null
                ? `${status.diskUsedGb} / ${status.diskTotalGb} GB`
                : "—"
            }
          />
          {status.swapTotalMb != null && status.swapTotalMb > 0 ? (
            <Bar
              label="Swap"
              pct={status.swapUsedPct}
              accentColor={panelAccent}
              detail={
                status.swapUsedMb != null
                  ? `${status.swapUsedMb} / ${status.swapTotalMb} MB`
                  : "—"
              }
            />
          ) : null}

          {flavor === "mint" && (status.mirrorRepoCount != null || status.mirrorLastLog) ? (
            <div
              className="rounded-xl border px-3 py-2.5"
              style={{ borderColor: `${panelAccent}33` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40 dark:text-white/40">
                Git mirrors
              </p>
              <p className="mt-1 text-[13px] font-medium tabular-nums">
                {status.mirrorRepoCount ?? "—"} repositories
              </p>
              {status.mirrorLastLog ? (
                <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">
                  Latest log:{" "}
                  <span className="font-mono text-[10px]">{status.mirrorLastLog}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {flavor === "pi" &&
          ((status.mirrorRepoCount != null && status.mirrorRepoCount > 0) || status.mirrorLastLog) ? (
            <div
              className="rounded-xl border px-3 py-2.5"
              style={{ borderColor: `${panelAccent}33` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40 dark:text-white/40">
                Git mirrors
              </p>
              <p className="mt-1 text-[13px] font-medium tabular-nums">
                {status.mirrorRepoCount ?? "—"} repositories
              </p>
              {status.mirrorLastLog ? (
                <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">
                  Latest log:{" "}
                  <span className="font-mono text-[10px]">{status.mirrorLastLog}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="min-w-0 overflow-hidden">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35 dark:text-white/35">
              Session trends
            </p>
            <div className="flex min-w-0 flex-col gap-2">
              <TrendChart
                label="Memory %"
                points={history.memPct}
                accent={panelAccent}
                gradientId={`${flavor}-mem`}
                yAxis="percent"
                formatValue={(v) => `${Math.round(v)}%`}
                clockFormat={clockFormat}
              />
              <TrendChart
                label="Disk %"
                points={history.diskPct}
                accent={panelAccent}
                gradientId={`${flavor}-disk`}
                yAxis="percent"
                formatValue={(v) => `${Math.round(v)}%`}
                clockFormat={clockFormat}
              />
              <TrendChart
                label="Load (1m)"
                points={history.load1}
                accent={panelAccent}
                gradientId={`${flavor}-load`}
                yAxis="load"
                formatValue={(v) => (v >= 10 ? v.toFixed(1) : v.toFixed(2))}
                clockFormat={clockFormat}
              />
              {showTempChart ? (
                <TrendChart
                  label="CPU °C"
                  points={history.cpuTempC}
                  accent={panelAccent}
                  gradientId={`${flavor}-temp`}
                  yAxis="temp"
                  formatValue={(v) => `${Math.round(v)}°`}
                  clockFormat={clockFormat}
                />
              ) : null}
              {history.swapPct.length > 0 ? (
                <TrendChart
                  label="Swap %"
                  points={history.swapPct}
                  accent={panelAccent}
                  gradientId={`${flavor}-swap`}
                  yAxis="percent"
                  formatValue={(v) => `${Math.round(v)}%`}
                  clockFormat={clockFormat}
                />
              ) : null}
            </div>
            {history.memPct.length < 2 ? (
              <p className="mt-2 text-[11px] text-black/35 dark:text-white/35">
                Charts fill in as polls arrive ({history.memPct.length} sample
                {history.memPct.length === 1 ? "" : "s"}).
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
