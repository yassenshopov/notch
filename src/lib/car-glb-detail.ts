import * as THREE from "three"
import { parseCarBodyPaintHex } from "./car-3d-studio"

export type CarMeshRole =
  | "body"
  | "roof"
  | "mirrorCap"
  | "rim"
  | "caliper"
  | "brakeDisc"
  | "chrome"
  | "rearGlass"
  | "glass"
  | "tire"
  | "tailLamp"
  | "lampLens"
  | "headLampLens"
  | "tailLampLens"
  | "hidden"
  | "blackPlastic"
  | "glossMetal"
  | "mirror"
  | "interior"
  | "default"

export type CarVisualPaintResult = {
  paintMats: THREE.MeshStandardMaterial[]
  roofMats: THREE.MeshStandardMaterial[]
  mirrorCapMats: THREE.MeshStandardMaterial[]
  interiorMats: THREE.MeshStandardMaterial[]
}

export type CarVisualOptions = {
  roofColorHex?: string
  mirrorCapColorHex?: string
  classify?: (name: string) => CarMeshRole | null
}

const MINI_ROOF_HEX = "#f5f5f2"
const MINI_MIRROR_CAP_HEX = "#f5f5f2"

function isMiniJcwBranding(name: string) {
  const n = name.toLowerCase()
  return (
    n.includes("mini+john") ||
    n.includes("john+cooper") ||
    n.includes("cooper+works") ||
    n.includes("emblem_bod") ||
    n.includes("badge_body")
  )
}

export function classifyMiniClubmanMesh(name: string): CarMeshRole | null {
  const n = name.toLowerCase()
  if (n.includes("(lines)")) return "default"
  if (isMiniJcwBranding(name)) return "hidden"
  if (n.includes("glass_gl02") || n.includes("glass_gl03") || n.includes("detail_gla")) return "hidden"
  if (
    n.includes("chrome_2_t") ||
    n.includes("chrome_2_h") ||
    n.includes("plastic2_h")
  ) {
    return "roof"
  }
  if (n.includes("body_mir")) return "mirrorCap"
  if (
    n.includes("black_body") ||
    n.includes("black_hood") ||
    n.includes("body_body") ||
    n.includes("body_bum") ||
    n.includes("body_hooda") ||
    n.includes("chrome_bod") ||
    n.includes("chrome_bum") ||
    n.includes("chrome_hoo") ||
    n.includes("chrome_2_b") ||
    n.includes("chrome_202") ||
    n.includes("chrome_203") ||
    n.includes("matte_co") ||
    n.includes("plastic2_b") ||
    n.includes("plastic2_m") ||
    n.includes("plastic202") ||
    n.includes("plastic203") ||
    n.includes("frame_body") ||
    n.includes("frame_bump") ||
    n.includes("frame_bu01") ||
    n.includes("misc_body")
  ) {
    return "body"
  }
  if (n.includes("glass_gl01") || n.includes("glass_glas") || n.includes("black_glas")) return "glass"
  if (n.includes("chrome_mir") || (n.startsWith("chrome_") && !n.includes("chrome_2"))) return "chrome"
  return null
}

/** Mini GLB parts that should keep studio styling instead of Mazda mesh rules. */
export function classifyMiniClubmanFallback(name: string): CarMeshRole {
  const n = name.toLowerCase()
  if (isMiniJcwBranding(name)) return "hidden"
  if (n.includes("glass_gl02") || n.includes("glass_gl03") || n.includes("detail_gla")) return "hidden"
  if (n.includes("glass_gl01") || (n.includes("glass") && !n.includes("glass_gl0"))) return "glass"
  if (n.includes("reverse_li")) return "tailLampLens"
  if (n.includes("projector") || n.includes("reflector") || n.includes("reflecto")) return "headLampLens"
  if (n.includes("plastic2_h")) return "roof"
  if (
    n.includes("matte_co") ||
    n.includes("plastic2_b") ||
    n.includes("plastic2_m") ||
    n.includes("plastic202") ||
    n.includes("plastic203") ||
    n.includes("frame_bump") ||
    n.includes("chrome_202") ||
    n.includes("chrome_203")
  ) {
    return "body"
  }
  if (n.includes("tire") || n.includes("rubber") || n.includes("wheel")) return "tire"
  if (n.startsWith("chrome_") || (n.includes("emblem") && !n.includes("emblem_bod"))) return "chrome"
  if (n.includes("detail_")) return "chrome"
  return "default"
}

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
  if (n.includes("tire") || n.includes("tyre") || n.includes("wheel_rubber")) return "tire"
  if (n.includes("wheel") && (n.includes("rim") || n.includes("alloy"))) return "rim"
  if (/^mazda/.test(n)) return "chrome"
  if (
    n.includes("body") ||
    n.includes("roof") ||
    n.includes("door") ||
    n.includes("fender") ||
    n.includes("hood") ||
    n.includes("bonnet") ||
    (n.includes("bumper") && !n.includes("chrome"))
  ) {
    return "body"
  }
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
  if (mat instanceof THREE.MeshStandardMaterial) {
    return mat
  }
  return null
}

