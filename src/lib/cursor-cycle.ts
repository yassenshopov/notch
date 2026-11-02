import type { CursorUsagePlan } from "./cursor"

export type CursorCyclePace = {
  daysElapsed: number
  daysTotal: number
  daysRemaining: number
  cycleProgressPercent: number
  usedPercent: number
  expectedUsedPercent: number
  /** Negative = under linear pace (headroom), positive = ahead of pace */
  paceDeltaPercent: number
  dailyUsedPercent: number
  projectedEndPercent: number
  onTrack: boolean
  /** Days until included quota hits 100% at current daily rate (null if no usage yet) */
  daysUntilDepletion: number | null
}

export function cursorUsageNeedsAttention(
  usage: CursorUsagePlan,
  pace: CursorCyclePace | null,
  usageWarningPercent: number,
): boolean {
  const pct = Math.round(usage.totalPercentUsed)
  if (pct >= usageWarningPercent) return true
  return pace != null && !pace.onTrack
}

export function formatCursorUsageAlert(
  usage: CursorUsagePlan,
  pace: CursorCyclePace | null,
  usageWarningPercent: number,
): { id: string; label: string } | null {
  const pct = Math.round(usage.totalPercentUsed)
  const overThreshold = pct >= usageWarningPercent
  const offPace = pace != null && !pace.onTrack
  if (!overThreshold && !offPace) return null

  if (offPace && pace) {
    const projected = Math.round(pace.projectedEndPercent)
    if (overThreshold) {
      return {
        id: `cursor-usage-${pct}-pace-${projected}`,
        label: `Cursor ${pct}% · hot pace (~${projected}%)`,
      }
    }
    const depletionDays =
      pace.daysUntilDepletion != null ? Math.max(1, Math.round(pace.daysUntilDepletion)) : null
    const runOutLabel =
      depletionDays != null && depletionDays < pace.daysRemaining
        ? `may run out in ~${depletionDays}d`
        : `~${projected}% projected by renewal`
    return {
      id: `cursor-usage-pace-${projected}`,
      label: `Cursor hot pace · ${runOutLabel}`,
    }
  }

  return {
    id: `cursor-usage-${pct}`,
    label: `Cursor ${pct}% used`,
  }
}

function parseCycleDay(iso: string | null | undefined) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

export function computeCursorCyclePace(
  usage: CursorUsagePlan | null | undefined,
  billing: {
    cycleStart: string | null
    cycleEnd: string | null
    daysLeft?: number | null
  } | null | undefined,
): CursorCyclePace | null {
  if (!usage || !billing) return null
  const start = parseCycleDay(billing.cycleStart)
  const end = parseCycleDay(billing.cycleEnd)
  if (start == null || end == null || end <= start) return null

  const daysTotal = Math.max(1, Math.round((end - start) / 86_400_000))
  const daysLeft =
    billing.daysLeft != null
      ? Math.max(0, billing.daysLeft)
      : Math.max(0, Math.round((end - Date.now()) / 86_400_000))
  const daysElapsed = Math.min(daysTotal, Math.max(0, daysTotal - daysLeft))
  const cycleProgressPercent = (daysElapsed / daysTotal) * 100
  const usedPercent = usage.totalPercentUsed
  const expectedUsedPercent = cycleProgressPercent
  const paceDeltaPercent = usedPercent - expectedUsedPercent
  const dailyUsedPercent = daysElapsed > 0 ? usedPercent / daysElapsed : 0
  const projectedEndPercent = Math.min(999, dailyUsedPercent * daysTotal)
  const onTrack = projectedEndPercent <= 100
  const daysUntilDepletion =
    dailyUsedPercent > 0 && usedPercent < 100
      ? (100 - usedPercent) / dailyUsedPercent
      : usedPercent >= 100
        ? 0
        : null

  return {
    daysElapsed,
    daysTotal,
    daysRemaining: daysLeft,
    cycleProgressPercent,
    usedPercent,
    expectedUsedPercent,
    paceDeltaPercent,
    dailyUsedPercent,
    projectedEndPercent,
    onTrack,
    daysUntilDepletion,
  }
}
