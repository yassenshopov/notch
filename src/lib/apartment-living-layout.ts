import { BALCONY_DOOR_METERS, propM, type PlanRect } from "./apartment-floor-plan"

export const LIVING_TV_STAND_ALONG_WALL_M = propM(2.64)

export function livingSofaLayout(rect: PlanRect) {
  const wallGap = propM(0.05)
  const backT = propM(0.24)
  const seatD = propM(1.05)
  const seatW = propM(1.02)
  const cx = rect.x + wallGap + backT
  const cz = rect.z + wallGap + backT
  const doorWestX = rect.x + BALCONY_DOOR_METERS.offset
  const alongNorthW = Math.max(propM(1.5), doorWestX - cx - propM(0.36))
  const alongWestDFull = Math.max(propM(2.4), rect.d * 0.52)
  const westSeatD = (alongWestDFull - seatD) / 2
  const alongWestD = seatD + westSeatD
  return { cx, cz, seatW, seatD, alongWestD, westSeatD, alongNorthW }
}

/** East-wall TV/stand center z: south edge lines up with west-wall sofa end; bulk toward balcony door (north). */
export function livingEastWallTvCenterZ(rect: PlanRect): number {
  const { cz, alongWestD } = livingSofaLayout(rect)
  const sofaSouthZ = cz + alongWestD
  return sofaSouthZ - LIVING_TV_STAND_ALONG_WALL_M / 2
}