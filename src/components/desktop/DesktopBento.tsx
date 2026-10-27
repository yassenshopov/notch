import type { ReactNode } from "react"
import { cn } from "../../lib/utils"

export type BentoCol = 3 | 4 | 5 | 6 | 7 | 8 | 12

const COL_SPAN: Record<BentoCol, string> = {
  3: "col-span-12 sm:col-span-6 xl:col-span-3",
  4: "col-span-12 sm:col-span-6 xl:col-span-4",
  5: "col-span-12 lg:col-span-5",
  6: "col-span-12 lg:col-span-6",
  7: "col-span-12 lg:col-span-7",
  8: "col-span-12 lg:col-span-8",
  12: "col-span-12",
}

type GridProps = {
  children: ReactNode
  className?: string
}

export function BentoGrid({ children, className }: GridProps) {
  return (
    <div className={cn("grid auto-rows-min grid-cols-12 gap-4", className)}>{children}</div>
  )
}

type TileProps = {
  children?: ReactNode
  col?: BentoCol
  className?: string
  /** Tile chrome (border/bg). Off for nested tiles. */
  surface?: boolean
  scroll?: boolean
}

export function BentoTile({
  children,
  col = 12,
  className,
  surface = true,
  scroll = false,
}: TileProps) {
  return (
    <div
      className={cn(
        COL_SPAN[col],
        "min-h-0 min-w-0",
        surface &&
          "overflow-hidden rounded-2xl border border-black/[0.07] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]",
        scroll && "desktop-scroll max-h-[min(70vh,42rem)] overflow-y-scroll",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function bentoPad(className?: string) {
  return cn("p-4 sm:p-5", className)
}
