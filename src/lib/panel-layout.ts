import { createContext, useContext } from "react"

export type PanelLayout = "compact" | "desktop"

export const PanelLayoutContext = createContext<PanelLayout>("compact")

export function usePanelLayout(): PanelLayout {
  return useContext(PanelLayoutContext)
}
