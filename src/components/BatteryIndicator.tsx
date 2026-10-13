import { cn } from "../lib/utils"

type Props = {
  level: number
  charging: boolean
  /** Show percent next to the glyph */
  showLabel?: boolean
  className?: string
}

/** Compact battery glyph — fill tracks level; charging runs a rising shimmer + bolt. */
export function BatteryIndicator({
  level,
  charging,
  showLabel = true,
  className,
}: Props) {
  const pct = Math.round(clamp01(level) * 100)
  const low = !charging && pct <= 20
  const critical = !charging && pct <= 10
  const fill = clamp01(level)

  return (
    <span
      className={cn(
        "battery inline-flex items-center gap-1.5",
        charging && "battery--charging",
        low && "battery--low",
        critical && "battery--critical",
        className,
      )}
      aria-label={charging ? `Battery charging, ${pct}%` : `Battery ${pct}%`}
      title={charging ? `Charging · ${pct}%` : `${pct}%`}
    >
      <svg
        viewBox="0 0 28 14"
        className="battery__glyph h-[11px] w-[22px] shrink-0"
        aria-hidden
      >
        <defs>
          <clipPath id="battery-fill-clip">
            <rect x="3" y="3.5" width="18" height="7" rx="1.4" />
          </clipPath>
          <linearGradient id="battery-shine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="45%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* body */}
        <rect
          x="1"
          y="1.5"
          width="22"
          height="11"
          rx="2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.55"
        />
        {/* positive terminal */}
        <path
          d="M24.5 5v4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.45"
        />
        {/* level fill */}
        <rect
          className="battery__fill"
          x="3"
          y="3.5"
          width={Math.max(1.2, 18 * fill)}
          height="7"
          rx="1.4"
          fill="currentColor"
        />
        {charging ? (
          <g clipPath="url(#battery-fill-clip)">
            <rect
              className="battery__shimmer"
              x="3"
              y="3.5"
              width="18"
              height="7"
              fill="url(#battery-shine)"
            />
          </g>
        ) : null}
        {charging ? (
          <path
            className="battery__bolt"
            d="M13.2 3.2 L10.8 7.4 H13.1 L12.4 10.8 L15.2 6.4 H12.9 Z"
            fill="var(--battery-bolt, #111)"
          />
        ) : null}
      </svg>
      {showLabel ? (
        <span className="text-[11px] font-semibold tracking-tight tabular-nums leading-none">
          {pct}%
        </span>
      ) : null}
    </span>
  )
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 1
  return Math.min(1, Math.max(0, n))
}
