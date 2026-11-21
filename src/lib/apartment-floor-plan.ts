/**
 * Living + north balcony — door (glazed) + fixed window on shared wall.
 */

import {
  BALCONY_DOOR_OFFSET_SU,
  BALCONY_DOOR_WIDTH_SU,
  BALCONY_WINDOW_2_OFFSET_SU,
  BALCONY_WINDOW_OFFSET_SU,
  BALCONY_WINDOW_WIDTH_SU,
  D_BALCONY_1,
  D_LIVING,
  SU_W,
  W_BALCONY_1,
  X_BALCONY_1,
  Z_BALCONY_1,
  Z_LIVING,
  su,
} from "./apartment-plan-units"

export const APARTMENT_PLAN_REVISION = "living-balcony-v34"

/** Interior furniture / fixture scale (matches halved plan footprint). */
export const APARTMENT_PROP_SCALE = 0.5
export function propM(n: number): number {
  return n * APARTMENT_PROP_SCALE
}

/** TV screen span along the east wall (m). */
export const LIVING_TV_SCREEN_ALONG_WALL_M = propM(2.36)

export {
  BALCONY_DOOR_MARGIN_EAST_SU,
  BALCONY_FACADE_WINDOW_PAIR_SU,
  BALCONY_WINDOW_WEST_MARGIN_SU,
  D_LIVING,
  SU_TO_M,
  SU_W,
  Z_LIVING,
  su,
} from "./apartment-plan-units"

export const APARTMENT_CEILING_M = propM(5.2)
export const WALL_THICKNESS_M = propM(0.14)

/** Materials */
export const COLOR_BALCONY_FLOOR = 0xff7518
export const COLOR_BALCONY_CSS = "#ff7518"
export const COLOR_BALCONY_RAIL = 0xb8bcc4
export const COLOR_BALCONY_RAIL_CSS = "#b8bcc4"
export const COLOR_LIVING_FLOOR = 0xd9c7a3
export const COLOR_LIVING_FLOOR_CSS = "#d9c7a3"
export const COLOR_LIVING_WALL = 0xf7f5f0
export const COLOR_GLASS = 0xf4f6f8
export const COLOR_GLAZING_PANEL = 0xffffff
/** Thick white surround on door + fixed window */
export const GLAZING_PANEL_FRAME_M = propM(0.12)
export const GLAZING_PANEL_DEPTH_M = propM(0.095)

export type RoomKind = "living" | "outdoor"

export type PlanRect = { x: number; z: number; w: number; d: number }

export type DoorSpec = {
  wall: "north" | "south" | "east" | "west"
  offset: number
  width: number
}

export type FurnitureSpec = {
  id: string
  label: string
  x: number
  z: number
  w: number
  d: number
  h: number
  kind: string
}

export type DeviceSpec = {
  id: string
  label: string
  roomId: string
  role: string
}

export type SpaceSpec = {
  id: string
  pickId: string
  label: string
  rect: PlanRect
  kind: RoomKind
  doors?: DoorSpec[]
  floor: number
  railEdges?: ("north" | "south" | "east" | "west")[]
}

function rectSu(x: number, z: number, w: number, d: number): PlanRect {
  return { x: su(x), z: su(z), w: su(w), d: su(d) }
}

const doorOffM = su(BALCONY_DOOR_OFFSET_SU)
const doorWM = su(BALCONY_DOOR_WIDTH_SU)

export const APARTMENT_SPACES: SpaceSpec[] = [
  {
    id: "balcony-1",
    pickId: "balcony-1",
    label: "Balcony",
    kind: "outdoor",
    floor: COLOR_BALCONY_FLOOR,
    rect: rectSu(X_BALCONY_1, Z_BALCONY_1, W_BALCONY_1, D_BALCONY_1),
    railEdges: ["north", "west", "east"],
    doors: [{ wall: "south", offset: doorOffM, width: doorWM }],
  },
  {
    id: "living",
    pickId: "living",
    label: "Living room + kitchen",
    kind: "living",
    floor: COLOR_LIVING_FLOOR,
    rect: rectSu(0, Z_LIVING, SU_W, D_LIVING),
    doors: [{ wall: "north", offset: doorOffM, width: doorWM }],
  },
]

export const BALCONY_DOOR_METERS = {
  offset: doorOffM,
  width: doorWM,
  height: propM(2.15),
  frame: GLAZING_PANEL_FRAME_M,
}

export type BalconyWindowMeters = {
  offset: number
  width: number
  height: number
  sill: number
  frame: number
}

const BALCONY_WINDOW_SHARED: Omit<BalconyWindowMeters, "offset" | "width"> = {
  height: propM(1.35),
  sill: propM(0.95),
  frame: GLAZING_PANEL_FRAME_M,
}

export const BALCONY_FACADE_WINDOWS: BalconyWindowMeters[] = [
  {
    offset: su(BALCONY_WINDOW_OFFSET_SU),
    width: su(BALCONY_WINDOW_WIDTH_SU),
    ...BALCONY_WINDOW_SHARED,
  },
  {
    offset: su(BALCONY_WINDOW_2_OFFSET_SU),
    width: su(BALCONY_WINDOW_WIDTH_SU),
    ...BALCONY_WINDOW_SHARED,
  },
]

/** First (west) balcony window — plan sketch + legacy imports */
export const BALCONY_WINDOW_METERS = BALCONY_FACADE_WINDOWS[0]!

export const APARTMENT_ROOM_CARDS: {
  pickId: string
  label: string
  kind: RoomKind
}[] = [
  { pickId: "balcony-1", label: "Balcony", kind: "outdoor" },
  { pickId: "living", label: "Living room + kitchen", kind: "living" },
]

export const APARTMENT_FURNITURE: FurnitureSpec[] = []
export const APARTMENT_DEVICES: DeviceSpec[] = [
  {
    id: "sofa-lamp",
    label: "Floor lamp",
    roomId: "living",
    role: "light",
  },
]

export function roomFootprintM2(pickId: string): number {
  return APARTMENT_SPACES.filter((s) => s.pickId === pickId).reduce(
    (sum, s) => sum + s.rect.w * s.rect.d,
    0,
  )
}

export function roomCentroid(_pickId: string): { x: number; z: number } | null {
  return null
}

export function deviceWorldPosition(_id: string): { x: number; z: number } {
  return { x: 0, z: 0 }
}

export type RoomCard = (typeof APARTMENT_ROOM_CARDS)[number]

export function roomCardById(pickId: string): RoomCard | undefined {
  return APARTMENT_ROOM_CARDS.find((r) => r.pickId === pickId)
}

export function footprintBounds() {
  let maxX = 0
  let maxZ = 0
  for (const s of APARTMENT_SPACES) {
    maxX = Math.max(maxX, s.rect.x + s.rect.w)
    maxZ = Math.max(maxZ, s.rect.z + s.rect.d)
  }
  return { minX: 0, minZ: 0, maxX, maxZ, cx: maxX / 2, cz: maxZ / 2 }
}

export const APARTMENT_ROOMS = APARTMENT_SPACES
export type RoomSpec = SpaceSpec