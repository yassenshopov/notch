import { motion, useSpring } from "motion/react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { useSettings } from "../config/settings-store"
import { cn } from "../lib/utils"

export type SegmentedOption<T extends string> = { value: T; label: ReactNode }

type Variant = "filled" | "bordered" | "pi" | "bare" | "chart"

type PillRect = { x: number; y: number; width: number; height: number }

type Props<T extends string> = {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  variant?: Variant
  equalWidth?: boolean
  capitalize?: boolean
  className?: string
  indicatorStyle?: CSSProperties
  getIndicatorStyle?: (value: T) => CSSProperties | undefined
  role?: string
  "aria-label"?: string
}

const tapSpring = { type: "spring" as const, stiffness: 520, damping: 28, mass: 0.55 }

const variantStyles: Record<
  Variant,
  {
    track: string
    button: string
    indicator: string
    selectedText: string
    idleText: string
  }
> = {
  filled: {
    track: "relative flex rounded-full bg-black/5 p-0.5 dark:bg-white/10",
    button: "relative z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold",
    indicator: "rounded-full bg-[#111] dark:bg-white",
    selectedText: "text-white dark:text-[#111]",
    idleText: "text-black/45 dark:text-white/45",
  },
  bordered: {
    track: "relative flex rounded-full border border-black/10 p-0.5 dark:border-white/15",
    button: "relative z-10 rounded-full px-3 py-1 text-[12px] font-semibold",
    indicator: "rounded-full bg-black dark:bg-white",
    selectedText: "text-white dark:text-black",
    idleText: "text-black/50 dark:text-white/50",
  },
  pi: {
    track: "relative flex shrink-0 gap-1 rounded-full bg-black/6 p-1 dark:bg-white/10",
    button: "relative z-10 flex-1 rounded-full px-3 py-1.5 text-[12px] font-semibold",
    indicator: "rounded-full bg-white shadow-sm dark:bg-[#222]",
    selectedText: "text-[#111] dark:text-white",
    idleText:
      "text-black/50 hover:text-black/70 dark:text-white/50 dark:hover:text-white/75",
  },
  bare: {
    track: "relative flex gap-1",
    button: "relative z-10 flex-1 rounded-full px-2 py-1 text-[11px] font-semibold",
    indicator: "rounded-full",
    selectedText: "text-white",
    idleText:
      "text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10",
  },
  chart: {
    track: "relative flex rounded-lg border border-black/10 p-0.5 dark:border-white/15",
    button: "relative z-10 rounded-md px-2 py-0.5 text-[10px] font-medium capitalize",
    indicator: "rounded-md bg-black/8 dark:bg-white/12",
    selectedText: "text-black/80 dark:text-white/90",
    idleText: "text-black/45 dark:text-white/45",
  },
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  variant = "filled",
  equalWidth,
  capitalize,
  className,
  indicatorStyle,
  getIndicatorStyle,
  role,
  "aria-label": ariaLabel,
}: Props<T>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<T, HTMLButtonElement>())
  const [pill, setPill] = useState<PillRect | null>(null)
  const { motion: feel } = useSettings()
  const spring = {
    stiffness: Math.round(feel.stiffness * 0.92),
    damping: Math.round(feel.damping * 0.88),
    mass: feel.mass * 0.9,
  }

  const x = useSpring(0, spring)
  const width = useSpring(0, spring)

  const styles = variantStyles[variant]

  const measurePill = useCallback(() => {
    const track = trackRef.current
    const btn = itemRefs.current.get(value)
    if (!track || !btn) return
    const tr = track.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    setPill({
      x: br.left - tr.left,
      y: br.top - tr.top,
      width: br.width,
      height: br.height,
    })
  }, [value])

  useLayoutEffect(() => {
    measurePill()
  }, [measurePill, options.length, equalWidth, variant, className])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => measurePill())
    ro.observe(track)
    return () => ro.disconnect()
  }, [measurePill])

  useEffect(() => {
    if (!pill) return
    x.set(pill.x)
    width.set(pill.width)
  }, [pill, x, width])

  const activeIndicatorStyle: CSSProperties = {
    ...indicatorStyle,
    ...getIndicatorStyle?.(value),
  }

  return (
    <div
      ref={trackRef}
      className={cn(styles.track, equalWidth && "w-full", className)}
      role={role}
      aria-label={ariaLabel}
      data-segmented-control=""
    >
      {pill ? (
        <motion.span
          className={cn("pointer-events-none absolute left-0 top-0 z-0", styles.indicator)}
          style={{
            ...activeIndicatorStyle,
            x,
            width,
            top: pill.y,
            height: pill.height,
          }}
          aria-hidden
        />
      ) : null}
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <motion.button
            key={opt.value}
            ref={(el) => {
              if (el) itemRefs.current.set(opt.value, el)
              else itemRefs.current.delete(opt.value)
            }}
            type="button"
            role={role === "tablist" ? "tab" : undefined}
            aria-selected={role === "tablist" ? selected : undefined}
            onClick={() => onChange(opt.value)}
            whileTap={{ scale: 0.96 }}
            transition={tapSpring}
            className={cn(
              styles.button,
              equalWidth && "flex-1",
              capitalize && "capitalize",
              selected ? styles.selectedText : styles.idleText,
            )}
          >
            {opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}
