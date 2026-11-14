import * as THREE from "three"

const PLATE_W_M = 0.52
const PLATE_H_M = 0.11
const PLATE_CANVAS_W = 520
const PLATE_CANVAS_H = 110

const HUMSTER_FRONT = "LicPlate01"
const HUMSTER_REAR = "LicPlate02"
const DECAL_FRONT = "notch-plate-surface-front"
const DECAL_REAR = "notch-plate-surface-rear"

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

function humsterPlateRoot(rig: THREE.Object3D, side: "front" | "rear") {
  const exact = side === "front" ? HUMSTER_FRONT : HUMSTER_REAR
  const fromName = rig.getObjectByName(exact)
  if (fromName) return fromName
  const want = exact.toLowerCase()
  let found: THREE.Object3D | null = null
  rig.traverse((obj) => {
    if (obj.name.toLowerCase() === want) found = obj
  })
  return found
}

function localBoundsForRoot(root: THREE.Object3D, skipNames: Set<string>) {
  const box = new THREE.Box3()
  const tmp = new THREE.Box3()
  root.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    if (skipNames.has(obj.name)) return
    const geom = obj.geometry
    if (!geom.boundingBox) geom.computeBoundingBox()
    tmp.copy(geom.boundingBox!)
    tmp.applyMatrix4(obj.matrixWorld)
    tmp.applyMatrix4(inv)
    box.union(tmp)
  })
  return box
}

function makePlateMaterial(tex: THREE.CanvasTexture) {
  return new THREE.MeshBasicMaterial({
    map: tex,
    toneMapped: false,
    transparent: false,
    opacity: 1,
    alphaTest: 0,
    side: THREE.FrontSide,
    depthWrite: true,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -6,
    polygonOffsetUnits: -6,
  })
}

function fitDecalOnPlateRoot(root: THREE.Object3D, tex: THREE.CanvasTexture, decalName: string) {
  root.visible = true
  root.updateMatrixWorld(true)

  const skip = new Set([decalName])
  const bounds = localBoundsForRoot(root, skip)
  if (bounds.isEmpty()) return null

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    if (obj.name === decalName) return
    obj.visible = false
  })

  let decal = root.getObjectByName(decalName) as THREE.Mesh | undefined
  if (decal) {
    decal.geometry.dispose()
    ;(decal.material as THREE.Material).dispose()
    root.remove(decal)
  }

  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  decal = new THREE.Mesh(new THREE.PlaneGeometry(PLATE_W_M, PLATE_H_M), makePlateMaterial(tex))
  decal.name = decalName
  decal.renderOrder = 120
  decal.frustumCulled = false
  root.add(decal)

  const dims = [
    { axis: "x" as const, v: size.x },
    { axis: "y" as const, v: size.y },
    { axis: "z" as const, v: size.z },
  ].sort((a, b) => a.v - b.v)
  const thin = dims[0]

  decal.position.copy(center)
  decal.rotation.set(0, 0, 0)

  const faceW = thin.axis === "x" ? Math.max(size.y, size.z) : thin.axis === "y" ? Math.max(size.x, size.z) : Math.max(size.x, size.y)
  const faceH =
    thin.axis === "x" ? Math.min(size.y, size.z) : thin.axis === "y" ? Math.min(size.x, size.z) : Math.min(size.x, size.y)
  const s = Math.min(Math.max(faceW / PLATE_W_M, faceH / PLATE_H_M), 1.35)

  if (thin.axis === "y") decal.rotation.x = -Math.PI / 2
  else if (thin.axis === "x") decal.rotation.y = Math.PI / 2

  const lift = Math.max(thin.v * 0.42, 0.002)
  if (thin.axis === "z") decal.position.z += lift * Math.sign(size.z || 1)
  else if (thin.axis === "y") decal.position.y += lift * Math.sign(size.y || 1)
  else decal.position.x += lift * Math.sign(size.x || 1)

  decal.scale.set(s, s, 1)
  decal.visible = true
  return decal
}

function hideDuplicateRegisterMeshes(rig: THREE.Object3D) {
  rig.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const n = obj.name.toLowerCase()
    if (n.includes("register_plate")) obj.visible = false
  })
}

type PlateRun = {
  textures: THREE.CanvasTexture[]
  decals: THREE.Mesh[]
}

function applyHumsterPlates(rig: THREE.Object3D, text: string, prev: PlateRun | null): PlateRun {
  for (const tex of prev?.textures ?? []) tex.dispose()
  for (const decal of prev?.decals ?? []) {
    decal.geometry.dispose()
    ;(decal.material as THREE.Material).dispose()
    decal.parent?.remove(decal)
  }

  const textures: THREE.CanvasTexture[] = []
  const decals: THREE.Mesh[] = []

  const frontRoot = humsterPlateRoot(rig, "front")
  const rearRoot = humsterPlateRoot(rig, "rear")

  if (frontRoot) {
    const tex = drawPlateTexture(text)
    textures.push(tex)
    const decal = fitDecalOnPlateRoot(frontRoot, tex, DECAL_FRONT)
    if (decal) decals.push(decal)
  }
  if (rearRoot) {
    const tex = drawPlateTexture(text, true)
    textures.push(tex)
    const decal = fitDecalOnPlateRoot(rearRoot, tex, DECAL_REAR)
    if (decal) decals.push(decal)
  }

  hideDuplicateRegisterMeshes(rig)
  rig.updateMatrixWorld(true)
  return { textures, decals }
}

export function hideModelLicensePlates(root: THREE.Object3D) {
  hideDuplicateRegisterMeshes(carRig(root))
}

export function attachRegistrationPlates(root: THREE.Object3D, plateText: string): RegistrationPlates {
  const rig = carRig(root)
  let run: PlateRun = { textures: [], decals: [] }
  run = applyHumsterPlates(rig, plateText, run)

  return {
    reposition() {
      rig.updateMatrixWorld(true)
    },
    setPlate(text: string) {
      run = applyHumsterPlates(rig, text, run)
    },
    dispose() {
      for (const tex of run.textures) tex.dispose()
      for (const decal of run.decals) {
        decal.geometry.dispose()
        ;(decal.material as THREE.Material).dispose()
        decal.parent?.remove(decal)
      }
      run = { textures: [], decals: [] }
    },
  }
}