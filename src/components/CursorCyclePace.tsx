import { computeCursorCyclePace } from "../lib/cursor-cycle"
import type { CursorStatus } from "../lib/cursor"
import { cn } from "../lib/utils"

type Props = {
  status: CursorStatus
  bare?: boolean
}

export function CursorCyclePace({ status, bare }: Props) {
  const pace = computeCursorCyclePace(status.usage, status.billing)
  if (!pace || status.billing?.isUnlimited) return null

  const headroom = pace.paceDeltaPercent <= 0
  const deltaLabel = `${pace.paceDeltaPercent >= 0 ? "+" : ""}${Math.round(pace.paceDeltaPercent)}%`
  const projected = Math.round(pace.projectedEndPercent)

  const body = (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <MiniStat label="Cycle" value={`${Math.round(pace.cycleProgressPercent)}%`} />
        <MiniStat label="Used" value={`${Math.round(pace.usedPercent)}%`} />
        <MiniStat label="Pace" value={deltaLabel} accent={headroom} />
        <MiniStat label="Projected" value={`${projected}%`} warn={!pace.onTrack} />
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-black/20 dark:bg-white/25"
          style={{ width: `${Math.min(100, pace.expectedUsedPercent)}%` }}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width]",
            pace.onTrack ? "bg-black/55 dark:bg-white/60" : "bg-amber-600 dark:bg-amber-500",
          )}
          style={{ width: `${Math.min(100, pace.usedPercent)}%` }}
        />
      </div>
      <p className="text-[11px] leading-snug text-black/40 dark:text-white/40">
        {headroom
          ? `Under linear pace — about ${Math.max(0, Math.round(100 - pace.projectedEndPercent))}% headroom if usage stays steady.`
          : `Ahead of linear pace — projected to hit ~${projected}% of included quota by renewal (${pace.daysRemaining}d left).`}
      </p>
    </div>
  )

  if (bare) {
    return (
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          Cycle pacing
        </p>
        {body}
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-black/[0.07] bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
        Cycle pacing
      </p>
      {body}
    </section>
  )
}

function MiniStat({
  label,
  value,
  accent,
  warn,
}: {
  label: string
  value: string
  accent?: boolean
  warn?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] text-black/35 dark:text-white/35">{label}</p>
      <p
        className={cn(
          "text-[13px] font-semibold tabular-nums",
          warn && "text-amber-700 dark:text-amber-400",
          accent && !warn && "text-emerald-700 dark:text-emerald-400",
        )}
      >
        {value}
      </p>
    </div>
  )
}
