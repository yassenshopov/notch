import * as THREE from "three"
import { APARTMENT_PROP_SCALE, propM, WALL_THICKNESS_M, type SpaceSpec } from "./apartment-floor-plan"
import { livingEastWallTvCenterZ, LIVING_TV_STAND_ALONG_WALL_M } from "./apartment-living-layout"

const FLOOR_THICKNESS_M = propM(0.08)
const EAST_INSET_M = propM(0.08)

/** Low wide console on east wall — between balcony door (north) and TV (south). */
function vignetteCenterZ(rect: SpaceSpec["rect"]): number {
  const tvNorthZ = livingEastWallTvCenterZ(rect) - LIVING_TV_STAND_ALONG_WALL_M / 2
  const northLimit = rect.z + WALL_THICKNESS_M + propM(0.52)
  const southLimit = tvNorthZ - propM(0.22)
  return (northLimit + southLimit) * 0.5
}

function eastLaneCenterX(rect: SpaceSpec["rect"], depthM: number): number {
  return rect.x + rect.w - EAST_INSET_M - depthM / 2
}

function paintingTexture(): THREE.CanvasTexture {
  const w = 512
  const h = 360
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const grd = ctx.createLinearGradient(0, 0, w, h)
    grd.addColorStop(0, "#e8d4b8")
    grd.addColorStop(0.45, "#c97b4a")
    grd.addColorStop(1, "#3d4f6f")
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = "rgba(40,32,26,0.35)"
    ctx.beginPath()
    ctx.ellipse(w * 0.62, h * 0.38, w * 0.22, h * 0.18, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "rgba(255,248,236,0.5)"
    ctx.fillRect(w * 0.08, h * 0.12, w * 0.35, h * 0.08)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function addMonstera(root: THREE.Group, x: number, z: number) {
  const potMat = new THREE.MeshStandardMaterial({ color: 0x6b6258, roughness: 0.88, metalness: 0.02 })
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.95, metalness: 0 })
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2f7d45,
    roughness: 0.72,
    metalness: 0.03,
    side: THREE.DoubleSide,
  })
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3f6b38, roughness: 0.8, metalness: 0.02 })

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(propM(0.26), propM(0.22), propM(0.36), 20),
    potMat,
  )
  pot.position.set(x, FLOOR_THICKNESS_M + propM(0.18), z)
  root.add(pot)
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(propM(0.22), propM(0.22), propM(0.04), 20), soilMat)
  soil.position.set(x, FLOOR_THICKNESS_M + propM(0.34), z)
  root.add(soil)

  const leafShape = new THREE.Shape()
  leafShape.moveTo(0, 0)
  leafShape.lineTo(0.38, 0.22)
  leafShape.lineTo(0.34, 0.55)
  leafShape.lineTo(0.08, 0.62)
  leafShape.lineTo(-0.12, 0.42)
  leafShape.lineTo(0, 0)
  const leafGeo = new THREE.ShapeGeometry(leafShape)
  leafGeo.scale(1.15, 1.15, 1)

  const stems: [number, number, number, number][] = [
    [0, 0.52, 0, 0.15],
    [0.08, 0.72, 0.12, -0.35],
    [-0.1, 0.88, -0.15, 0.28],
    [0.12, 1.05, 0.2, -0.55],
    [0, 1.22, -0.08, 0.42],
    [-0.14, 0.95, -0.22, 0.62],
  ]
  for (const [lx, ly, lz, rotY] of stems) {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(propM(0.015), propM(0.02), propM(0.42), 8),
      stemMat,
    )
    stem.position.set(x + lx * propM(0.25), FLOOR_THICKNESS_M + propM(0.38) + ly * propM(0.55), z + lz * propM(0.25))
    stem.rotation.set(0.2, rotY, 0.08)
    root.add(stem)
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    leaf.position.copy(stem.position).add(new THREE.Vector3(0, propM(0.28), 0))
    leaf.rotation.set(-0.55, rotY, 0.1)
    leaf.scale.setScalar(APARTMENT_PROP_SCALE)
    root.add(leaf)
  }
}

export function buildEastDoorTvVignette(root: THREE.Group, living: SpaceSpec) {
  const { rect } = living
  const shelfAlongZ = propM(1.42)
  const shelfDepth = propM(0.5)
  const bodyH = propM(0.78)
  const topThick = propM(0.038)
  const bodyGrey = new THREE.MeshStandardMaterial({
    color: 0xa8aeb4,
    roughness: 0.48,
    metalness: 0.28,
  })
  const topWood = new THREE.MeshStandardMaterial({
    color: 0x3c2a1e,
    roughness: 0.82,
    metalness: 0.04,
  })

  const cx = eastLaneCenterX(rect, shelfDepth)
  const cz = vignetteCenterZ(rect)
  const bodyY = FLOOR_THICKNESS_M + bodyH / 2
  const body = new THREE.Mesh(new THREE.BoxGeometry(shelfDepth, bodyH, shelfAlongZ), bodyGrey)
  body.position.set(cx, bodyY, cz)
  root.add(body)

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(shelfDepth + propM(0.04), topThick, shelfAlongZ + propM(0.06)),
    topWood,
  )
  top.position.set(cx, FLOOR_THICKNESS_M + bodyH + topThick / 2, cz)
  root.add(top)

  const topY = FLOOR_THICKNESS_M + bodyH + topThick
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.55, metalness: 0.08 })
  const artMat = new THREE.MeshStandardMaterial({
    map: paintingTexture(),
    roughness: 0.65,
    metalness: 0.02,
  })
  const frameW = propM(0.92)
  const frameH = propM(0.68)
  const frameD = propM(0.035)
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(frameD, frameH + propM(0.08), frameW + propM(0.08)),
    frameMat,
  )
  frame.position.set(
    cx - shelfDepth / 2 - frameD / 2 + propM(0.01),
    topY + frameH / 2 + propM(0.04),
    cz - shelfAlongZ * 0.12,
  )
  frame.rotation.y = 0.08
  root.add(frame)
  const canvas = new THREE.Mesh(new THREE.BoxGeometry(propM(0.012), frameH, frameW), artMat)
  canvas.position.copy(frame.position)
  canvas.position.x += propM(0.02)
  canvas.rotation.copy(frame.rotation)
  root.add(canvas)

  const plantX = cx - shelfDepth / 2 - propM(0.34)
  const plantZ = cz + shelfAlongZ * 0.28
  addMonstera(root, plantX, plantZ)
}