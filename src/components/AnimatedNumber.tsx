import { animate, useMotionValue, useMotionValueEvent } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { cn } from "../lib/utils"

type Props = {
  value: number | null | undefined
  className?: string
  /** Shown when value is null/undefined. */
  empty?: string
  prefix?: string
  suffix?: string
  format?: (n: number) => string
  /** Duration of the first count-up (ms feel via seconds). */
  duration?: number
}

export function AnimatedNumber({
  value,
  className,
  empty = "—",
  prefix = "",
  suffix = "",
  format,
  duration = 0.85,
}: Props) {
  const motionValue = useMotionValue(0)
  const [display, setDisplay] = useState(0)
  const hasMounted = useRef(false)

  useMotionValueEvent(motionValue, "change", (v) => {
    setDisplay(Math.round(v))
  })

  useEffect(() => {
    if (value == null || Number.isNaN(value)) return

    const from = hasMounted.current ? motionValue.get() : 0
    const dur = hasMounted.current ? Math.min(duration, 0.45) : duration
    hasMounted.current = true

    const controls = animate(motionValue, value, {
      duration: dur,
      ease: [0.22, 1, 0.36, 1],
      from,
    })
    return () => controls.stop()
  }, [value, duration, motionValue])

  if (value == null || Number.isNaN(value)) {
    return <span className={cn("tabular-nums", className)}>{empty}</span>
  }

  const body = format ? format(display) : String(display)
  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {body}
      {suffix}
    </span>
  )
}