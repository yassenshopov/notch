import { cn } from "../lib/utils"

type Props = {
  active?: boolean
  className?: string
}

export function EqualizerBars({ active = true, className }: Props) {
  return (
    <div className={cn("eq-bars", !active && "eq-bars--paused", className)} aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}
