import type { CursorModelRow } from "../lib/cursor"
import { formatCursorCents } from "../lib/cursor"
import { cn } from "../lib/utils"

const BAR_OPACITIES = [1, 0.72, 0.52, 0.38, 0.28, 0.22, 0.18, 0.14]

type Props = {
  models: CursorModelRow[]
  className?: string
}

export function CursorModelBars({ models, className }: Props) {
  if (models.length === 0) {
    return (
      <p className={cn("text-[12px] text-black/35 dark:text-white/35", className)}>
        No model breakdown this cycle.
      </p>
    )
  }

  const max = Math.max(...models.map((m) => m.totalCents), 0.0001)

  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {models.map((row, i) => {
        const pct = (row.totalCents / max) * 100
        const opacity = BAR_OPACITIES[i] ?? 0.12
        return (
          <li key={row.model} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12px] font-medium text-black/75 dark:text-white/75">
                  {row.label}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-black/40 dark:text-white/40">
                  {formatCursorCents(row.totalCents)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-[#111111] dark:bg-white"
                  style={{ width: `${pct}%`, opacity }}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
