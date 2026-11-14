import * as THREE from "three"
import { parseCarBodyPaintHex } from "./car-3d-studio"

export type CarMeshRole =
  | "body"
  | "rim"
  | "caliper"
  | "brakeDisc"
  | "chrome"
  | "rearGlass"
  | "glass"
  | "tire"
  | "tailLamp"
  | "lampLens"
  | "tailLampLens"
  | "blackPlastic"
  | "glossMetal"
  | "mirror"
  | "interior"
  | "default"

const SILVER_RIM = 0xc4c9d1
const CHROME_TRIM = 0xe4e7ec
const CALIPER_RED = 0xd31c1c
const GLASS_TINT = 0x141a20
const REAR_GLASS_TINT = 0x080a0e

export function classifyCarMesh(name: string): CarMeshRole {
  const n = name.toLowerCase()
  if (n.includes("licplate") || n.includes("register_plate")) return "default"
  if (n.includes("back_window")) return "rearGlass"
  if (n.includes("windshield") || (n.includes("doors") && n.includes("glass"))) return "glass"
  if (n.startsWith("rim_") || n.startsWith("bolts_")) return "rim"
  if (/wheel_1_(2|06|08|10)(_|$)/.test(n)) return "brakeDisc"
  if (/wheel_1_(4|05|07|09)(_|$)/.test(n)) return "caliper"
  if (n.includes("tire")) return "tire"
  if (/^mazda/.test(n)) return "chrome"
  if (n.includes("mirrors_3")) return "mirror"
  if (n.includes("interior") || n.includes("dashboard") || n.includes("steering_wheel")) return "interior"
  if (n.includes("muffers") || n.includes("muffler")) return "glossMetal"
  if (n.includes("black_plastic") || n.includes("grill_")) return "blackPlastic"
  if (n.includes("taillight_03") || n.includes("taillight_01")) return "tailLampLens"
  if (
    n.includes("lights_dimension_2") ||
    n.includes("lights_front_1") ||
    n.includes("lights_front_3")
  ) {
    return "lampLens"
  }
  if (n.includes("taillight")) return "chrome"
  if (n.includes("lights_front") || n.includes("lights_dimension") || n.includes("light_reflection")) {
    return "chrome"
  }
  if (n.includes("top_2")) return "body"
  if (
    n.includes("top_1") ||
    (n.includes("doors") && !n.includes("glass")) ||
    n.includes("trunk") ||
    (n.includes("bumper") && !n.includes("plastic")) ||
    n.includes("fender") ||
    n.includes("side_1") ||
    n.includes("handles_1") ||
    n.includes("mirrors_1") ||
    n.includes("sill") ||
    n.includes("_bumper_front")
  ) {
    return "body"
  }
  return "default"
}

function asStandard(mat: THREE.Material): THREE.MeshStandardMaterial | null {
  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
    return mat as THREE.MeshStandardMaterial
  }
  return null
}

function isPlateMeshTree(mesh: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = mesh
  while (node) {
    const n = node.name.toLowerCase()
    if (n.includes("licplate") || n.includes("register_plate")) return true
    node = node.parent
  }
  return false
}

/** Palette GLB reuses few materials across the whole car — clone before any edit. */
function meshMaterials(mesh: THREE.Mesh): THREE.MeshStandardMaterial[] {
  const src = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  const cloned = src.map((raw) => {
    const std = asStandard(raw)
    return std ? std.clone() : raw.clone()
  })
  mesh.material = cloned.length === 1 ? cloned[0]! : cloned
  return cloned.filter((m): m is THREE.MeshStandardMaterial => m instanceof THREE.MeshStandardMaterial)
}

function clearMaps(mat: THREE.MeshStandardMaterial) {
  mat.map = null
  mat.metalnessMap = null
  mat.roughnessMap = null
  mat.aoMap = null
}

function styleSilverRim(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.color.setHex(SILVER_RIM)
  mat.metalness = 0.88
  mat.roughness = 0.2
  mat.envMapIntensity = 1.25
  mat.transparent = false
  mat.opacity = 1
}

function styleChrome(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.color.setHex(CHROME_TRIM)
  mat.metalness = 0.96
  mat.roughness = 0.1
  mat.envMapIntensity = 1.55
  mat.transparent = false
  mat.opacity = 1
}

function styleCaliperRed(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.color.setHex(CALIPER_RED)
  mat.metalness = 0.25
  mat.roughness = 0.55
  mat.envMapIntensity = 0.9
  mat.transparent = false
  mat.opacity = 1
}

function styleBrakeDisc(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.color.setHex(0x1c1c1e)
  mat.metalness = 0.55
  mat.roughness = 0.48
  mat.envMapIntensity = 0.85
  mat.transparent = false
  mat.opacity = 1
}

