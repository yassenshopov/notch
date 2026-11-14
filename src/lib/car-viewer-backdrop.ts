import * as THREE from "three"
import type { CarViewerTheme } from "./car-3d-studio"

export type CarViewerBackdrop = "studio" | "garage"

export type GarageBackdropPalette = {
  floor: number
  wall: number
  wallAccent: number
  ceiling: number
  strip: number
  fogDensity: number
}

export const GARAGE_BACKDROP_PALETTES: Record<CarViewerTheme, GarageBackdropPalette> = {
  light: {
    floor: 0xd4d6d8,
    wall: 0xeceef1,
    wallAccent: 0xd8dce2,
    ceiling: 0xf2f4f6,
    strip: 0xf8fbff,
    fogDensity: 0.032,
  },
  dark: {
    floor: 0x12161c,
    wall: 0x1a2028,
    wallAccent: 0x242b35,
    ceiling: 0x0e1218,
    strip: 0xe8f0ff,
    fogDensity: 0.024,
  },
}

type GaragePart = {
  mesh: THREE.Mesh
  kind: "floor" | "wall" | "wallAccent" | "ceiling" | "strip"
}

export type CarGarageBackdrop = {
  group: THREE.Group
  ceilingLights: THREE.PointLight[]
  applyTheme: (theme: CarViewerTheme) => void
  dispose: () => void
}

const BAY_W = 14
const BAY_D = 10
const BAY_H = 3.6

export function createCarGarageBackdrop(theme: CarViewerTheme): CarGarageBackdrop {
  const group = new THREE.Group()
  const parts: GaragePart[] = []
  const disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material }[] = []

  const mat = (kind: GaragePart["kind"], opts: THREE.MeshStandardMaterialParameters) => {
    const material = new THREE.MeshStandardMaterial(opts)
    disposables.push({ material })
    return { material, kind }
  }

  const addMesh = (
    geometry: THREE.BufferGeometry,
    kind: GaragePart["kind"],
    opts: THREE.MeshStandardMaterialParameters,
    position?: THREE.Vector3Tuple,
    rotation?: THREE.EulerTuple,
  ) => {
    disposables.push({ geometry })
    const { material } = mat(kind, opts)
    const mesh = new THREE.Mesh(geometry, material)
    if (position) mesh.position.set(...position)
    if (rotation) mesh.rotation.set(...rotation)
    mesh.receiveShadow = kind === "floor" || kind === "wall" || kind === "wallAccent"
    mesh.castShadow = kind === "strip"
    parts.push({ mesh, kind })
    group.add(mesh)
    return mesh
  }

  const p = () => GARAGE_BACKDROP_PALETTES[theme]

  addMesh(
    new THREE.PlaneGeometry(BAY_W, BAY_D),
    "floor",
    {
      color: p().floor,
      roughness: 0.22,
      metalness: 0.35,
    },
    [0, 0, -BAY_D * 0.08],
    [-Math.PI / 2, 0, 0],
  )

  addMesh(
    new THREE.PlaneGeometry(BAY_W, BAY_H),
    "wall",
    { color: p().wall, roughness: 0.88, metalness: 0.02 },
    [0, BAY_H / 2, -BAY_D / 2],
    [0, 0, 0],
  )

  addMesh(
    new THREE.PlaneGeometry(BAY_D, BAY_H),
    "wall",
    { color: p().wall, roughness: 0.9, metalness: 0.02 },
    [-BAY_W / 2, BAY_H / 2, -BAY_D * 0.12],
    [0, Math.PI / 2, 0],
  )

  addMesh(
    new THREE.PlaneGeometry(BAY_D, BAY_H),
    "wall",
    { color: p().wall, roughness: 0.9, metalness: 0.02 },
    [BAY_W / 2, BAY_H / 2, -BAY_D * 0.12],
    [0, -Math.PI / 2, 0],
  )

  addMesh(
    new THREE.PlaneGeometry(BAY_W * 0.72, BAY_H * 0.55),
    "wallAccent",
    { color: p().wallAccent, roughness: 0.75, metalness: 0.08 },
    [0, BAY_H * 0.52, -BAY_D / 2 + 0.02],
    [0, 0, 0],
  )

  addMesh(
    new THREE.PlaneGeometry(BAY_W, BAY_D),
    "ceiling",
    { color: p().ceiling, roughness: 0.95, metalness: 0.04 },
    [0, BAY_H, -BAY_D * 0.08],
    [Math.PI / 2, 0, 0],
  )

  const stripY = BAY_H - 0.08
  const stripPositions: THREE.Vector3Tuple[] = [
    [-3.2, stripY, -1.2],
    [0, stripY, -2.4],
    [3.2, stripY, -1.2],
  ]
  for (const pos of stripPositions) {
    addMesh(
      new THREE.BoxGeometry(2.8, 0.06, 0.35),
      "strip",
      {
        color: p().strip,
        emissive: new THREE.Color(p().strip),
        emissiveIntensity: theme === "dark" ? 1.85 : 1.35,
        roughness: 0.35,
        metalness: 0.1,
      },
      pos,
    )
  }

  const ceilingLights: THREE.PointLight[] = []
  for (const pos of stripPositions) {
    const light = new THREE.PointLight(0xf0f4ff, theme === "dark" ? 0.42 : 0.28, 12, 2)
    light.position.set(pos[0], pos[1] - 0.15, pos[2])
    group.add(light)
    ceilingLights.push(light)
  }

  const applyTheme = (next: CarViewerTheme) => {
    const colors = GARAGE_BACKDROP_PALETTES[next]
    for (const { mesh, kind } of parts) {
      const m = mesh.material as THREE.MeshStandardMaterial
      switch (kind) {
        case "floor":
          m.color.setHex(colors.floor)
          break
        case "wall":
          m.color.setHex(colors.wall)
          break
        case "wallAccent":
          m.color.setHex(colors.wallAccent)
          break
        case "ceiling":
          m.color.setHex(colors.ceiling)
          break
        case "strip":
          m.color.setHex(colors.strip)
          m.emissive.setHex(colors.strip)
          m.emissiveIntensity = next === "dark" ? 1.85 : 1.35
          break
      }
    }
    for (const light of ceilingLights) {
      light.intensity = next === "dark" ? 0.42 : 0.28
    }
  }

  const dispose = () => {
    for (const light of ceilingLights) group.remove(light)
    for (const d of disposables) {
      d.geometry?.dispose()
      d.material?.dispose()
    }
    group.clear()
  }

  return { group, ceilingLights, applyTheme, dispose }
}