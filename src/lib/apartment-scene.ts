import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"
import { loadBalconyBicycle } from "./apartment-bicycle-model"
import { buildEastDoorTvVignette } from "./apartment-east-vignette"
import {
  livingEastWallTvCenterZ,
  livingSofaLayout,
  LIVING_TV_STAND_ALONG_WALL_M,
} from "./apartment-living-layout"
import {
  createLivingTvClockMaterial,
  tickLivingTvClock,
  type LivingTvClockRig,
} from "./apartment-tv-clock"
import {
  APARTMENT_CEILING_M,
  APARTMENT_DEVICES,
  APARTMENT_FURNITURE,
  APARTMENT_SPACES,
  BALCONY_DOOR_METERS,
  BALCONY_DOOR_MARGIN_EAST_SU,
  BALCONY_FACADE_WINDOWS,
  BALCONY_FACADE_WINDOW_PAIR_SU,
  BALCONY_WINDOW_WEST_MARGIN_SU,
  su,
  COLOR_BALCONY_FLOOR,
  COLOR_BALCONY_RAIL,
  COLOR_GLASS,
  COLOR_GLAZING_PANEL,
  COLOR_LIVING_WALL,
  GLAZING_PANEL_DEPTH_M,
  LIVING_TV_SCREEN_ALONG_WALL_M,
  propM,
  WALL_THICKNESS_M,
  deviceWorldPosition,
  footprintBounds,
  roomCardById,
  type DeviceSpec,
  type DoorSpec,
  type PlanRect,
  type SpaceSpec,
} from "./apartment-floor-plan"

export type ApartmentViewMode = "orbit" | "plan"

export type ApartmentPick =
  | { kind: "room"; roomId: string }
  | { kind: "device"; deviceId: string }

export const SOFA_LAMP_DEVICE_ID = "sofa-lamp"

export type ApartmentSceneHandle = {
  dispose: () => void
  setDark: (dark: boolean) => void
  setView: (mode: ApartmentViewMode) => void
  setPan: (enabled: boolean) => void
  setDevicePulse: (id: string, active: boolean) => void
  highlight: (pick: ApartmentPick | null) => void
  toggleBalconyDoor: () => void
  balconyDoorOpen: () => boolean
  toggleSofaLamp: () => void
  sofaLampOn: () => boolean
  resize: () => void
}

type CreateOpts = {
  dark?: boolean
  defaultView?: ApartmentViewMode
  onPick?: (pick: ApartmentPick | null) => void
  onBalconyDoorChange?: (open: boolean) => void
  onSofaLampChange?: (on: boolean) => void
}

const DOOR_PICK = "apartmentBalconyDoor"
const LAMP_PICK = "apartmentSofaLamp"

type BalconyDoorRig = {
  pivot: THREE.Group
  openTarget: number
  openCurrent: number
}

type SofaLampRig = {
  rigGroup: THREE.Group
  light: THREE.PointLight
  shadeMat: THREE.MeshStandardMaterial
  bulbMat: THREE.MeshStandardMaterial
  on: boolean
  onVisual: number
}

type ScenePalette = {
  background: number
  ambientIntensity: number
  exposure: number
  wall: number
  wallEmissive: number
  furniture: number
  furnitureEmissive: number
  pin: number
  pinActive: number
  railing: number
}

const PALETTE: Record<"light" | "dark", ScenePalette> = {
  light: {
    background: 0xb8d4f0,
    ambientIntensity: 0.88,
    exposure: 1.08,
    wall: COLOR_LIVING_WALL,
    wallEmissive: 0x000000,
    furniture: 0x9c958c,
    furnitureEmissive: 0x000000,
    pin: 0x3b82f6,
    pinActive: 0x22c55e,
    railing: 0x8a9a8e,
  },
  dark: {
    background: 0x1e3a5f,
    ambientIntensity: 0.92,
    exposure: 1.38,
    wall: 0xe8e6e1,
    wallEmissive: 0x0a0a0a,
    furniture: 0x71717a,
    furnitureEmissive: 0x050505,
    pin: 0x60a5fa,
    pinActive: 0x4ade80,
    railing: 0x6b7280,
  },
}

const PICK_USER_DATA = "apartmentPick"
const EDGE_EPS = 0.001
const FLOOR_THICKNESS_M = propM(0.08)
const WALL_SEAM_EPS = 0.001
const BALCONY_PARAPET_THICK_M = propM(0.26)
const BALCONY_PARAPET_H_M = propM(0.58)
const BALCONY_RAIL_HEIGHT_M = propM(0.95)
const BALCONY_RAIL_TUBE_R_M = propM(0.028)

function wallLength(rect: PlanRect, wall: DoorSpec["wall"]) {
  return wall === "north" || wall === "south" ? rect.w : rect.d
}

function addWallSegments(
  group: THREE.Group,
  rect: PlanRect,
  wall: DoorSpec["wall"],
  doors: DoorSpec[],
  height: number,
  mat: THREE.Material,
  yBase: number,
) {
  const t = WALL_THICKNESS_M
  const wallDoors = doors.filter((d) => d.wall === wall)
  const len = wallLength(rect, wall)
  const segments: { start: number; end: number }[] = []
  let cursor = 0
  const sorted = [...wallDoors].sort((a, b) => a.offset - b.offset)
  for (const door of sorted) {
    const ds = Math.max(0, door.offset)
    const de = Math.min(len, door.offset + door.width)
    if (ds > cursor + 0.02) segments.push({ start: cursor, end: ds })
    cursor = Math.max(cursor, de)
  }
  if (cursor < len - 0.02) segments.push({ start: cursor, end: len })

  for (const seg of segments) {
    const segLen = seg.end - seg.start
    if (segLen < 0.05) continue
    const geo = new THREE.BoxGeometry(
      wall === "east" || wall === "west" ? t : segLen,
      height,
      wall === "north" || wall === "south" ? t : segLen,
    )
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = false
    mesh.receiveShadow = true

    const mid = seg.start + segLen / 2
    const y = yBase + height / 2
    switch (wall) {
      case "north":
        mesh.position.set(rect.x + mid, y, rect.z - t / 2)
        break
      case "south":
        mesh.position.set(rect.x + mid, y, rect.z + rect.d + t / 2)
        break
      case "west":
        mesh.position.set(rect.x - t / 2, y, rect.z + mid)
        break
      case "east":
        mesh.position.set(rect.x + rect.w + t / 2, y, rect.z + mid)
        break
    }
    group.add(mesh)
  }
}

