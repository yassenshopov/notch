import { useMemo } from "react"
import { formatClock } from "../lib/utils"

type Props = {
  sunrise: string
  sunset: string
  mode: "sunrise" | "sunset"
}

export function SunPath({ sunrise, sunset, mode }: Props) {
  const { progress, nowLabel } = useMemo(() => {
    const rise = new Date(sunrise).getTime()
    const set = new Date(sunset).getTime()
    const now = Date.now()
    const span = Math.max(1, set - rise)
    const raw = (now - rise) / span
    return {
      progress: Math.min(1, Math.max(0, raw)),
      nowLabel: formatClock(new Date().toISOString()),
    }
  }, [sunrise, sunset])

  // Semicircle path in viewBox 0 0 100 56
  const r = 42
  const cx = 50
  const cy = 50
  const startX = cx - r
  const endX = cx + r
  const arc = `M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`

  const angle = Math.PI * (1 - progress)
  const sunX = cx + r * Math.cos(angle)
  const sunY = cy - r * Math.sin(angle)

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <svg viewBox="0 0 100 62" className="min-h-[10rem] w-full flex-1">
        <path
          d={arc}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d={arc}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="120"
          strokeDashoffset={120 * (1 - (mode === "sunrise" ? Math.min(progress, 0.5) * 2 : progress))}
        />
        <circle cx={sunX} cy={sunY} r="3.2" fill="currentColor" />
        <line
          x1={startX}
          y1={cy}
          x2={endX}
          y2={cy}
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="1"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-black/40 dark:text-white/40">
        <span>{formatClock(sunrise)}</span>
        <span className="text-black/30 dark:text-white/30">{nowLabel}</span>
        <span>{formatClock(sunset)}</span>
      </div>
    </div>
  )
}
