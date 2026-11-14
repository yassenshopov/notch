import * as THREE from "three"

const PLATE_W_M = 0.52
const PLATE_H_M = 0.11
const PLATE_CANVAS_W = 520
const PLATE_CANVAS_H = 110
const PLATE_INSET_M = 0.014

export type RegistrationPlates = {
  setPlate: (text: string) => void
  reposition: () => void
  dispose: () => void
}

function formatPlateText(raw: string) {
  const normalized = raw.replace(/\s+/g, "").toUpperCase()
  if (!normalized) return ""
  const m = normalized.match(/^([A-Z]{1,2})(\d{4})([A-Z]{0,2})$/)
  if (m) return `${m[1]} ${m[2]} ${m[3]}`.trim()
  return normalized
}

function drawEuStar(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const px = x + Math.cos(a) * r
    const py = y + Math.sin(a) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

function drawEuBlueBand(ctx: CanvasRenderingContext2D, stripW: number, height: number) {
  ctx.fillStyle = "#003399"
  ctx.fillRect(0, 0, stripW, height)

  const cx = stripW / 2
  const cy = height * 0.36
  const ring = 20
  ctx.fillStyle = "#ffcc00"
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    drawEuStar(ctx, cx + Math.cos(a) * ring, cy + Math.sin(a) * ring, 4.2, 1.8)
  }

  ctx.fillStyle = "#ffffff"
  ctx.font = "bold 20px system-ui,Segoe UI,Arial,sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("BG", cx, height - 24)
}

function drawPlateTexture(text: string, mirror = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = PLATE_CANVAS_W
  canvas.height = PLATE_CANVAS_H
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    const empty = new THREE.CanvasTexture(canvas)
    empty.colorSpace = THREE.SRGBColorSpace
    return empty
  }

  ctx.save()
  if (mirror) {
    ctx.translate(PLATE_CANVAS_W, 0)
    ctx.scale(-1, 1)
  }

  ctx.fillStyle = "#f5f5f2"
  ctx.fillRect(0, 0, PLATE_CANVAS_W, PLATE_CANVAS_H)

  const stripW = 78
  drawEuBlueBand(ctx, stripW, PLATE_CANVAS_H)

  const label = formatPlateText(text)
  ctx.fillStyle = "#111111"
  ctx.font = "bold 54px ui-monospace,SFMono-Regular,Consolas,monospace"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(label, stripW + (PLATE_CANVAS_W - stripW) / 2, PLATE_CANVAS_H / 2 + 2)

  ctx.strokeStyle = "rgba(0,0,0,0.14)"
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, PLATE_CANVAS_W - 3, PLATE_CANVAS_H - 3)
  ctx.restore()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function carRig(root: THREE.Object3D) {
  return root.getObjectByName("car-rig") ?? root
}

function localBounds(rig: THREE.Object3D) {
  rig.updateMatrixWorld(true)
  const inv = rig.matrixWorld.clone().invert()
  const box = new THREE.Box3()
  const tmp = new THREE.Box3()
  rig.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    if (obj.name === "plate-front" || obj.name === "plate-rear") return
    const geom = obj.geometry
    if (!geom.boundingBox) geom.computeBoundingBox()
    tmp.copy(geom.boundingBox!)
    tmp.applyMatrix4(obj.matrixWorld)
    tmp.applyMatrix4(inv)
    box.union(tmp)
  })
  if (box.isEmpty()) box.setFromObject(rig)
  return box
}

function lengthAxis(box: THREE.Box3): "x" | "z" {
  const size = box.getSize(new THREE.Vector3())
  return size.z >= size.x ? "z" : "x"
}

function makePlateMesh(tex: THREE.CanvasTexture, side: "front" | "rear") {
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLATE_W_M, PLATE_H_M), mat)
  mesh.name = side === "front" ? "plate-front" : "plate-rear"
  mesh.renderOrder = 60
  return mesh
}

function isBuiltinPlateMesh(name: string) {
  const n = name.toLowerCase()
  return n.includes("licplate") || n.includes("register_plate")
}

function isFrontPlateMesh(name: string) {
  const n = name.toLowerCase()
  return n.includes("licplate01") || /register_plate_1(_|$)/.test(n)
}

function isRearPlateMesh(name: string) {
  const n = name.toLowerCase()
  return n.includes("licplate02") || n.includes("register_plate_02")
}

function findPlateAnchors(rig: THREE.Object3D) {
  let front: THREE.Mesh | null = null
  let rear: THREE.Mesh | null = null
  rig.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const n = obj.name
    if (isFrontPlateMesh(n)) front = obj
    if (isRearPlateMesh(n)) rear = obj
  })
  return { front, rear }
}