function addWallBox(
  root: THREE.Group,
  cx: number,
  cz: number,
  w: number,
  d: number,
  h: number,
  yBottom: number,
  mat: THREE.Material,
) {
  if (w < 0.02 || h < 0.02) return
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  mesh.position.set(cx, yBottom + h / 2, cz)
  mesh.castShadow = false
  mesh.receiveShadow = true
  root.add(mesh)
}

/** North wall with sill/lintel above each window and above door (not full-height holes). */
function buildLivingNorthWall(
  root: THREE.Group,
  rect: PlanRect,
  wallH: number,
  yBase: number,
  mat: THREE.Material,
) {
  const t = WALL_THICKNESS_M
  const z = rect.z - t / 2
  const door = BALCONY_DOOR_METERS
  const windows = [...BALCONY_FACADE_WINDOWS].sort((a, b) => a.offset - b.offset)

  const dx0 = rect.x + door.offset
  const dx1 = dx0 + door.width
  const xEnd = rect.x + rect.w

  let xCursor = rect.x
  for (const win of windows) {
    const wx0 = rect.x + win.offset
    const wx1 = wx0 + win.width
    if (wx0 > xCursor + WALL_SEAM_EPS) {
      addWallBox(root, xCursor + (wx0 - xCursor) / 2, z, wx0 - xCursor, t, wallH, yBase, mat)
    }
    addWallBox(root, wx0 + win.width / 2, z, win.width, t, win.sill, yBase, mat)
    addWallBox(
      root,
      wx0 + win.width / 2,
      z,
      win.width,
      t,
      Math.max(0, wallH - win.sill - win.height),
      yBase + win.sill + win.height,
      mat,
    )
    xCursor = wx1
  }
  if (dx0 > xCursor + WALL_SEAM_EPS) {
    addWallBox(root, xCursor + (dx0 - xCursor) / 2, z, dx0 - xCursor, t, wallH, yBase, mat)
  }
  addWallBox(
    root,
    dx0 + door.width / 2,
    z,
    door.width,
    t,
    Math.max(0, wallH - door.height),
    yBase + door.height,
    mat,
  )
  if (xEnd > dx1 + WALL_SEAM_EPS) {
    addWallBox(root, dx1 + (xEnd - dx1) / 2, z, xEnd - dx1, t, wallH, yBase, mat)
  }
}

function sealWallCorners(
  root: THREE.Group,
  rect: PlanRect,
  wallH: number,
  yBase: number,
  mat: THREE.Material,
  sides: readonly DoorSpec["wall"][],
) {
  const t = WALL_THICKNESS_M
  const yMid = yBase + wallH / 2
  const set = new Set(sides)
  const push = (cx: number, cz: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(t, wallH, t), mat)
    mesh.position.set(cx, yMid, cz)
    mesh.castShadow = false
    mesh.receiveShadow = true
    root.add(mesh)
  }
  if (set.has("north") && set.has("west")) push(rect.x - t / 2, rect.z - t / 2)
  if (set.has("north") && set.has("east")) push(rect.x + rect.w + t / 2, rect.z - t / 2)
  if (set.has("south") && set.has("west")) push(rect.x - t / 2, rect.z + rect.d + t / 2)
  if (set.has("south") && set.has("east")) push(rect.x + rect.w + t / 2, rect.z + rect.d + t / 2)
}

function spanOverlap(a0: number, a1: number, b0: number, b1: number) {
  return a1 > b0 + EDGE_EPS && b1 > a0 + EDGE_EPS
}

function drawsWall(
  space: SpaceSpec,
  wall: DoorSpec["wall"],
  spaces: SpaceSpec[],
): boolean {
  const r = space.rect
  for (const other of spaces) {
    if (other.id === space.id) continue
    const o = other.rect
  const shares =
      (wall === "north" &&
        Math.abs(o.z + o.d - r.z) < EDGE_EPS &&
        spanOverlap(r.x, r.x + r.w, o.x, o.x + o.w)) ||
      (wall === "south" &&
        Math.abs(o.z - (r.z + r.d)) < EDGE_EPS &&
        spanOverlap(r.x, r.x + r.w, o.x, o.x + o.w)) ||
      (wall === "west" &&
        Math.abs(o.x + o.w - r.x) < EDGE_EPS &&
        spanOverlap(r.z, r.z + r.d, o.z, o.z + o.d)) ||
      (wall === "east" &&
        Math.abs(o.x - (r.x + r.w)) < EDGE_EPS &&
        spanOverlap(r.z, r.z + r.d, o.z, o.z + o.d))
    if (!shares) continue
    const outdoorTouch = space.kind === "outdoor" || other.kind === "outdoor"
    if (outdoorTouch) return true
    return false
  }
  return true
}

