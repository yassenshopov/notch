import Flags from "country-flag-icons/react/3x2"
import { cn } from "../lib/utils"

type Props = {
  code: string
  className?: string
  title?: string
}

/** ISO 3166-1 alpha-2 country flag (SVG, not emoji). */
export function CountryFlag({ code, className, title }: Props) {
  const Flag = Flags[code.trim().toUpperCase()]
  if (!Flag || typeof Flag !== "function") return null

  return (
    <Flag
      className={cn("inline-block shrink-0 rounded-[2px] shadow-sm ring-1 ring-black/10 dark:ring-white/15", className)}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? "img" : undefined}
    />
  )
}
