import { useState } from "react"
import type { MarketQuote } from "../lib/markets"
import { marketAccentColor, marketLogoUrl } from "../lib/market-assets"
import { cn } from "../lib/utils"

type Props = {
  quote: Pick<MarketQuote, "symbol" | "type" | "imageUrl">
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZES = {
  sm: "size-8 text-[10px]",
  md: "size-10 text-[11px]",
  lg: "size-12 text-[13px]",
}

export function MarketAssetAvatar({ quote, size = "md", className }: Props) {
  const [failed, setFailed] = useState(false)
  const logo = marketLogoUrl(quote)
  const accent = marketAccentColor(quote)
  const initials = quote.symbol.replace(/-USD$/i, "").slice(0, 3)

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-black/[0.08] bg-black/[0.04] dark:border-white/12 dark:bg-white/[0.06]",
        SIZES[size],
        className,
      )}
      style={{ boxShadow: `0 0 0 1px ${accent}22` }}
    >
      {logo && !failed ? (
        <img
          src={logo}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="flex size-full items-center justify-center font-bold uppercase tracking-tight text-white"
          style={{ background: accent }}
        >
          {initials}
        </span>
      )}
    </div>
  )
}