function addMetalTube(
  root: THREE.Group,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  mat: THREE.Material,
) {
  const dir = new THREE.Vector3().subVectors(b, a)
  const len = dir.length()
  if (len < 1e-4) return
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 14), mat)
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
  mesh.position.copy(mid)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  root.add(mesh)
}

function buildBalconyParapetAndRail(
  root: THREE.Group,
  rect: PlanRect,
  edges: ("north" | "south" | "east" | "west")[],
) {
  const t = BALCONY_PARAPET_THICK_M
  const h = BALCONY_PARAPET_H_M
  const yParapet = FLOOR_THICKNESS_M + h / 2
  const parapetMat = new THREE.MeshStandardMaterial({
    color: COLOR_BALCONY_FLOOR,
    roughness: 0.86,
    metalness: 0.05,
  })
  const railMat = new THREE.MeshStandardMaterial({
    color: COLOR_BALCONY_RAIL,
    metalness: 0.78,
    roughness: 0.22,
  })
  const tubeR = BALCONY_RAIL_TUBE_R_M
  const yRail = FLOOR_THICKNESS_M + BALCONY_RAIL_HEIGHT_M
  const yPostFoot = FLOOR_THICKNESS_M + h
  const inset = t / 2

  const addParapet = (w: number, d: number, cx: number, cz: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), parapetMat)
    mesh.position.set(cx, yParapet, cz)
    mesh.receiveShadow = true
    root.add(mesh)
  }

  if (edges.includes("north")) {
    addParapet(rect.w, t, rect.x + rect.w / 2, rect.z + inset)
  }
  if (edges.includes("west")) {
    addParapet(t, rect.d, rect.x + inset, rect.z + rect.d / 2)
  }
  if (edges.includes("east")) {
    addParapet(t, rect.d, rect.x + rect.w - inset, rect.z + rect.d / 2)
  }

  const post = (x: number, z: number) => {
    addMetalTube(
      root,
      new THREE.Vector3(x, yPostFoot, z),
      new THREE.Vector3(x, yRail, z),
      tubeR * 1.05,
      railMat,
    )
  }

  const northZ = rect.z + inset
  const westX = rect.x + inset
  const eastX = rect.x + rect.w - inset
  const southZ = rect.z + rect.d
  const hasNorth = edges.includes("north")

  if (hasNorth) {
    const seg = (rect.w - t) / 4
    for (let i = 0; i <= 4; i++) post(westX + seg * i, northZ)
    addMetalTube(
      root,
      new THREE.Vector3(westX, yRail, northZ),
      new THREE.Vector3(eastX, yRail, northZ),
      tubeR,
      railMat,
    )
  }

  if (edges.includes("west")) {
    const zTop = hasNorth ? northZ : rect.z
    post(westX, southZ)
    if (!hasNorth) post(westX, zTop)
    addMetalTube(
      root,
      new THREE.Vector3(westX, yRail, zTop),
      new THREE.Vector3(westX, yRail, southZ),
      tubeR,
      railMat,
    )
  }

  if (edges.includes("east")) {
    const zTop = hasNorth ? northZ : rect.z
    post(eastX, southZ)
    if (!hasNorth) post(eastX, zTop)
    addMetalTube(
      root,
      new THREE.Vector3(eastX, yRail, zTop),
      new THREE.Vector3(eastX, yRail, southZ),
      tubeR,
      railMat,
    )
  }
}

function buildSpace(
  space: SpaceSpec,
  _palette: ScenePalette,
  materials: {
    wall: THREE.MeshStandardMaterial
    floor: THREE.MeshStandardMaterial
    outdoor: THREE.MeshStandardMaterial
  },
  spaces: SpaceSpec[],
  root: THREE.Group,
) {
  const { rect } = space
  const isOutdoor = space.kind === "outdoor"
  const wallYBase = FLOOR_THICKNESS_M
  const wallH = isOutdoor ? propM(0.85) : APARTMENT_CEILING_M

  const floorGeo = new THREE.BoxGeometry(rect.w, FLOOR_THICKNESS_M, rect.d)
  const floor = new THREE.Mesh(
    floorGeo,
    new THREE.MeshStandardMaterial({
      color: space.floor,
      roughness: isOutdoor ? 0.85 : 0.88,
      metalness: isOutdoor ? 0.04 : 0.02,
    }),
  )
  floor.position.set(rect.x + rect.w / 2, FLOOR_THICKNESS_M / 2, rect.z + rect.d / 2)
  floor.receiveShadow = true
  root.add(floor)

  if (isOutdoor) {
    buildBalconyParapetAndRail(root, rect, space.railEdges ?? ["north", "west", "east"])
    return
  }

  const doors = space.doors ?? []
  const drawn: DoorSpec["wall"][] = []
  for (const side of ["north", "south", "east", "west"] as const) {
    if (!drawsWall(space, side, spaces)) continue
    drawn.push(side)
    if (space.id === "living" && side === "north") {
      buildLivingNorthWall(root, rect, wallH, wallYBase, materials.wall)
      continue
    }
    addWallSegments(root, rect, side, doors, wallH, materials.wall, wallYBase)
  }
  if (!isOutdoor && drawn.length >= 2) {
    sealWallCorners(root, rect, wallH, wallYBase, materials.wall, drawn)
  }
}

