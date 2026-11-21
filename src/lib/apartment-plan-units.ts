/** Living + north balcony. Origin NW, +x east, +z south. */

/** Balcony + window/door façade width (unchanged). */
export const SU_W = 100
/** Plan units → meters (~4.2 m façade × ~8.1 m living depth). */
export const SU_TO_M = 0.04225

export function su(n: number): number {
  return n * SU_TO_M
}

export const Z_BALCONY_1 = 0
export const D_BALCONY_1 = 14
export const X_BALCONY_1 = 0
export const W_BALCONY_1 = SU_W

export const Z_LIVING = Z_BALCONY_1 + D_BALCONY_1
/** Living depth (+z); 2× original, north window wall length unchanged. */
export const D_LIVING = 96 * 2

/** Door on the right (east) of the shared north wall */
export const BALCONY_DOOR_WIDTH_SU = 10
export const BALCONY_DOOR_MARGIN_EAST_SU = 8
export const BALCONY_DOOR_OFFSET_SU = SU_W - BALCONY_DOOR_MARGIN_EAST_SU - BALCONY_DOOR_WIDTH_SU

/** Window pair spans the shared wall; door band stays on the east. */
export const BALCONY_WINDOW_WEST_MARGIN_SU = 4
export const BALCONY_WINDOW_GAP_SU = 4
export const BALCONY_WINDOW_INNER_GAP_SU = 4
export const BALCONY_FACADE_WINDOW_PAIR_SU =
  BALCONY_DOOR_OFFSET_SU - BALCONY_WINDOW_GAP_SU - BALCONY_WINDOW_WEST_MARGIN_SU
export const BALCONY_WINDOW_WIDTH_SU =
  (BALCONY_FACADE_WINDOW_PAIR_SU - BALCONY_WINDOW_INNER_GAP_SU) / 2
export const BALCONY_WINDOW_OFFSET_SU = BALCONY_WINDOW_WEST_MARGIN_SU
export const BALCONY_WINDOW_2_OFFSET_SU =
  BALCONY_WINDOW_OFFSET_SU + BALCONY_WINDOW_WIDTH_SU + BALCONY_WINDOW_INNER_GAP_SU