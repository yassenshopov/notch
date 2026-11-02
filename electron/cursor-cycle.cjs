/** Keep in sync with src/lib/cursor-cycle.ts */

function parseCycleDay(iso) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

function computeCursorCyclePace(usage, billing) {
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

function cursorUsageNeedsAttention(usage, pace, usageWarningPercent) {
  const pct = Math.round(usage.totalPercentUsed)
  if (pct >= usageWarningPercent) return true
  return pace != null && !pace.onTrack
}

function formatCursorUsageTrayMessage(usage, pace, usageWarningPercent) {
  const pct = Math.round(usage.totalPercentUsed)
  const overThreshold = pct >= usageWarningPercent
  const offPace = pace != null && !pace.onTrack
  if (!overThreshold && !offPace) return null

  if (offPace && pace) {
    const projected = Math.round(pace.projectedEndPercent)
    if (overThreshold) {
      return `${pct}% used · on pace for ~${projected}% by renewal.`
    }
    const depletionDays =
      pace.daysUntilDepletion != null ? Math.max(1, Math.round(pace.daysUntilDepletion)) : null
    if (depletionDays != null && depletionDays < pace.daysRemaining) {
      return `Hot pace — included usage may run out in ~${depletionDays} days (${pct}% used now).`
    }
    return `Hot pace — projected ~${projected}% of included quota by renewal (${pct}% used now).`
  }

  return `${pct}% of your included usage this billing cycle.`
}

module.exports = {
  computeCursorCyclePace,
  cursorUsageNeedsAttention,
  formatCursorUsageTrayMessage,
}