function styleGlass(mat: THREE.MeshStandardMaterial, opacity: number) {
  clearMaps(mat)
  mat.color.setHex(opacity < 0.4 ? REAR_GLASS_TINT : GLASS_TINT)
  mat.metalness = 0.12
  mat.roughness = 0.06
  mat.transparent = true
  mat.opacity = opacity
  mat.depthWrite = false
  mat.side = THREE.DoubleSide
  mat.envMapIntensity = 1.4
}

function styleTire(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.color.setHex(0x141414)
  mat.metalness = 0.05
  mat.roughness = 0.92
}

function styleBodyBase(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.metalness = 0.45
  mat.roughness = 0.26
  mat.envMapIntensity = 1.1
  mat.transparent = false
  mat.opacity = 1
}

function styleBlackPlastic(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.color.setHex(0x1a1a1c)
  mat.metalness = 0.15
  mat.roughness = 0.82
}

function styleGlossMetal(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.color.setHex(0x8a8d92)
  mat.metalness = 0.75
  mat.roughness = 0.35
  mat.envMapIntensity = 1.2
}

function styleMirror(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.color.setHex(0x9aa3a8)
  mat.metalness = 1
  mat.roughness = 0.05
  mat.envMapIntensity = 1.6
}

function styleLampLens(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.color.setHex(0xeceff2)
  mat.emissive.setHex(0x000000)
  mat.emissiveIntensity = 0
  mat.metalness = 0.04
  mat.roughness = 0.1
  mat.transparent = true
  mat.opacity = 0.46
  mat.depthWrite = false
  mat.side = THREE.DoubleSide
  mat.envMapIntensity = 1.25
}

function styleTailLampLens(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.color.setHex(0xf2f4f6)
  mat.emissive.setHex(0x331008)
  mat.emissiveIntensity = 0.12
  mat.metalness = 0.06
  mat.roughness = 0.14
  mat.transparent = true
  mat.opacity = 0.5
  mat.depthWrite = false
  mat.side = THREE.DoubleSide
  mat.envMapIntensity = 1.2
}

function styleInterior(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.metalness = 0.06
  mat.roughness = 0.9
  mat.envMapIntensity = 0.45
  mat.transparent = false
  mat.opacity = 1
}

function stylePaletteDefault(mat: THREE.MeshStandardMaterial) {
  // Keep palette texture; only freshen PBR response for studio lighting.
  if (mat.map) {
    mat.color.setHex(0xffffff)
  }
  mat.envMapIntensity = Math.max(mat.envMapIntensity, 1)
}

export function applyCarVisualDetails(root: THREE.Object3D, bodyColorHex: string) {
  const paintMats: THREE.MeshStandardMaterial[] = []
  const interiorMats: THREE.MeshStandardMaterial[] = []
  const bodyColor = parseCarBodyPaintHex(bodyColorHex)

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    if (isPlateMeshTree(obj)) return
    obj.castShadow = true
    obj.receiveShadow = true
    const role = classifyCarMesh(obj.name)
    const mats = meshMaterials(obj)
    for (const mat of mats) {
      switch (role) {
        case "rim":
          styleSilverRim(mat)
          break
        case "chrome":
          styleChrome(mat)
          break
        case "caliper":
          styleCaliperRed(mat)
          break
        case "brakeDisc":
          styleBrakeDisc(mat)
          break
        case "rearGlass":
          styleGlass(mat, 0.52)
          break
        case "glass":
          styleGlass(mat, 0.34)
          break
        case "tire":
          styleTire(mat)
          break
        case "body":
          styleBodyBase(mat)
          paintMats.push(mat)
          break
        case "blackPlastic":
          styleBlackPlastic(mat)
          break
        case "glossMetal":
          styleGlossMetal(mat)
          break
        case "mirror":
          styleMirror(mat)
          break
        case "interior":
          styleInterior(mat)
          interiorMats.push(mat)
          break
        case "lampLens":
          styleLampLens(mat)
          break
        case "tailLampLens":
          styleTailLampLens(mat)
          break
        default:
          stylePaletteDefault(mat)
          break
      }
    }
  })

  if (bodyColor != null) {
    const color = new THREE.Color(bodyColor)
    paintMats.forEach((m) => m.color.copy(color))
    interiorMats.forEach((m) => m.color.copy(color))
  } else {
    const black = new THREE.Color(0x0a0a0c)
    interiorMats.forEach((m) => m.color.copy(black))
  }

  return { paintMats, interiorMats }
}

export function applyBodyColorToPaint(paintMats: THREE.MeshStandardMaterial[], hex: string) {
  const c = parseCarBodyPaintHex(hex)
  if (c == null) return
  const color = new THREE.Color(c)
  paintMats.forEach((m) => m.color.copy(color))
}