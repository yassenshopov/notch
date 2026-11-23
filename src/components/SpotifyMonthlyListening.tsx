import { useMemo, type CSSProperties } from "react"
import type { SpotifyMonthlyListening } from "../lib/spotify-insights"
import { formatListeningMinutes } from "../lib/spotify-insights"
import { spotifyListeningBarColor } from "../lib/spotify-listening"
import { useTheme } from "../hooks/useTheme"
import { cn } from "../lib/utils"

type Props = {
  year: number
  monthly: SpotifyMonthlyListening[]
  className?: string
}

export function SpotifyMonthlyListeningChart({ year, monthly, className }: Props) {
  const dark = useTheme()
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
      <div className="mt-3 flex h-36 items-stretch gap-1.5 sm:gap-2">
        {rows.map((row) => {
          const pct = row.ms > 0 ? Math.max(4, (row.ms / maxMs) * 100) : 0
          const fill = spotifyListeningBarColor(row.ms, maxMs, dark)
          return (
            <div key={row.key} className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col justify-end">
                <MonthBar
                  style={{ height: `${pct}%`, backgroundColor: row.ms > 0 ? fill : undefined }}
                  title={formatListeningMinutes(row.ms)}
                  empty={row.ms <= 0}
                />
              </div>
              <span className="mt-1.5 shrink-0 text-center text-[10px] text-black/40 dark:text-white/40">
                {row.label}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MonthBar({
  style,
  title,
  empty,
}: {
  style: CSSProperties
  title: string
  empty?: boolean
}) {
  return (
    <div
      className={cn(
        "w-full min-h-[2px] rounded-md transition-colors",
        empty && "bg-black/[0.06] dark:bg-white/[0.08]",
      )}
      style={style}
      title={title}
      role="presentation"
    />
  )
}