function furnitureMaterial(
  kind: (typeof APARTMENT_FURNITURE)[number]["kind"],
  palette: ScenePalette,
): THREE.MeshStandardMaterial {
  const base = {
    roughness: 0.72,
    metalness: 0.05,
    emissive: palette.furnitureEmissive,
  }
  switch (kind) {
    case "fridge":
      return new THREE.MeshStandardMaterial({ ...base, color: 0xe8e4df, roughness: 0.35, metalness: 0.12 })
    case "sink":
      return new THREE.MeshStandardMaterial({ ...base, color: 0xa8b4c0, roughness: 0.4, metalness: 0.25 })
    case "counter":
      return new THREE.MeshStandardMaterial({ ...base, color: 0x9a948c, roughness: 0.78 })
    case "sofa":
      return new THREE.MeshStandardMaterial({ ...base, color: 0x3d2914, roughness: 0.94 })
    case "shelf":
      return new THREE.MeshStandardMaterial({ ...base, color: 0x7a6a55, roughness: 0.82 })
    case "tv":
      return new THREE.MeshStandardMaterial({ ...base, color: 0x1a1a1e, roughness: 0.45, metalness: 0.2 })
    case "table":
      return new THREE.MeshStandardMaterial({ ...base, color: 0x6b5c4a, roughness: 0.8 })
    case "appliance":
      return new THREE.MeshStandardMaterial({ ...base, color: 0x8a8782, roughness: 0.55, metalness: 0.15 })
    default:
      return new THREE.MeshStandardMaterial({ ...base, color: palette.furniture })
  }
}

function buildFurniture(palette: ScenePalette, root: THREE.Group) {
  if (APARTMENT_FURNITURE.length === 0) return
  for (const f of APARTMENT_FURNITURE) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(f.w, f.h, f.d),
      furnitureMaterial(f.kind, palette),
    )
    mesh.position.set(f.x + f.w / 2, f.h / 2, f.z + f.d / 2)
    root.add(mesh)
  }
}

function glassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: COLOR_GLASS,
    metalness: 0,
    roughness: 0.04,
    transmission: 0.94,
    transparent: true,
    opacity: 1,
    thickness: 0.012,
    ior: 1.52,
    specularIntensity: 1,
    envMapIntensity: 1,
    side: THREE.DoubleSide,
  })
}

function glazingPanelMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: COLOR_GLAZING_PANEL,
    roughness: 0.38,
    metalness: 0.06,
  })
}

function addGlazedPanel(
  parent: THREE.Object3D,
  width: number,
  height: number,
  frame: number,
  depth = GLAZING_PANEL_DEPTH_M,
) {
  const frameMat = glazingPanelMaterial()
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(0.05, width - frame * 2), Math.max(0.05, height - frame * 2), depth * 0.38),
    glassMaterial(),
  )
  parent.add(glass)
  const left = new THREE.Mesh(new THREE.BoxGeometry(frame, height, depth), frameMat)
  left.position.set(-width / 2 + frame / 2, 0, 0)
  const right = new THREE.Mesh(new THREE.BoxGeometry(frame, height, depth), frameMat)
  right.position.set(width / 2 - frame / 2, 0, 0)
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, frame, depth), frameMat)
  top.position.set(0, height / 2 - frame / 2, 0)
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(width, frame, depth), frameMat)
  bottom.position.set(0, -height / 2 + frame / 2, 0)
  parent.add(left, right, top, bottom)
}

function buildBalconyWindow(root: THREE.Group, living: SpaceSpec, w: (typeof BALCONY_FACADE_WINDOWS)[number]) {
  const { rect } = living
  const cx = rect.x + w.offset + w.width / 2
  const z = rect.z
  const yMid = FLOOR_THICKNESS_M + w.sill + w.height / 2
  const panel = new THREE.Group()
  panel.position.set(cx, yMid, z - WALL_THICKNESS_M / 2)
  addGlazedPanel(panel, w.width, w.height, w.frame)
  root.add(panel)
}

function buildBalconyWindows(root: THREE.Group, living: SpaceSpec) {
  for (const w of BALCONY_FACADE_WINDOWS) {
    buildBalconyWindow(root, living, w)
  }
}

const SOFA_DARK_BROWN = 0x3d2914

function sofaUpholsteryMaterial(palette: ScenePalette): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: SOFA_DARK_BROWN,
    roughness: 0.97,
    metalness: 0.01,
    emissive: palette.furnitureEmissive,
  })
}

function sofaRoundedGeometry(w: number, h: number, d: number, round: number) {
  const r = Math.min(round, w * 0.22, h * 0.28, d * 0.22)
  return new RoundedBoxGeometry(w, h, d, 6, r)
}

function addSofaPart(
  root: THREE.Group,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  round: number,
) {
  const mesh = new THREE.Mesh(sofaRoundedGeometry(w, h, d, round), mat)
  mesh.position.set(x, y, z)
  root.add(mesh)
}

function curtainMaterial(tone: "cream" | "white"): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: tone === "white" ? 0xfafafa : 0xf3ead8,
    roughness: 0.95,
    metalness: 0,
    transparent: true,
    opacity: tone === "white" ? 0.44 : 0.48,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
}

function addCurtainPanel(
  root: THREE.Group,
  xCenter: number,
  z: number,
  width: number,
  yBottom: number,
  height: number,
  tone: "cream" | "white" = "cream",
  depth = 0.018,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), curtainMaterial(tone))
  mesh.position.set(xCenter, yBottom + height / 2, z)
  root.add(mesh)
}

/** Cream curtains on the balcony-facing north wall (windows + east tail). */
function buildBalconyWallCurtains(root: THREE.Group, living: SpaceSpec) {
  const { rect } = living
  const win = BALCONY_FACADE_WINDOWS[0]!
  const yBottom = FLOOR_THICKNESS_M + win.sill - 0.12
  const height = Math.min(APARTMENT_CEILING_M, win.sill + win.height + 0.55) - yBottom
  const z = rect.z + 0.05

  const windowBandW = su(BALCONY_FACADE_WINDOW_PAIR_SU)
  const windowX0 = rect.x + su(BALCONY_WINDOW_WEST_MARGIN_SU)
  addCurtainPanel(root, windowX0 + windowBandW / 2, z, windowBandW, yBottom, height)

  const doorEast = rect.x + BALCONY_DOOR_METERS.offset + BALCONY_DOOR_METERS.width
  const tailW = su(BALCONY_DOOR_MARGIN_EAST_SU)
  addCurtainPanel(root, doorEast + tailW / 2, z, tailW, yBottom, height * 0.92)
}

