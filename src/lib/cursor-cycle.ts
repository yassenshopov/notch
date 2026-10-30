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
  }
}