function toStudioMaterial(raw: THREE.Material): THREE.MeshStandardMaterial {
  const std = asStandard(raw)
  if (std) return std.clone()
  const m = new THREE.MeshStandardMaterial()
  const anyMat = raw as THREE.MeshStandardMaterial
  if (anyMat.color) m.color.copy(anyMat.color)
  if (anyMat.map) m.map = anyMat.map
  if (anyMat.emissive) m.emissive.copy(anyMat.emissive)
  m.metalness = typeof anyMat.metalness === "number" ? anyMat.metalness : 0.35
  m.roughness = typeof anyMat.roughness === "number" ? anyMat.roughness : 0.45
  m.transparent = Boolean(anyMat.transparent)
  m.opacity = typeof anyMat.opacity === "number" ? anyMat.opacity : 1
  return m
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
  const cloned = src.map((raw) => toStudioMaterial(raw))
  mesh.material = cloned.length === 1 ? cloned[0]! : cloned
  return cloned
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

function styleMiniHeadLampLens(mat: THREE.MeshStandardMaterial) {
  clearMaps(mat)
  mat.color.setHex(0xffe7a3)
  mat.emissive.setHex(0xffa948)
  mat.emissiveIntensity = 0.48
  mat.metalness = 0.03
  mat.roughness = 0.11
  mat.transparent = true
  mat.opacity = 0.78
  mat.depthWrite = false
  mat.side = THREE.DoubleSide
  mat.envMapIntensity = 1.2
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

function existingStandardMats(mesh: THREE.Mesh): THREE.MeshStandardMaterial[] {
  const src = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return src.filter((m): m is THREE.MeshStandardMaterial => m instanceof THREE.MeshStandardMaterial)
}

function miniResolvedRole(name: string): CarMeshRole {
  return classifyMiniClubmanMesh(name) ?? classifyMiniClubmanFallback(name)
}

/**
 * Door shells and most roof sheet metal live in unnamed `Groupe#` meshes — paint by height/position.
 */
function refineMiniClubmanSpatialPaint(
  root: THREE.Object3D,
  paintMats: THREE.MeshStandardMaterial[],
  roofMats: THREE.MeshStandardMaterial[],
  bodyColor: number | null,
  roofColor: number | null,
) {
  const meshes: THREE.Mesh[] = []
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.visible) meshes.push(o)
  })

  const shell = new THREE.Box3()
  for (const m of meshes) {
    const role = miniResolvedRole(m.name)
    if (
      role === "hidden" ||
      role === "glass" ||
      role === "rearGlass" ||
      role === "headLampLens" ||
      role === "tailLampLens" ||
      role === "lampLens" ||
      role === "tire" ||
      role === "rim" ||
      role === "caliper" ||
      role === "brakeDisc" ||
      role === "chrome" ||
      role === "mirror" ||
      role === "mirrorCap" ||
      role === "interior" ||
      role === "glossMetal" ||
      role === "blackPlastic"
    ) {
      continue
    }
    shell.union(new THREE.Box3().setFromObject(m))
  }

  const size = shell.getSize(new THREE.Vector3())
  if (size.length() < 0.05) return

  const roofMinY = shell.max.y - size.y * 0.3
  const doorMinY = shell.min.y + size.y * 0.26
  const doorMaxY = shell.max.y - size.y * 0.24
  const lowMaxY = shell.min.y + size.y * 0.24

  let frontZ = shell.max.z
  for (const m of meshes) {
    const nn = m.name.toLowerCase()
    if (!nn.includes("body_bum") && !nn.includes("chrome_bum")) continue
    const cz = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).z
    const midZ = (shell.min.z + shell.max.z) * 0.5
    frontZ = cz >= midZ ? shell.max.z : shell.min.z
    break
  }

  for (const m of meshes) {
    const role = miniResolvedRole(m.name)
    const paintableDefault = role === "default"
    const repaintRoof = role === "roof"
    if (!paintableDefault && !repaintRoof) continue

    const box = new THREE.Box3().setFromObject(m)
    const center = box.getCenter(new THREE.Vector3())
    const piece = box.getSize(new THREE.Vector3())
  // Skip small trims, bolts, lamp bits — only sheet-metal-sized shells.
    const maxPiece = Math.max(piece.x, piece.y, piece.z)
    const minPiece = Math.min(piece.x, piece.y, piece.z)
    if (maxPiece < 0.08 || minPiece < 0.004) continue

    const roofCap =
      center.y >= roofMinY &&
      piece.y < size.y * 0.58 &&
      maxPiece > size.x * 0.08
    const wideTop = roofCap
    const onFlank =
      Math.abs(center.x) > size.x * 0.18 ||
      (Math.abs(center.z) > size.z * 0.18 && center.y > shell.min.y + size.y * 0.18)
    const doorBand = center.y >= doorMinY && center.y <= doorMaxY && onFlank && maxPiece > size.x * 0.06
    const atFront = Math.abs(center.z - frontZ) < size.z * 0.22
    const frontBumper = center.y <= lowMaxY && atFront && maxPiece > size.x * 0.05

    for (const mat of existingStandardMats(m)) {
      if (mat.transparent && mat.opacity < 0.92) continue
      styleBodyBase(mat)
      if ((repaintRoof || (paintableDefault && wideTop)) && roofColor != null) {
        mat.color.setHex(roofColor)
        if (!roofMats.includes(mat)) roofMats.push(mat)
      } else if (paintableDefault && (doorBand || frontBumper) && bodyColor != null) {
        mat.color.setHex(bodyColor)
        if (!paintMats.includes(mat)) paintMats.push(mat)
      }
    }
  }
}