/** White curtain on the balcony side of the glazed door. */
function buildBalconyDoorCurtain(root: THREE.Group, living: SpaceSpec) {
  const door = BALCONY_DOOR_METERS
  const jointZ = living.rect.z
  const xCenter = living.rect.x + door.offset + door.width / 2
  const z = jointZ - 0.05
  const yBottom = FLOOR_THICKNESS_M + 0.02
  const height = door.height + 0.32
  addCurtainPanel(root, xCenter, z, door.width, yBottom, height, "white")
}

const LIVING_FRIDGE_W_M = propM(1.2)
const LIVING_FRIDGE_D_M = propM(1.2)

/** West wall: sofa → fridge-sized bay (lamp) → fridge. */
function livingWestWallPropStrip(rect: PlanRect) {
  const { cz, alongWestD } = livingSofaLayout(rect)
  const laneX = rect.x + propM(0.3)
  const sofaSouthZ = cz + alongWestD
  const gapStartZ = sofaSouthZ + propM(0.1)
  const gapEndZ = gapStartZ + LIVING_FRIDGE_D_M
  const lampZ = (gapStartZ + gapEndZ) * 0.5
  const fridgeZ = gapEndZ + propM(0.12) + LIVING_FRIDGE_D_M / 2
  const fridgeX = laneX + LIVING_FRIDGE_W_M / 2
  return { laneX, lampZ, fridgeX, fridgeZ }
}

function tagLampPickable(obj: THREE.Object3D) {
  obj.userData[LAMP_PICK] = true
  obj.userData[PICK_USER_DATA] = {
    kind: "device",
    deviceId: SOFA_LAMP_DEVICE_ID,
  } satisfies ApartmentPick
}

/** L-sofa in the NW corner — backs against north and west walls; arms do not cross at the corner. */
function buildLivingCornerSofa(palette: ScenePalette, root: THREE.Group, living: SpaceSpec) {
  const { rect } = living
  const mat = sofaUpholsteryMaterial(palette)
  const backT = propM(0.24)
  const seatH = propM(0.42)
  const backH = propM(0.4)
  const ySeat = FLOOR_THICKNESS_M + seatH / 2
  const yBack = FLOOR_THICKNESS_M + seatH + backH / 2

  const { cx, cz, seatW, seatD, westSeatD, alongNorthW } = livingSofaLayout(rect)

  const seatRound = propM(0.13)
  const backRound = propM(0.1)

  const northSeatW = alongNorthW - seatW
  addSofaPart(root, northSeatW, seatH, seatD, cx + seatW + northSeatW / 2, ySeat, cz + seatD / 2, mat, seatRound)
  addSofaPart(root, seatW, seatH, westSeatD, cx + seatW / 2, ySeat, cz + seatD + westSeatD / 2, mat, seatRound)
  addSofaPart(root, seatW, seatH, seatD, cx + seatW / 2, ySeat, cz + seatD / 2, mat, seatRound + 0.02)

  addSofaPart(root, northSeatW, backH, backT, cx + seatW + northSeatW / 2, yBack, cz + backT / 2, mat, backRound)
  addSofaPart(root, backT, backH, westSeatD, cx + backT / 2, yBack, cz + seatD + westSeatD / 2, mat, backRound)
}

function buildLivingCoffeeTable(root: THREE.Group, living: SpaceSpec) {
  const { rect } = living
  const { cx, cz, seatW, seatD, alongWestD, alongNorthW } = livingSofaLayout(rect)
  const northSeatW = alongNorthW - seatW

  const tableW = propM(2.36)
  const tableD = propM(1.48)
  const tableH = propM(0.41)
  const wood = new THREE.MeshStandardMaterial({
    color: 0x3a2a1e,
    roughness: 0.8,
    metalness: 0.04,
  })

  const tx = cx + seatW + northSeatW * 0.24
  const tz = cz + seatD + alongWestD * 0.2
  const table = new THREE.Mesh(new THREE.BoxGeometry(tableW, tableH, tableD), wood)
  table.position.set(tx, FLOOR_THICKNESS_M + tableH / 2, tz)
  root.add(table)
}

function buildFridgeBesideLamp(root: THREE.Group, fridgeX: number, fridgeZ: number) {
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf7f7f4,
    roughness: 0.28,
    metalness: 0.1,
  })
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0xc5c8cc,
    roughness: 0.35,
    metalness: 0.55,
  })
  const h = propM(3.68)
  const w = LIVING_FRIDGE_W_M
  const d = LIVING_FRIDGE_D_M
  const fx = fridgeX
  const fz = fridgeZ

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat)
  body.position.set(fx, FLOOR_THICKNESS_M + h / 2, fz)
  root.add(body)

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(propM(0.08), propM(0.84), propM(0.1)),
    handleMat,
  )
  handle.position.set(fx + w / 2 - propM(0.06), FLOOR_THICKNESS_M + h * 0.58, fz + d / 2 + propM(0.01))
  root.add(handle)
}

