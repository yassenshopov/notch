import { AnimatePresence, motion } from "motion/react"
import { ChevronLeft, RefreshCw, TrendingDown, TrendingUp } from "lucide-react"
import { useMemo, useState } from "react"
import { useSettings } from "../config/settings-store"
import { useMarketChart } from "../hooks/useMarketChart"
import { marketAccentColor } from "../lib/market-assets"
import type { MarketChartRange, MarketQuote, MarketsSnapshot } from "../lib/markets"
import {
  formatMarketsError,
  formatQuoteChange,
  formatQuotePrice,
} from "../lib/markets"
import { cn, formatHour, formatShortDate } from "../lib/utils"
import { MarketAssetAvatar } from "./MarketAssetAvatar"
import { MetricChart } from "./MetricChart"

type Props = {
  snapshot: MarketsSnapshot
  loading: boolean
  hasWatchlist: boolean
  refreshing: boolean
  onRefresh: () => void
}

const RANGES: { id: MarketChartRange; label: string }[] = [
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" },
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "1y", label: "1Y" },
]

export function MarketsPanel({ snapshot, loading, refreshing, hasWatchlist, onRefresh }: Props) {
  const quotes = snapshot.quotes
  const [selected, setSelected] = useState<MarketQuote | null>(null)
  const [range, setRange] = useState<MarketChartRange>("1w")
  const clockFormat = useSettings().clock.format

  const activeQuote = useMemo(() => {
    if (!selected) return null
    return quotes.find((q) => q.id === selected.id && q.type === selected.type) ?? selected
  }, [quotes, selected])

  const { series, loading: chartLoading } = useMarketChart(activeQuote, range)

  const accent = activeQuote ? marketAccentColor(activeQuote) : undefined
  const periodUp = (series.changePercent ?? 0) >= 0

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <AnimatePresence mode="wait" initial={false}>
        {activeQuote ? (
          <motion.div
            key={`detail-${activeQuote.type}-${activeQuote.id}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.85 }}
            className="notch-scroll flex h-full min-h-0 flex-col pr-1"
          >
            <header className="mb-3 flex items-center gap-2 pr-8">
              <button
                type="button"
                aria-label="Back to watchlist"
                onClick={() => setSelected(null)}
                className="rounded-full p-2 text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
              >
                <ChevronLeft className="size-4" />
              </button>
              <MarketAssetAvatar quote={activeQuote} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold tracking-tight">
                  {activeQuote.symbol}
                </p>
                <p className="truncate text-[11px] text-black/40 dark:text-white/40">
                  {activeQuote.name}
                </p>
              </div>
            </header>

            <div className="mb-3">
              <p className="text-[28px] font-bold leading-none tracking-tight tabular-nums">
                {formatQuotePrice(activeQuote.price)}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums",
                    (activeQuote.changePercent24h ?? 0) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500",
                  )}
                >
                  {(activeQuote.changePercent24h ?? 0) >= 0 ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {formatQuoteChange(activeQuote.changePercent24h)} today
                </span>
                {series.changePercent != null ? (
                  <span
                    className={cn(
                      "text-[11px] font-medium tabular-nums",
                      periodUp ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-red-500/90",
                    )}
                  >
                    {formatQuoteChange(series.changePercent)} in range
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mb-3 flex gap-1">
              {RANGES.map((r) => {
                const active = range === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRange(r.id)}
                    className={cn(
                      "flex-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors",
                      active
                        ? "text-white"
                        : "text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10",
                    )}
                    style={active && accent ? { backgroundColor: accent } : undefined}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <StatPill label="Period high" value={formatQuotePrice(series.high)} accent={accent} />
              <StatPill label="Period low" value={formatQuotePrice(series.low)} accent={accent} />
            </div>

            <div className="h-[11.5rem] shrink-0">
              {series.error ? (
                <p className="text-[12px] text-red-400">{formatMarketsError(series.error)}</p>
              ) : chartLoading && series.points.length === 0 ? (
                <p className="text-[12px] text-black/45 dark:text-white/45">Loading chart…</p>
              ) : series.points.length === 0 ? (
                <p className="text-[12px] text-black/45 dark:text-white/45">
                  No chart data for this range. Try another period or refresh.
                </p>
              ) : (
                <MetricChart
                  key={`${activeQuote.id}-${range}`}
                  points={series.points}
                  variant="area"
                  accent={accent}
                  gradientId={`market-${activeQuote.type}-${activeQuote.id}`}
                  className="h-full"
                  formatValue={(v) => formatQuotePrice(v)}
                  formatTime={(iso) =>
                    range === "1d" || range === "1w"
                      ? formatHour(iso, clockFormat)
                      : formatShortDate(iso)
                  }
                />
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.85 }}
            className="notch-scroll flex h-full flex-col pr-1"
          >
            <header className="mb-4 flex items-start justify-between gap-2 pr-8">
              <div>
                <p className="text-[15px] font-semibold tracking-tight">Markets</p>
                <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
                  Watchlist — tap a symbol for the chart.
                </p>
              </div>
              <button
                type="button"
                aria-label="Refresh markets"
                disabled={refreshing}
                onClick={onRefresh}
                className="rounded-full p-2 text-black/40 hover:bg-black/5 hover:text-black/70 disabled:pointer-events-none disabled:opacity-50 dark:text-white/40 dark:hover:bg-white/10"
              >
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
              </button>
            </header>

            {snapshot.error ? (
              <p className="text-[12px] text-red-400">{formatMarketsError(snapshot.error)}</p>
            ) : null}

            <div className="flex flex-col gap-2">
              {quotes.length === 0 && !loading && !hasWatchlist ? (
                <p className="text-[12px] text-black/45 dark:text-white/45">
                  Add symbols in Settings → Markets.
                </p>
              ) : null}
              {quotes.length === 0 && !loading && hasWatchlist && !snapshot.error ? (
                <p className="text-[12px] text-black/45 dark:text-white/45">Loading quotes…</p>
              ) : null}
              {quotes.map((q) => {
                const up = (q.changePercent24h ?? 0) >= 0
                const itemAccent = marketAccentColor(q)
                return (
                  <button
                    key={`${q.type}-${q.id}`}
                    type="button"
                    onClick={() => setSelected(q)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.07] bg-black/[0.02] px-3.5 py-3 text-left transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                    style={{ boxShadow: `inset 3px 0 0 ${itemAccent}` }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <MarketAssetAvatar quote={q} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{q.symbol}</p>
                        <p className="truncate text-[11px] text-black/40 dark:text-white/40">
                          {q.name}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-semibold tabular-nums">
                        {formatQuotePrice(q.price)}
                      </p>
                      <p
                        className={cn(
                          "flex items-center justify-end gap-0.5 text-[11px] font-semibold tabular-nums",
                          up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500",
                        )}
                      >
                        {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {formatQuoteChange(q.changePercent24h)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div
      className="rounded-xl border border-black/[0.06] bg-black/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"
      style={accent ? { borderColor: `${accent}33` } : undefined}
    >
      <p className="text-[10px] font-medium text-black/40 dark:text-white/40">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold tabular-nums">{value}</p>
    </div>
  )
}
