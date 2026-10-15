import { useMemo } from "react"
import { useSettings } from "../config/settings-store"
import { cn, formatClock, parseSunTime } from "../lib/utils"

type Phase = "day" | "night" | "pre-dawn"

type Props = {
  sunrise: string
  sunset: string
  isToday?: boolean
  nextSunrise?: string | null
  previousSunset?: string | null
}

const STARS = [
  [22, 14],
  [38, 8],
  [58, 12],
  [74, 18],
  [48, 22],
  [30, 26],
  [66, 6],
] as const

export function SunPath({
  sunrise,
  sunset,
  isToday = true,
  nextSunrise = null,
  previousSunset = null,
}: Props) {
  const clockFormat = useSettings().clock.format

  const model = useMemo(() => {
    const riseMs = parseSunTime(sunrise)
    const setMs = parseSunTime(sunset)
    if (riseMs == null || setMs == null) {
      return { valid: false as const }
    }

    const parsedNextRise = parseSunTime(nextSunrise)
    const parsedPrevSet = parseSunTime(previousSunset)
    const daylightMs = Math.max(1, setMs - riseMs)
    const defaultNightMs = Math.max(1, 86_400_000 - daylightMs)
    const nightAfterMs = parsedNextRise != null ? parsedNextRise - setMs : null
    const nightBeforeMs = parsedPrevSet != null ? riseMs - parsedPrevSet : null
    const nightSpanAfter = nightAfterMs ?? nightBeforeMs ?? defaultNightMs
    const nightSpanBefore = nightBeforeMs ?? nightAfterMs ?? defaultNightMs
    const nextRiseMs = parsedNextRise ?? setMs + nightSpanAfter
    const prevSetMs = parsedPrevSet ?? riseMs - nightSpanBefore

    const now = Date.now()
    let phase: Phase = "day"
    let dayT = 0.5
    let nightT = 0

    if (isToday) {
      if (now < riseMs) {
        phase = "pre-dawn"
        const span = Math.max(1, riseMs - prevSetMs)
        nightT = Math.min(1, Math.max(0, (now - prevSetMs) / span))
      } else if (now <= setMs) {
        phase = "day"
        dayT = Math.min(1, Math.max(0, (now - riseMs) / Math.max(1, setMs - riseMs)))
      } else {
        phase = "night"
        const span = Math.max(1, nextRiseMs - setMs)
        nightT = Math.min(1, Math.max(0, (now - setMs) / span))
      }
    }

    const phaseLabel =
      phase === "day" ? "Daytime" : phase === "night" ? "Night" : "Before sunrise"

    return {
      valid: true as const,
      phase,
      dayT,
      nightT,
      phaseLabel,
      nowLabel: formatClock(new Date().toISOString(), clockFormat),
    }
  }, [sunrise, sunset, nextSunrise, previousSunset, isToday, clockFormat])

  const r = 32
  const cx = 50
  const cy = 40
  const startX = cx - r
  const endX = cx + r

  const dayArc = `M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`
  const nightArc = `M ${endX} ${cy} A ${r} ${r} 0 0 0 ${startX} ${cy}`

  if (!model.valid) {
    return (
      <div className="flex h-full min-h-[9rem] items-center justify-center text-[12px] text-black/35 dark:text-white/35">
        Sun times unavailable
      </div>
    )
  }

  const { phase, dayT, nightT, phaseLabel, nowLabel } = model
  const isNightSky = phase === "night" || phase === "pre-dawn"

  const dayAngle = Math.PI * (1 - dayT)
  const daySunX = cx + r * Math.cos(dayAngle)
  const daySunY = cy - r * Math.sin(dayAngle)

  const nightAngle = nightT * Math.PI
  const nightSunX = cx + r * Math.cos(nightAngle)
  const nightSunY = cy + r * Math.sin(nightAngle)

  const sunX = phase === "day" ? daySunX : nightSunX
  const sunY = phase === "day" ? daySunY : nightSunY

  const dayArcLen = Math.PI * r
  const dayDash = phase === "day" ? dayArcLen * dayT : 0
  const nightDash = isNightSky ? dayArcLen * nightT : 0

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mb-2 flex items-center justify-center gap-2 text-[11px]">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-medium",
            phase === "day"
              ? "bg-amber-500/15 text-amber-900/80 dark:text-amber-100/90"
              : "bg-indigo-500/15 text-indigo-900/75 dark:text-indigo-100/85",
          )}
        >
          {phaseLabel}
        </span>
        {isToday ? (
          <span className="tabular-nums text-black/40 dark:text-white/40">Now {nowLabel}</span>
        ) : (
          <span className="text-black/35 dark:text-white/35">Sun path for this day</span>
        )}
      </div>

      <svg
        viewBox="0 0 100 72"
        className="h-[11rem] w-full shrink-0"
        role="img"
        aria-label={`Sun path. ${phaseLabel}. Sunrise ${formatClock(sunrise, clockFormat)}, sunset ${formatClock(sunset, clockFormat)}.`}
      >
        <defs>
          <linearGradient id="sunpath-day" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.06" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sunpath-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#312e81" stopOpacity="0.08" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width="100"
          height={cy}
          fill={isNightSky ? "url(#sunpath-night)" : "url(#sunpath-day)"}
        />

        {isNightSky ? (
          STARS.map(([sx, sy], i) => (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r={0.55}
              fill="currentColor"
              opacity={0.2 + (i % 3) * 0.08}
            />
          ))
        ) : null}

        <path
          d={nightArc}
          fill="none"
          stroke="currentColor"
          strokeOpacity={isNightSky ? 0.2 : 0.08}
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        {isNightSky ? (
          <path
            d={nightArc}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeDasharray={dayArcLen}
            strokeDashoffset={dayArcLen - nightDash}
          />
        ) : null}

        <path
          d={dayArc}
          fill="none"
          stroke="currentColor"
          strokeOpacity={phase === "day" ? 0.18 : 0.1}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {phase === "day" ? (
          <path
            d={dayArc}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.55"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={dayArcLen}
            strokeDashoffset={dayArcLen - dayDash}
          />
        ) : null}

        <line
          x1={4}
          y1={cy}
          x2={96}
          y2={cy}
          stroke="currentColor"
          strokeOpacity="0.14"
          strokeWidth="1"
        />

        <circle cx={startX} cy={cy} r="1.5" fill="currentColor" opacity="0.35" />
        <circle cx={endX} cy={cy} r="1.5" fill="currentColor" opacity="0.35" />

        {isToday ? (
          <>
            <circle
              cx={sunX}
              cy={sunY}
              r={phase === "day" ? 4.2 : 3.2}
              fill={phase === "day" ? "currentColor" : "currentColor"}
              opacity={phase === "day" ? 1 : 0.55}
            />
            {phase === "day" ? (
              <circle cx={sunX} cy={sunY} r="7" fill="currentColor" opacity="0.12" />
            ) : null}
          </>
        ) : (
          <circle cx={cx} cy={cy - r} r="3" fill="currentColor" opacity="0.35" />
        )}
      </svg>

      <div className="mt-1 flex shrink-0 justify-between gap-3 text-[11px]">
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-black/35 dark:text-white/35">
            Sunrise
          </p>
          <p className="font-semibold tabular-nums">{formatClock(sunrise, clockFormat)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-black/35 dark:text-white/35">
            Sunset
          </p>
          <p className="font-semibold tabular-nums">{formatClock(sunset, clockFormat)}</p>
        </div>
      </div>
    </div>
  )
}