function buildSofaLamp(root: THREE.Group, living: SpaceSpec): SofaLampRig {
  const { rect } = living
  const { laneX: lampX, lampZ, fridgeX, fridgeZ } = livingWestWallPropStrip(rect)

  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.35, metalness: 0.72 })
  const shadeMat = new THREE.MeshStandardMaterial({
    color: 0xf0e6d6,
    roughness: 0.88,
    metalness: 0.02,
    emissive: 0x000000,
    emissiveIntensity: 0,
  })

  const rigGroup = new THREE.Group()
  rigGroup.position.set(lampX, FLOOR_THICKNESS_M, lampZ)

  const base = new THREE.Mesh(new THREE.CylinderGeometry(propM(0.16), propM(0.19), propM(0.04), 24), metal)
  base.position.y = propM(0.02)
  rigGroup.add(base)
  tagLampPickable(base)

  const poleH = propM(1.62)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(propM(0.02), propM(0.025), poleH, 16), metal)
  pole.position.y = poleH / 2 + propM(0.04)
  rigGroup.add(pole)
  tagLampPickable(pole)

  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(propM(0.14), propM(0.22), propM(0.26), 24, 1, true),
    shadeMat,
  )
  shade.position.y = poleH + propM(0.1)
  rigGroup.add(shade)
  tagLampPickable(shade)

  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff1d6,
    emissive: 0xffb35c,
    emissiveIntensity: 0,
    roughness: 0.4,
  })
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(propM(0.055), 12, 12), bulbMat)
  bulb.position.y = poleH - propM(0.02)
  rigGroup.add(bulb)

  const light = new THREE.PointLight(0xffb56a, 0, propM(5.2), 1.65)
  light.position.set(0, poleH - propM(0.05), 0)
  rigGroup.add(light)

  root.add(rigGroup)
  buildFridgeBesideLamp(root, fridgeX, fridgeZ)

  return { rigGroup, light, shadeMat, bulbMat, on: false, onVisual: 0 }
}

function buildLivingTvStand(root: THREE.Group, living: SpaceSpec): LivingTvClockRig {
  const { rect } = living
  const wood = new THREE.MeshStandardMaterial({
    color: 0x3a2a1e,
    roughness: 0.78,
    metalness: 0.04,
  })
  const bezel = new THREE.MeshStandardMaterial({
    color: 0x141418,
    roughness: 0.4,
    metalness: 0.12,
  })
  const { displayMat, clock } = createLivingTvClockMaterial()
  const standAlongWall = LIVING_TV_STAND_ALONG_WALL_M
  const standDepth = propM(0.88)
  const standH = propM(1.0)
  const tvSizeScale = 0.72
  const tvW = LIVING_TV_SCREEN_ALONG_WALL_M * tvSizeScale
  const tvH = propM(1.36) * tvSizeScale
  const tvD = propM(0.1)

  const sz = livingEastWallTvCenterZ(rect)
  const eastLaneX = rect.x + rect.w - propM(0.3)
  const sx = eastLaneX - LIVING_FRIDGE_W_M / 2

  const stand = new THREE.Mesh(new THREE.BoxGeometry(standDepth, standH, standAlongWall), wood)
  stand.position.set(sx, FLOOR_THICKNESS_M + standH / 2, sz)
  root.add(stand)

  const tv = new THREE.Mesh(new THREE.BoxGeometry(tvD, tvH, tvW), [
    bezel,
    displayMat,
    bezel,
    bezel,
    bezel,
    bezel,
  ])
  tv.position.set(sx, FLOOR_THICKNESS_M + standH + tvH / 2, sz)
  const screenLight = new THREE.PointLight(0xf2f6ff, 2.6, propM(9), 1.65)
  screenLight.position.set(-tvD / 2 - propM(0.12), 0, 0)
  tv.add(screenLight)
  root.add(tv)
  const rig: LivingTvClockRig = {
    ...clock,
    light: screenLight,
    displayMat,
  }
  return rig
}

function applySofaLampVisual(rig: SofaLampRig) {
  const target = rig.on ? 1 : 0
  rig.onVisual += (target - rig.onVisual) * 0.16
  rig.light.intensity = rig.onVisual * 2.8
  rig.shadeMat.emissive.setHex(0xffc27a)
  rig.shadeMat.emissiveIntensity = rig.onVisual * 0.85
  rig.bulbMat.emissiveIntensity = rig.onVisual * 1.35
}

function buildBalconyDoorRig(root: THREE.Group, living: SpaceSpec): BalconyDoorRig {
  const { rect } = living
  const d = BALCONY_DOOR_METERS
  const hingeX = rect.x + d.offset + d.width
  const hingeZ = rect.z
  const pivot = new THREE.Group()
  pivot.position.set(hingeX, FLOOR_THICKNESS_M, hingeZ)
  const panel = new THREE.Group()
  panel.position.set(-d.width / 2, d.height / 2, -WALL_THICKNESS_M / 2)
  addGlazedPanel(panel, d.width, d.height, d.frame)
  panel.userData[DOOR_PICK] = true
  for (const child of panel.children) {
    child.userData[DOOR_PICK] = true
  }
  pivot.add(panel)
  root.add(pivot)
  return { pivot, openTarget: 0, openCurrent: 0 }
}

