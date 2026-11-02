import type { Transition } from "motion/react"
import type { AppSettings } from "../config/settings"

/**
 * Shared Dynamic Island morph timing.
 * Pill morph uses Sileo-style spring physics (motion duration + bounce);
 * tweens remain for reduced motion and CSS-backed transitions.
 */
export const ISLAND_EASE = [0.32, 0.72, 0, 1] as const

export const ISLAND_EASE_CSS = "cubic-bezier(0.32, 0.72, 0, 1)"

/** Sileo packages/sileo/src/constants.ts */
export const SILEO_MORPH_MS = 600
export const SILEO_MORPH_S = SILEO_MORPH_MS / 1000
export const SILEO_SWAP_COLLAPSE_MS = 200

export type MotionFeel = AppSettings["motion"]

export const SILEO_SPRING = {
  type: "spring" as const,
  bounce: 0.25,
  duration: SILEO_MORPH_S,
}

const instant: Transition = { duration: 0 }

export function springFromFeel(
  feel: MotionFeel,
  opts?: { bounce?: number; duration?: number; collapse?: boolean },
): Transition {
  const soft = feel.stiffness <= 280
  const snappy = feel.stiffness >= 420
  const bounce =
    opts?.bounce ??
    (opts?.collapse ? 0 : snappy ? 0.32 : soft ? 0.12 : SILEO_SPRING.bounce)
  const duration =
    opts?.duration ?? (snappy ? 0.52 : soft ? 0.72 : SILEO_MORPH_S)
  return { type: "spring", bounce, duration }
}

export function uiSpringFromFeel(feel: MotionFeel): {
  stiffness: number
  damping: number
  mass: number
} {
  return {
    stiffness: Math.round(feel.stiffness * 0.92),
    damping: Math.round(feel.damping * 0.88),
    mass: feel.mass * 0.9,
  }
}

export function railSpringFromFeel(feel: MotionFeel): {
  stiffness: number
  damping: number
  mass: number
} {
  return {
    stiffness: Math.round(feel.stiffness * 0.75),
    damping: Math.round(feel.damping * 0.85),
    mass: feel.mass * 1.05,
  }
}

export const tapSpring = { type: "spring" as const, stiffness: 520, damping: 28, mass: 0.55 }

export function resolveTransition(
  transition: Transition,
  reducedMotion: boolean,
): Transition {
  if (!reducedMotion) return transition
  if ("duration" in transition && typeof transition.duration === "number") {
    return { ...transition, duration: 0 }
  }
  return instant
}

export function islandMorphTransition(
  feel: MotionFeel,
  reducedMotion: boolean,
  phase: "expand" | "collapse" | "neutral" = "neutral",
): Transition {
  if (reducedMotion) return instant
  if (phase === "collapse") {
    return springFromFeel(feel, { collapse: true, bounce: 0 })
  }
  if (phase === "expand") {
    return springFromFeel(feel)
  }
  return springFromFeel(feel, { bounce: feel.stiffness >= 420 ? 0.18 : 0.14 })
}

/** Pill width/height/radius morph (Sileo spring) */
export function islandMorphFor(
  feel: MotionFeel,
  reducedMotion: boolean,
): Transition {
  return islandMorphTransition(feel, reducedMotion, "neutral")
}

/** @deprecated alias — prefer islandMorphFor(settings.motion, reduced) */
export const islandMorph = {
  type: "spring" as const,
  bounce: SILEO_SPRING.bounce,
  duration: SILEO_MORPH_S,
}

/** Collapsed ↔ expanded content crossfade */
export const islandContentIn = {
  ...SILEO_SPRING,
  delay: 0.12,
}

export const islandContentOut = {
  ...SILEO_SPRING,
  bounce: 0,
}

/** Compact face / metadata swaps (Sileo header timing) */
export const islandFaceSwap = {
  type: "spring" as const,
  bounce: 0.2,
  duration: 0.28,
}

/** Panels, rails, settings rows */
export const notchUi = {
  type: "spring" as const,
  bounce: 0.18,
  duration: 0.36,
}

/** Small metadata / icon swaps */
export const notchUiFast = {
  type: "spring" as const,
  bounce: 0.15,
  duration: 0.26,
}

/** Full-scale / notch panel page changes */
export const panelPageEnter = {
  type: "spring" as const,
  bounce: 0.22,
  duration: 0.34,
}

export const panelPageExit = {
  type: "spring" as const,
  bounce: 0,
  duration: 0.22,
}

/** Placement / corner form morph */
export const notchPlacementMorph = {
  type: "spring" as const,
  bounce: 0.12,
  duration: 0.48,
}

export const notchSpring = springFromFeel({
  type: "spring",
  stiffness: 420,
  damping: 36,
  mass: 0.82,
})

/** ms — keep shell fullscreen until morph can finish */
export const ISLAND_MORPH_MS = SILEO_MORPH_MS

/** OS window snap after drag (matches main process) */
export const PLACEMENT_SNAP_MS = 420