function hideBuiltinLicenseMeshes(rig: THREE.Object3D) {
  rig.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    if (isBuiltinPlateMesh(obj.name)) obj.visible = false
  })
}

function alignPlateToAnchor(plate: THREE.Mesh, anchor: THREE.Mesh, rig: THREE.Object3D, lift = 0.018) {
  rig.updateMatrixWorld(true)
  anchor.updateMatrixWorld(true)

  const anchorBox = new THREE.Box3().setFromObject(anchor)
  const anchorSize = anchorBox.getSize(new THREE.Vector3())
  const fitW = Math.max(anchorSize.x, anchorSize.z, 0.28)
  const fitH = Math.max(anchorSize.y, 0.06)
  const sx = fitW / PLATE_W_M
  const sy = fitH / PLATE_H_M
  const s = Math.min(sx, sy, 1.15)

  const worldPos = new THREE.Vector3()
  const worldQuat = new THREE.Quaternion()
  anchor.getWorldPosition(worldPos)
  anchor.getWorldQuaternion(worldQuat)
  const outward = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat).normalize()
  worldPos.addScaledVector(outward, lift)

  rig.worldToLocal(worldPos)
  const rigQuat = new THREE.Quaternion()
  rig.getWorldQuaternion(rigQuat)
  plate.quaternion.copy(rigQuat.invert().multiply(worldQuat))
  plate.position.copy(worldPos)
  plate.scale.set(s, s, 1)
}

function placePlatesFallback(front: THREE.Mesh, rear: THREE.Mesh, rig: THREE.Object3D) {
  const box = localBounds(rig)
  const size = box.getSize(new THREE.Vector3())
  const axis = lengthAxis(box)
  const y = box.min.y + Math.min(0.4, size.y * 0.27)
  const xMid = (box.min.x + box.max.x) / 2
  const zMid = (box.min.z + box.max.z) / 2

  if (axis === "z") {
    front.position.set(xMid, y, box.max.z + PLATE_INSET_M)
    front.rotation.set(0, 0, 0)
    rear.position.set(xMid, y, box.min.z - PLATE_INSET_M)
    rear.rotation.set(0, Math.PI, 0)
  } else {
    front.position.set(box.max.x + PLATE_INSET_M, y, zMid)
    front.rotation.set(0, Math.PI / 2, 0)
    rear.position.set(box.min.x - PLATE_INSET_M, y, zMid)
    rear.rotation.set(0, -Math.PI / 2, 0)
  }
}

function placePlates(front: THREE.Mesh, rear: THREE.Mesh, rig: THREE.Object3D) {
  hideBuiltinLicenseMeshes(rig)
  const anchors = findPlateAnchors(rig)

  if (!anchors.front || !anchors.rear) placePlatesFallback(front, rear, rig)
  if (anchors.front) alignPlateToAnchor(front, anchors.front, rig)
  if (anchors.rear) alignPlateToAnchor(rear, anchors.rear, rig)
}

export function hideModelLicensePlates(root: THREE.Object3D) {
  hideBuiltinLicenseMeshes(carRig(root))
}

export function attachRegistrationPlates(root: THREE.Object3D, plateText: string): RegistrationPlates {
  const rig = carRig(root)

  const anchorsAtLoad = findPlateAnchors(rig)
  let frontTex = drawPlateTexture(plateText)
  let rearTex = drawPlateTexture(plateText, !anchorsAtLoad.rear)
  const front = makePlateMesh(frontTex, "front")
  const rear = makePlateMesh(rearTex, "rear")
  rig.add(front, rear)

  const reposition = () => placePlates(front, rear, rig)

  reposition()

  return {
    reposition,
    setPlate(text: string) {
      frontTex.dispose()
      rearTex.dispose()
      const anchors = findPlateAnchors(rig)
      frontTex = drawPlateTexture(text)
      rearTex = drawPlateTexture(text, !anchors.rear)
      ;(front.material as THREE.MeshBasicMaterial).map = frontTex
      ;(rear.material as THREE.MeshBasicMaterial).map = rearTex
      front.material.needsUpdate = true
      rear.material.needsUpdate = true
      reposition()
    },
    dispose() {
      front.geometry.dispose()
      rear.geometry.dispose()
      ;(front.material as THREE.Material).dispose()
      ;(rear.material as THREE.Material).dispose()
      frontTex.dispose()
      rearTex.dispose()
      rig.remove(front)
      rig.remove(rear)
    },
  }
}