function buildDevices(
  palette: ScenePalette,
  root: THREE.Group,
  deviceMeshes: Map<string, THREE.Mesh>,
) {
  if (APARTMENT_DEVICES.length === 0) return
  for (const d of APARTMENT_DEVICES) {
    if (d.id === SOFA_LAMP_DEVICE_ID) continue
    const geo = new THREE.CylinderGeometry(0.11, 0.11, 0.32, 20)
    const mat = new THREE.MeshStandardMaterial({
      color: palette.pin,
      emissive: 0x0a1628,
      emissiveIntensity: 0.4,
      roughness: 0.35,
      metalness: 0.25,
    })
    const mesh = new THREE.Mesh(geo, mat)
    const pos = deviceWorldPosition(d.id)
    mesh.position.set(pos.x, 0.22, pos.z)
    mesh.userData[PICK_USER_DATA] = { kind: "device", deviceId: d.id } satisfies ApartmentPick
    root.add(mesh)
    deviceMeshes.set(d.id, mesh)

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.018, 10, 28),
      new THREE.MeshStandardMaterial({
        color: palette.pin,
        transparent: true,
        opacity: 0.55,
        roughness: 0.4,
      }),
    )
    ring.rotation.x = Math.PI / 2
    ring.position.set(pos.x, 0.04, pos.z)
    root.add(ring)
  }
}

function frameOrbit(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  bounds: ReturnType<typeof footprintBounds>,
) {
  const { cx, cz, maxX, maxZ } = bounds
  const span = Math.max(maxX, maxZ)
  controls.target.set(cx, 0.6, cz)
  const dist = span * 1.35
  const az = Math.PI * 0.2
  const el = Math.PI * 0.32
  camera.position.set(
    cx + dist * Math.cos(el) * Math.sin(az),
    dist * Math.sin(el) * 0.85 + 1.2,
    cz + dist * Math.cos(el) * Math.cos(az),
  )
  camera.near = 0.1
  camera.far = Math.max(80, dist * 12)
  camera.updateProjectionMatrix()
}

export function deviceById(id: string): DeviceSpec | undefined {
  return APARTMENT_DEVICES.find((d) => d.id === id)
}

export function roomById(pickId: string) {
  return roomCardById(pickId)
}

