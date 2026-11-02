import { useMemo } from "react"
import { useSettings } from "../config/settings-store"
import {
  islandContentIn,
  islandContentOut,
  islandFaceSwap,
  islandMorphFor,
  islandMorphTransition,
  notchUi,
  notchUiFast,
  panelPageEnter,
  panelPageExit,
  resolveTransition,
  springFromFeel,
} from "../lib/island-motion"
import { useReducedMotion } from "./useReducedMotion"

export function useIslandMotion() {
  const { motion: feel } = useSettings()
  const reducedMotion = useReducedMotion()

  return useMemo(
    () => ({
      reducedMotion,
      feel,
      pill: islandMorphFor(feel, reducedMotion),
      expandShell: islandMorphTransition(feel, reducedMotion, "expand"),
      collapseShell: islandMorphTransition(feel, reducedMotion, "collapse"),
      contentIn: resolveTransition(islandContentIn, reducedMotion),
      contentOut: resolveTransition(islandContentOut, reducedMotion),
      faceSwap: resolveTransition(islandFaceSwap, reducedMotion),
      ui: resolveTransition(notchUi, reducedMotion),
      uiFast: resolveTransition(notchUiFast, reducedMotion),
      panelEnter: resolveTransition(panelPageEnter, reducedMotion),
      panelExit: resolveTransition(panelPageExit, reducedMotion),
      spring: (opts?: { collapse?: boolean }) =>
        reducedMotion
          ? { duration: 0 }
          : springFromFeel(feel, { collapse: opts?.collapse }),
    }),
    [feel, reducedMotion],
  )
}
