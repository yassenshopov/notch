type Props = {
  series: number[]
  playhead: number
}

export function StravaMetricSparkline({ series, playhead }: Props) {
  const w = 64
  const h = 22
  const pad = 1.5

  const finite = series.filter((v) => Number.isFinite(v))
  if (finite.length < 2) return null

  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const span = max - min || 1
  const last = series.length - 1

  const points = series
    .map((v, i) => {
      if (!Number.isFinite(v)) return null
      const x = pad + (i / last) * (w - pad * 2)
      const y = pad + (1 - (v - min) / span) * (h - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .filter(Boolean)
    .join(" ")

  if (!points) return null

  const ix = Math.min(last, Math.max(0, playhead))
  const lo = Math.floor(ix)
  const hi = Math.min(last, lo + 1)
  const t = ix - lo
  const a = series[lo]
  const b = series[hi]
  let cv = Number.NaN
  if (Number.isFinite(a) && Number.isFinite(b)) cv = a + (b - a) * t
  else if (Number.isFinite(a)) cv = a
  else if (Number.isFinite(b)) cv = b
  const cx = pad + (ix / last) * (w - pad * 2)
  const cy = Number.isFinite(cv)
    ? pad + (1 - (cv - min) / span) * (h - pad * 2)
    : h / 2

  return (
    <svg
      width={w}
      height={h}
      className="mb-0.5 shrink-0 text-black/30 dark:text-white/30"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={cx}
        cy={cy}
        r={2.75}
        className="fill-black/65 dark:fill-white/75"
      />
    </svg>
  )
}
