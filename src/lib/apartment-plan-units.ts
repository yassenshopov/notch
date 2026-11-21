/** Living + north balcony. Origin NW, +x east, +z south. */

export const SU_W = 100
export const SU_TO_M = 0.0845

export function su(n: number): number {
  return n * SU_TO_M
}

export const Z_BALCONY_1 = 0
export const D_BALCONY_1 = 14
export const X_BALCONY_1 = 0
export const W_BALCONY_1 = SU_W

export const Z_LIVING = Z_BALCONY_1 + D_BALCONY_1
export const D_LIVING = 96

/** Door on the right (east) of the shared north wall */
export const BALCONY_DOOR_WIDTH_SU = 10
export const BALCONY_DOOR_MARGIN_EAST_SU = 8
export const BALCONY_DOOR_OFFSET_SU = SU_W - BALCONY_DOOR_MARGIN_EAST_SU - BALCONY_DOOR_WIDTH_SU

/** Window + gap + door span; door width is 1/5 of this band (door size kept as-is). */
export const BALCONY_FACADE_OPENING_SU = BALCONY_DOOR_WIDTH_SU * 5
export const BALCONY_WINDOW_GAP_SU = 4
export const BALCONY_WINDOW_WIDTH_SU =
  BALCONY_FACADE_OPENING_SU - BALCONY_WINDOW_GAP_SU - BALCONY_DOOR_WIDTH_SU
export const BALCONY_WINDOW_OFFSET_SU =
  BALCONY_DOOR_OFFSET_SU - BALCONY_WINDOW_GAP_SU - BALCONY_WINDOW_WIDTH_SU