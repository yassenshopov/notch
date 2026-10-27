import type { ReactNode } from "react"
import { usePanelLayout } from "../../lib/panel-layout"
import { cn } from "../../lib/utils"

type Props = {
  children: ReactNode
  className?: string
}

/** Compact notch panel title block — hidden in full desktop window (sidebar shows context). */
export function PanelPageHeader({ children, className }: Props) {
  const desktop = usePanelLayout() === "desktop"
  if (desktop) return null
  return <header className={cn(className)}>{children}</header>
}
