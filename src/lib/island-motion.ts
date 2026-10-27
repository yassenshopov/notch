/**
 * Shared Dynamic Island morph timing.
 * Apple-like ease (aggressive ease-out, no bounce) — used for size, radius,
 * content crossfades, placement, and panel motion.
 */
export const ISLAND_EASE = [0.32, 0.72, 0, 1] as const

export const ISLAND_EASE_CSS = "cubic-bezier(0.32, 0.72, 0, 1)"

/** Pill width/height/radius morph */
export const islandMorph = {
  type: "tween" as const,
  duration: 0.62,
  ease: ISLAND_EASE,
}

/** Collapsed ↔ expanded content crossfade */
export const islandContentIn = {
  duration: 0.38,
  ease: ISLAND_EASE,
  delay: 0.12,
}

export const islandContentOut = {
  duration: 0.24,
  ease: ISLAND_EASE,
}

/** Panels, rails, settings rows */
export const notchUi = {
  duration: 0.36,
  ease: ISLAND_EASE,
}

/** Small metadata / icon swaps */
export const notchUiFast = {
  duration: 0.26,
  ease: ISLAND_EASE,
}

/** Full-scale / notch panel page changes */
export const panelPageEnter = {
  duration: 0.34,
  ease: ISLAND_EASE,
}

export const panelPageExit = {
  duration: 0.22,
  ease: ISLAND_EASE,
}

/** Placement / corner form morph */
export const notchPlacementMorph = {
  duration: 0.48,
  ease: ISLAND_EASE,
}

export const notchSpring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 36,
  mass: 0.82,
}

/** ms — keep shell fullscreen until morph can finish */
export const ISLAND_MORPH_MS = Math.round(islandMorph.duration * 1000)

/** OS window snap after drag (matches main process) */
export const PLACEMENT_SNAP_MS = 420
