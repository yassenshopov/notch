import type { ReactNode } from "react"
import { cn } from "../lib/utils"

type Props = {
  children?: ReactNode
  className?: string
}

/** Header action cluster (refresh, disconnect, etc.). */
export function PanelHeaderActions({ children, className }: Props) {
  return <div className={cn("flex items-center gap-1", className)}>{children}</div>
}
