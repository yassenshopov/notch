import { useMemo, type CSSProperties, type ReactNode } from "react"
import type { SpotifyMonthlyListening } from "../lib/spotify-insights"
import { formatListeningMinutes } from "../lib/spotify-insights"
import { cn } from "../lib/utils"

type Props = {
  year: number
  monthly: SpotifyMonthlyListening[]
  className?: string
}

export function SpotifyMonthlyListeningChart({ year, monthly, className }: Props) {
  const rows = useMemo(() => {
    const byMonth = new Map(monthly.map((m) => [m.month, m]))
    const out: { key: string; label: string; ms: number }[] = []
    for (let m = 0; m < 12; m++) {
      const key = `${year}-${String(m + 1).padStart(2, "0")}`
      const hit = byMonth.get(key)
      out.push({
        key,
        label: new Date(Date.UTC(year, m, 1)).toLocaleDateString(undefined, { month: "short" }),
        ms: hit?.ms ?? 0,
      })
    }
    return out
  }, [monthly, year])

  const maxMs = useMemo(() => Math.max(1, ...rows.map((r) => r.ms)), [rows])

  if (!monthly.length) return null

  return (
    <section className={cn("min-w-0", className)} aria-label={`Monthly listening in ${year}`}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
        Monthly listening · {year}
      </h3>
      <Card className="mt-3">
        <div className="flex h-36 items-end gap-1.5 sm:gap-2">
          {rows.map((row) => {
            const pct = row.ms > 0 ? Math.max(4, (row.ms / maxMs) * 100) : 0
            return (
              <div key={row.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <MonthBar style={{ height: `${pct}%` }} title={formatListeningMinutes(row.ms)} />
                <span className="text-[10px] text-black/40 dark:text-white/40">{row.label}</span>
              </div>
            )
          })}
        </div>
      </Card>
    </section>
  )
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/[0.06] bg-black/[0.02] p-4 dark:border-white/[0.08] dark:bg-white/[0.04]",
        className,
      )}
    >
      {children}
    </div>
  )
}

function MonthBar({ style, title }: { style: CSSProperties; title: string }) {
  return (
    <div
      className="w-full min-h-[2px] rounded-md bg-[#1db954]/85 dark:bg-[#1db954]/75"
      style={style}
      title={title}
      role="presentation"
    />
  )
}