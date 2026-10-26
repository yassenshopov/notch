export type ChartYAxisKind = "percent" | "load" | "temp" | "auto"

function niceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1
  const exp = Math.floor(Math.log10(rawStep))
  const base = Math.pow(10, exp)
  const f = rawStep / base
  let nf = 10
  if (f <= 1) nf = 1
  else if (f <= 2) nf = 2
  else if (f <= 5) nf = 5
  return nf * base
}

/** Round outward to human-friendly axis bounds. */
export function niceAxisBounds(dataMin: number, dataMax: number, tickCount = 4): { min: number; max: number } {
  if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
    return { min: 0, max: 1 }
  }
  if (dataMin === dataMax) {
    if (dataMin === 0) return { min: 0, max: 1 }
    const pad = Math.max(Math.abs(dataMin) * 0.15, 0.5)
    return { min: dataMin - pad, max: dataMax + pad }
  }

  const range = dataMax - dataMin
  const step = niceStep(range / Math.max(1, tickCount - 1))
  const min = Math.floor(dataMin / step) * step
  const max = Math.ceil(dataMax / step) * step
  return { min, max }
}

function padDataRange(min: number, max: number, ratio: number): { min: number; max: number } {
  const span = Math.max(max - min, 0.0001)
  const pad = span * ratio
  return { min: min - pad, max: max + pad }
}

export function resolveChartYDomain(
  kind: ChartYAxisKind,
  values: number[],
): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 }

  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)

  switch (kind) {
    case "percent": {
      const padded = padDataRange(dataMin, dataMax, 0.12)
      const nice = niceAxisBounds(padded.min, padded.max, 5)
      return {
        min: Math.max(0, nice.min),
        max: Math.min(100, Math.max(nice.max, nice.min + 1)),
      }
    }
    case "load": {
      const headroom = Math.max(dataMax * 0.15, 0.25)
      const nice = niceAxisBounds(0, dataMax + headroom, 4)
      return { min: 0, max: Math.max(nice.max, 0.5) }
    }
    case "temp": {
      const padded = padDataRange(dataMin, dataMax, 0.1)
      const nice = niceAxisBounds(padded.min, padded.max, 4)
      const span = Math.max(nice.max - nice.min, 4)
      return { min: nice.min, max: nice.max >= nice.min + 2 ? nice.max : nice.min + span }
    }
    default:
      return niceAxisBounds(dataMin, dataMax, 4)
  }
}

export function formatAxisMid(min: number, max: number): number {
  const step = niceStep((max - min) / 2)
  const mid = (min + max) / 2
  return Math.round(mid / step) * step
}
