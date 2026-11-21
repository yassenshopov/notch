import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import {
  APARTMENT_CEILING_M,
  APARTMENT_DEVICES,
  APARTMENT_FURNITURE,
  APARTMENT_SPACES,
  BALCONY_DOOR_METERS,
  BALCONY_WINDOW_METERS,
  COLOR_BALCONY_FLOOR,
  COLOR_GLASS,
  COLOR_GLAZING_PANEL,
  COLOR_LIVING_WALL,
  GLAZING_PANEL_DEPTH_M,
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

export type ApartmentSceneHandle = {
  dispose: () => void
  setDark: (dark: boolean) => void
  setView: (mode: ApartmentViewMode) => void
  setPan: (enabled: boolean) => void
  setDevicePulse: (id: string, active: boolean) => void
  highlight: (pick: ApartmentPick | null) => void
  toggleBalconyDoor: () => void
  balconyDoorOpen: () => boolean
  resize: () => void
}

type CreateOpts = {
  dark?: boolean
  defaultView?: ApartmentViewMode
  onPick?: (pick: ApartmentPick | null) => void
  onBalconyDoorChange?: (open: boolean) => void
}

const DOOR_PICK = "apartmentBalconyDoor"

type BalconyDoorRig = {
  pivot: THREE.Group
  openTarget: number
  openCurrent: number
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
const EDGE_EPS = 0.04

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

/** North wall with sill/lintel above window and above door (not full-height holes). */
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
  const win = BALCONY_WINDOW_METERS

  const wx0 = rect.x + win.offset
  const wx1 = wx0 + win.width
  const dx0 = rect.x + door.offset
  const dx1 = dx0 + door.width
  const xEnd = rect.x + rect.w

  addWallBox(root, rect.x + (wx0 - rect.x) / 2, z, wx0 - rect.x, t, wallH, yBase, mat)
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
  if (dx0 > wx1 + 0.02) {
    addWallBox(root, wx1 + (dx0 - wx1) / 2, z, dx0 - wx1, t, wallH, yBase, mat)
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
  if (xEnd > dx1 + 0.02) {
    addWallBox(root, dx1 + (xEnd - dx1) / 2, z, xEnd - dx1, t, wallH, yBase, mat)
  }
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
  const floorY = 0
  const wallH = isOutdoor ? 0.85 : APARTMENT_CEILING_M

  const floorGeo = new THREE.BoxGeometry(rect.w, 0.08, rect.d)
  const floor = new THREE.Mesh(
    floorGeo,
    new THREE.MeshStandardMaterial({
      color: space.floor,
      roughness: isOutdoor ? 0.85 : 0.88,
      metalness: isOutdoor ? 0.04 : 0.02,
    }),
  )
  floor.position.set(rect.x + rect.w / 2, floorY, rect.z + rect.d / 2)
  floor.receiveShadow = true
  floor.userData[PICK_USER_DATA] = { kind: "room", roomId: space.pickId } satisfies ApartmentPick
  root.add(floor)

  if (isOutdoor) {
    const railMat = new THREE.MeshStandardMaterial({
      color: COLOR_BALCONY_FLOOR,
      metalness: 0.2,
      roughness: 0.62,
    })
    const railH = 0.95
    const railT = 0.05
    const edges = space.railEdges ?? ["north", "south", "east", "west"]
    const rails: { w: number; d: number; x: number; z: number }[] = []
    if (edges.includes("north")) {
      rails.push({ w: rect.w, d: railT, x: rect.x + rect.w / 2, z: rect.z + railT / 2 })
    }
    if (edges.includes("south")) {
      rails.push({ w: rect.w, d: railT, x: rect.x + rect.w / 2, z: rect.z + rect.d - railT / 2 })
    }
    if (edges.includes("west")) {
      rails.push({ w: railT, d: rect.d, x: rect.x + railT / 2, z: rect.z + rect.d / 2 })
    }
    if (edges.includes("east")) {
      rails.push({ w: railT, d: rect.d, x: rect.x + rect.w - railT / 2, z: rect.z + rect.d / 2 })
    }
    for (const edge of rails) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(edge.w, railH, edge.d), railMat)
      bar.position.set(edge.x, floorY + railH / 2, edge.z)
      root.add(bar)
    }
    return
  }

  const doors = space.doors ?? []
  for (const side of ["north", "south", "east", "west"] as const) {
    if (!drawsWall(space, side, spaces)) continue
    if (space.id === "living" && side === "north") {
      buildLivingNorthWall(root, rect, wallH, floorY, materials.wall)
      continue
    }
    addWallSegments(root, rect, side, doors, wallH, materials.wall, floorY)
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
      return new THREE.MeshStandardMaterial({ ...base, color: 0x5c534a, roughness: 0.92 })
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

function buildBalconyWindow(root: THREE.Group, living: SpaceSpec) {
  const { rect } = living
  const w = BALCONY_WINDOW_METERS
  const cx = rect.x + w.offset + w.width / 2
  const z = rect.z
  const yMid = w.sill + w.height / 2
  const panel = new THREE.Group()
  panel.position.set(cx, yMid, z - WALL_THICKNESS_M / 2)
  addGlazedPanel(panel, w.width, w.height, w.frame)
  root.add(panel)
}

function buildBalconyDoorRig(root: THREE.Group, living: SpaceSpec): BalconyDoorRig {
  const { rect } = living
  const d = BALCONY_DOOR_METERS
  const hingeX = rect.x + d.offset + d.width
  const hingeZ = rect.z
  const pivot = new THREE.Group()
  pivot.position.set(hingeX, 0, hingeZ)
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
  if (livingSpace) {
    buildBalconyWindow(apartmentRoot, livingSpace)
    doorRig = buildBalconyDoorRig(apartmentRoot, livingSpace)
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
    const hit = hits.find((h) => h.object.userData[PICK_USER_DATA])
    const pick = (hit?.object.userData[PICK_USER_DATA] as ApartmentPick | undefined) ?? null
    highlightPick = pick
    applyHighlight()
    opts.onPick?.(pick)
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown)

  const animate = () => {
    raf = requestAnimationFrame(animate)
    if (doorRig) {
      const ease = 0.14
      doorRig.openCurrent += (doorRig.openTarget - doorRig.openCurrent) * ease
      doorRig.pivot.rotation.y = doorRig.openCurrent * (Math.PI / 2) * 0.94
    }
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
    resize,
    dispose() {
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