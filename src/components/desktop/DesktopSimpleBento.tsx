import type { ReactNode } from "react"
import { usePanelLayout } from "../../lib/panel-layout"
import { BentoGrid, BentoTile, bentoPad } from "./DesktopBento"

type Props = {
  children: ReactNode
}

export function DesktopSimpleBento({ children }: Props) {
  const desktop = usePanelLayout() === "desktop"
  if (!desktop) return <>{children}</>
  return <>{children}</>
}

/** Multi-tile desktop layout helper (no outer wrapper card). */
export function DesktopBentoOnly({ children }: Props) {
  const desktop = usePanelLayout() === "desktop"
  if (!desktop) return <>{children}</>
  return <BentoGrid>{children}</BentoGrid>
}

export { BentoTile, bentoPad }
