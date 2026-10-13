/**
 * Shared Dynamic Island morph timing.
 * Apple-like ease (aggressive ease-out, no bounce) — used for size, radius,
 * content crossfades, and to know when the OS shell is safe to shrink.
 */
export const ISLAND_EASE = [0.32, 0.72, 0, 1] as const

/** Pill width/height/radius morph */
export const islandMorph = {
  type: "tween" as const,
  duration: 0.58,
  ease: ISLAND_EASE,
}

/** Collapsed ↔ expanded content crossfade (slightly shorter, delayed in) */
export const islandContentIn = {
  duration: 0.36,
  ease: ISLAND_EASE,
  delay: 0.14,
}

export const islandContentOut = {
  duration: 0.2,
  ease: ISLAND_EASE,
}

/** ms — keep shell fullscreen until morph can finish */
export const ISLAND_MORPH_MS = Math.round(islandMorph.duration * 1000)