export function createApartmentScene(
  container: HTMLElement,
  opts: CreateOpts = {},
): ApartmentSceneHandle {
  let viewMode: ApartmentViewMode = opts.defaultView ?? "plan"
  let highlightPick: ApartmentPick | null = null
  const bounds = footprintBounds()
  const deviceMeshes = new Map<string, THREE.Mesh>()

  const scene = new THREE.Scene()
  const apartmentRoot = new THREE.Group()
  scene.add(apartmentRoot)

  let themeDark = opts.dark ?? false
  const palette = () => (themeDark ? PALETTE.dark : PALETTE.light)

  const aspect = () => {
    const { width, height } = container.getBoundingClientRect()
    return Math.max(width / Math.max(height, 1), 0.01)
  }

  const perspCamera = new THREE.PerspectiveCamera(42, aspect(), 0.05, 120)
  const planCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 120)
  let activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera = perspCamera

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.domElement.style.display = "block"
  renderer.domElement.style.width = "100%"
  renderer.domElement.style.height = "100%"
  container.appendChild(renderer.domElement)

  let sceneAlive = true

  const controls = new OrbitControls(perspCamera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.09
  controls.enablePan = false
  controls.maxPolarAngle = Math.PI * 0.49
  controls.minDistance = 4
  controls.maxDistance = 32

  const applyOrbitPanMode = (enabled: boolean) => {
    controls.enablePan = enabled
    if (enabled) {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }
    } else {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }
    }
  }
  applyOrbitPanMode(false)

  const onViewerWheel = (e: WheelEvent) => {
    e.stopPropagation()
  }
  renderer.domElement.addEventListener("wheel", onViewerWheel, { passive: true })

  const key = new THREE.DirectionalLight(0xfff7ed, 1.1)
  key.position.set(8, 14, 6)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xe0e7ff, 0.45)
  fill.position.set(-6, 8, -4)
  scene.add(fill)
  const ambient = new THREE.AmbientLight(0xffffff, 0.75)
  scene.add(ambient)

  const wallMat = new THREE.MeshStandardMaterial({
    color: COLOR_LIVING_WALL,
    roughness: 0.82,
    metalness: 0.02,
  })
  const floorMat = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.02 })
  const outdoorMat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.02 })

  const buildPalette = palette()
  const livingSpace = APARTMENT_SPACES.find((s) => s.id === "living")
  const balconySpace = APARTMENT_SPACES.find((s) => s.id === "balcony-1")
  for (const space of APARTMENT_SPACES) {
    buildSpace(
      space,
      buildPalette,
      { wall: wallMat, floor: floorMat, outdoor: outdoorMat },
      APARTMENT_SPACES,
      apartmentRoot,
    )
  }
  let doorRig: BalconyDoorRig | null = null
  let sofaLampRig: SofaLampRig | null = null
  let livingTvClock: LivingTvClockRig | null = null
  if (livingSpace) {
    buildBalconyWindows(apartmentRoot, livingSpace)
    doorRig = buildBalconyDoorRig(apartmentRoot, livingSpace)
    buildBalconyWallCurtains(apartmentRoot, livingSpace)
    buildLivingCornerSofa(buildPalette, apartmentRoot, livingSpace)
    buildLivingCoffeeTable(apartmentRoot, livingSpace)
    sofaLampRig = buildSofaLamp(apartmentRoot, livingSpace)
    livingTvClock = buildLivingTvStand(apartmentRoot, livingSpace)
    buildEastDoorTvVignette(apartmentRoot, livingSpace)
  }
  if (livingSpace && balconySpace) {
    buildBalconyDoorCurtain(apartmentRoot, livingSpace)
    void loadBalconyBicycle(apartmentRoot, balconySpace)
  }
  buildFurniture(buildPalette, apartmentRoot)
  buildDevices(buildPalette, apartmentRoot, deviceMeshes)

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  let raf = 0

  const applyTheme = () => {
    const p = palette()
    scene.background = new THREE.Color(p.background)
    scene.fog = viewMode === "plan" ? null : new THREE.FogExp2(p.background, themeDark ? 0.014 : 0.022)
    ambient.intensity = p.ambientIntensity
    renderer.toneMappingExposure = p.exposure
    wallMat.color.setHex(p.wall)
    wallMat.emissive.setHex(p.wallEmissive)
    for (const mesh of deviceMeshes.values()) {
      const mat = mesh.material as THREE.MeshStandardMaterial
      const active = mat.emissiveIntensity > 0.9
      mat.color.setHex(active ? p.pinActive : p.pin)
    }
  }

  const applyHighlight = () => {
    apartmentRoot.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      const pick = obj.userData[PICK_USER_DATA] as ApartmentPick | undefined
      if (!pick) return
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const raw of mats) {
        if (!(raw instanceof THREE.MeshStandardMaterial)) continue
        const selected =
          highlightPick &&
          ((highlightPick.kind === "room" &&
            pick.kind === "room" &&
            highlightPick.roomId === pick.roomId) ||
            (highlightPick.kind === "device" &&
              pick.kind === "device" &&
              highlightPick.deviceId === pick.deviceId))
        raw.emissive.setHex(selected ? (themeDark ? 0x334155 : 0xfbbf24) : 0x000000)
        raw.emissiveIntensity = selected ? (themeDark ? 0.35 : 0.22) : 0
      }
    })
  }

  const applyView = () => {
    if (viewMode === "plan") {
      controls.enabled = false
      return
    }
    activeCamera = perspCamera
    controls.enabled = true
    controls.object = perspCamera
    frameOrbit(perspCamera, controls, bounds)
  }

  const resize = () => {
    const { width, height } = container.getBoundingClientRect()
    if (width < 2 || height < 2) return
    const a = width / height
    perspCamera.aspect = a
    perspCamera.updateProjectionMatrix()
    const span = Math.max(bounds.maxX, bounds.maxZ) * 1.08
    const halfH = span / 2
    const halfW = halfH * a
    planCamera.left = -halfW
    planCamera.right = halfW
    planCamera.top = halfH
    planCamera.bottom = -halfH
    planCamera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    if (viewMode === "orbit") frameOrbit(perspCamera, controls, bounds)
  }

  const toggleDoor = () => {
    if (!doorRig) return
    const next = doorRig.openTarget < 0.5 ? 1 : 0
    doorRig.openTarget = next
    opts.onBalconyDoorChange?.(next > 0.5)
  }

  const toggleSofaLamp = () => {
    if (!sofaLampRig) return
    sofaLampRig.on = !sofaLampRig.on
    opts.onSofaLampChange?.(sofaLampRig.on)
  }

  const onPointerDown = (ev: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, activeCamera)
    const hits = raycaster.intersectObjects(apartmentRoot.children, true)
    const doorHit = hits.find((h) => {
      let node: THREE.Object3D | null = h.object
      while (node) {
        if (node.userData[DOOR_PICK]) return true
        node = node.parent
      }
      return false
    })
    if (doorHit) {
      toggleDoor()
      return
    }
    const lampHit = hits.find((h) => {
      let node: THREE.Object3D | null = h.object
      while (node) {
        if (node.userData[LAMP_PICK]) return true
        node = node.parent
      }
      return false
    })
    if (lampHit) {
      toggleSofaLamp()
      const lampPick: ApartmentPick = { kind: "device", deviceId: SOFA_LAMP_DEVICE_ID }
      highlightPick = lampPick
      applyHighlight()
      opts.onPick?.(lampPick)
      return
    }
    const hit = hits.find((h) => h.object.userData[PICK_USER_DATA])
    if (!hit) return
    const pick = hit.object.userData[PICK_USER_DATA] as ApartmentPick
    highlightPick = pick
    applyHighlight()
    opts.onPick?.(pick)
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown)

  const animate = () => {
    raf = requestAnimationFrame(animate)
    if (!sceneAlive) return
    if (doorRig) {
      const ease = 0.14
      doorRig.openCurrent += (doorRig.openTarget - doorRig.openCurrent) * ease
      doorRig.pivot.rotation.y = doorRig.openCurrent * (Math.PI / 2) * 0.94
    }
    if (sofaLampRig) applySofaLampVisual(sofaLampRig)
    if (livingTvClock) tickLivingTvClock(livingTvClock)
    if (viewMode !== "orbit") return
    controls.update()
    renderer.render(scene, activeCamera)
  }

  applyTheme()
  applyView()
  resize()
  animate()

  const ro = new ResizeObserver(() => resize())
  ro.observe(container)

  return {
    setDark(next) {
      themeDark = next
      applyTheme()
      applyHighlight()
    },
    setView(mode) {
      viewMode = mode
      applyView()
      resize()
    },
    setPan(enabled) {
      applyOrbitPanMode(enabled)
    },
    setDevicePulse(id, active) {
      const mesh = deviceMeshes.get(id)
      if (!mesh) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      const p = palette()
      mat.color.setHex(active ? p.pinActive : p.pin)
      mat.emissiveIntensity = active ? 1.1 : 0.4
    },
    highlight(pick) {
      highlightPick = pick
      applyHighlight()
    },
    toggleBalconyDoor: toggleDoor,
    balconyDoorOpen: () => (doorRig?.openTarget ?? 0) > 0.5,
    toggleSofaLamp,
    sofaLampOn: () => sofaLampRig?.on ?? false,
    resize,
    dispose() {
      sceneAlive = false
      livingTvClock?.texture.dispose()
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener("pointerdown", onPointerDown)
      renderer.domElement.removeEventListener("wheel", onViewerWheel)
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          for (const m of mats) m.dispose()
        }
      })
    },
  }
}