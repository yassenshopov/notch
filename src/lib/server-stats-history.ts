import type { ServerStatsStatus } from "./server-stats"

export type ServerStatsMetricPoint = { time: string; value: number }

export type ServerStatsHistory = {
  memPct: ServerStatsMetricPoint[]
  diskPct: ServerStatsMetricPoint[]
  load1: ServerStatsMetricPoint[]
  cpuTempC: ServerStatsMetricPoint[]
  swapPct: ServerStatsMetricPoint[]
}

export const emptyServerStatsHistory = (): ServerStatsHistory => ({
  memPct: [],
  diskPct: [],
  load1: [],
  cpuTempC: [],
  swapPct: [],
})

const MAX_POINTS = 56

function pushPoint(
  series: ServerStatsMetricPoint[],
  time: string,
  value: number | null | undefined,
  maxPoints: number,
): ServerStatsMetricPoint[] {
  if (value == null || !Number.isFinite(value)) return series
  const next = [...series, { time, value }]
  if (next.length > maxPoints) return next.slice(next.length - maxPoints)
  return next
}

export function pushServerStatsHistory(
  history: ServerStatsHistory,
  status: ServerStatsStatus,
  maxPoints = MAX_POINTS,
): ServerStatsHistory {
  const time = new Date().toISOString()
  return {
    memPct: pushPoint(history.memPct, time, status.memUsedPct, maxPoints),
    diskPct: pushPoint(history.diskPct, time, status.diskUsedPct, maxPoints),
    load1: pushPoint(history.load1, time, status.load1, maxPoints),
    cpuTempC: pushPoint(history.cpuTempC, time, status.cpuTempC, maxPoints),
    swapPct: pushPoint(history.swapPct, time, status.swapUsedPct, maxPoints),
  }
}