/** Untextured SketchUp export colors are often near-black — lift them for the studio viewer. */
function styleStockPreserve(mat: THREE.MeshStandardMaterial) {
  if (mat.map) {
    mat.color.setHex(0xffffff)
    mat.envMapIntensity = Math.max(mat.envMapIntensity, 1.1)
    return
  }
  const lum = mat.color.r + mat.color.g + mat.color.b
  if (lum < 0.22) {
    mat.color.setRGB(0.45, 0.45, 0.48)
    mat.metalness = 0.5
    mat.roughness = 0.42
    mat.envMapIntensity = 1.15
    return
  }
  mat.envMapIntensity = Math.max(mat.envMapIntensity, 1)
}

export function applyCarVisualDetails(
  root: THREE.Object3D,
  bodyColorHex: string,
  opts?: CarVisualOptions,
): CarVisualPaintResult {
  const paintMats: THREE.MeshStandardMaterial[] = []
  const roofMats: THREE.MeshStandardMaterial[] = []
  const mirrorCapMats: THREE.MeshStandardMaterial[] = []
  const interiorMats: THREE.MeshStandardMaterial[] = []
  const bodyColor = parseCarBodyPaintHex(bodyColorHex)
  const roofColor = parseCarBodyPaintHex(opts?.roofColorHex ?? MINI_ROOF_HEX)
  const mirrorCapColor = parseCarBodyPaintHex(opts?.mirrorCapColorHex ?? MINI_MIRROR_CAP_HEX)
  const miniPaint = Boolean(opts?.classify)

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    if (isPlateMeshTree(obj)) return
    if (obj.name.toLowerCase().includes("(lines)")) return
    obj.castShadow = true
    obj.receiveShadow = true
    const role = opts?.classify?.(obj.name) ?? classifyCarMesh(obj.name)
    if (role === "hidden") {
      obj.visible = false
      return
    }
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
        case "roof":
          styleBodyBase(mat)
          roofMats.push(mat)
          break
        case "mirrorCap":
          styleBodyBase(mat)
          mirrorCapMats.push(mat)
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
        case "headLampLens":
          if (miniPaint) styleMiniHeadLampLens(mat)
          else styleLampLens(mat)
          break
        case "tailLampLens":
          styleTailLampLens(mat)
          break
        default:
          if (miniPaint) {
            // Spatial pass assigns body/roof tint; keep untextured trim readable until then.
            styleStockPreserve(mat)
          } else stylePaletteDefault(mat)
          break
      }
    }
  })

  if (miniPaint) {
    refineMiniClubmanSpatialPaint(
      root,
      paintMats,
      roofMats,
      bodyColor,
      roofColor,
    )
  }

  if (bodyColor != null) {
    const color = new THREE.Color(bodyColor)
    paintMats.forEach((m) => m.color.copy(color))
    if (!miniPaint) interiorMats.forEach((m) => m.color.copy(color))
  } else {
    const black = new THREE.Color(0x0a0a0c)
    interiorMats.forEach((m) => m.color.copy(black))
  }
  if (miniPaint && roofColor != null) {
    const color = new THREE.Color(roofColor)
    roofMats.forEach((m) => m.color.copy(color))
  }
  if (miniPaint && mirrorCapColor != null) {
    const color = new THREE.Color(mirrorCapColor)
    mirrorCapMats.forEach((m) => m.color.copy(color))
  }

  return { paintMats, roofMats, mirrorCapMats, interiorMats }
}

export function applyBodyColorToPaint(paintMats: THREE.MeshStandardMaterial[], hex: string) {
  const c = parseCarBodyPaintHex(hex)
  if (c == null) return
  const color = new THREE.Color(c)
  paintMats.forEach((m) => m.color.copy(color))
}

export function applyMiniClubmanPaint(
  mats: Pick<CarVisualPaintResult, "paintMats" | "roofMats" | "mirrorCapMats" | "interiorMats">,
  bodyColorHex: string,
) {
  applyBodyColorToPaint(mats.paintMats, bodyColorHex)
  applyBodyColorToPaint(mats.roofMats, MINI_ROOF_HEX)
  applyBodyColorToPaint(mats.mirrorCapMats, MINI_MIRROR_CAP_HEX)
}