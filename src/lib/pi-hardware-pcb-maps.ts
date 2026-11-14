import * as THREE from "three"

const PCB_L = 85
const PCB_W = 56
const CORNER_R = 3

export type PcbMapSet = {
  color: THREE.CanvasTexture
  /** Height field used as bumpMap on the solder mask */
  height: THREE.CanvasTexture
  roughness: THREE.CanvasTexture
  metalness: THREE.CanvasTexture
  ao: THREE.CanvasTexture
  dispose: () => void
}

function mmX(mm: number, w: number) {
  return (mm / PCB_L) * w
}

function mmY(mm: number, h: number) {
  return h - (mm / PCB_W) * h
}

function clipRoundedBoard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sx = w / PCB_L
  const sy = h / PCB_W
  const r = CORNER_R * Math.min(sx, sy)
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(w - r, 0)
  ctx.quadraticCurveTo(w, 0, w, r)
  ctx.lineTo(w, h - r)
  ctx.quadraticCurveTo(w, h, w - r, h)
  ctx.lineTo(r, h)
  ctx.quadraticCurveTo(0, h, 0, h - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.clip()
}

function trace(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pts: [number, number][],
  widthMm = 0.35,
) {
  if (pts.length < 2) return
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.lineWidth = Math.max(1, (widthMm / PCB_L) * w)
  ctx.beginPath()
  ctx.moveTo(mmX(pts[0][0], w), mmY(pts[0][1], h))
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(mmX(pts[i][0], w), mmY(pts[i][1], h))
  }
  ctx.stroke()
}

function pad(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, dMm = 1.1) {
  const r = (dMm / PCB_L) * w * 0.5
  ctx.beginPath()
  ctx.arc(mmX(x, w), mmY(y, h), r, 0, Math.PI * 2)
  ctx.fill()
}

function noiseFill(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n))
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n))
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)
}

export function createPi4PcbMaps(): PcbMapSet {
  const w = 2048
  const h = Math.round((PCB_W / PCB_L) * w)

  const colorC = document.createElement("canvas")
  colorC.width = w
  colorC.height = h
  const ctx = colorC.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("canvas_2d")

  ctx.save()
  clipRoundedBoard(ctx, w, h)
  ctx.fillStyle = "#1a6b3c"
  ctx.fillRect(0, 0, w, h)

  const copper = "rgba(196, 125, 54, 0.92)"
  const copperFine = "rgba(180, 115, 48, 0.85)"
  ctx.strokeStyle = copper
  ctx.fillStyle = "#d4a85a"

  // SoC ↔ RAM / SDIO
  trace(ctx, w, h, [
    [32, 32],
    [42, 32],
    [48, 28],
    [52, 22],
  ])
  trace(ctx, w, h, [
    [30, 34],
    [38, 38],
    [48, 40],
    [58, 38],
  ], 0.28)
  // SD slot
  trace(ctx, w, h, [
    [8, 22],
    [14, 22],
    [22, 28],
    [30, 32],
  ], 0.3)
  trace(ctx, w, h, [
    [10, 26],
    [18, 30],
    [28, 32],
  ], 0.25)
  // USB-C power
  ctx.strokeStyle = copperFine
  trace(ctx, w, h, [
    [11, 4],
    [16, 8],
    [22, 14],
    [28, 22],
  ], 0.45)
  trace(ctx, w, h, [
    [14, 4],
    [20, 12],
    [26, 20],
  ], 0.35)
  // USB / Ethernet differential bundles
  ctx.strokeStyle = copper
  for (const y0 of [9, 27, 46]) {
    trace(ctx, w, h, [
      [62, y0],
      [54, y0],
      [48, y0 - 1],
      [40, y0 - 2],
      [34, y0],
    ], 0.32)
    trace(ctx, w, h, [
      [62, y0 + 0.9],
      [54, y0 + 0.9],
      [46, y0 + 0.5],
    ], 0.28)
  }
  // GPIO fanout
  for (let i = 0; i < 8; i++) {
    const gx = 7 + i * 6
    trace(ctx, w, h, [
      [gx, 50],
      [gx + 1, 44],
      [32 + i * 0.5, 36],
    ], 0.22)
  }
  // HDMI pairs
  trace(ctx, w, h, [[24, 3], [28, 10], [32, 18]], 0.26)
  trace(ctx, w, h, [[38, 3], [36, 11], [34, 19]], 0.26)
  // Camera / display FPC
  trace(ctx, w, h, [[4, 28], [10, 32], [20, 34]], 0.24)
  trace(ctx, w, h, [[4, 22], [12, 26], [22, 30]], 0.24)

  // Ground pour hatch
  ctx.strokeStyle = "rgba(140, 90, 40, 0.22)"
  ctx.lineWidth = 1
  for (let i = 0; i < 28; i++) {
    const y = (i / 28) * h
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y + w * 0.08)
    ctx.stroke()
  }

  // Exposed pads
  ctx.fillStyle = "#e2c17a"
  const gpioY1 = 50.2
  const gpioY2 = 47.66
  for (let col = 0; col < 20; col++) {
    pad(ctx, w, h, 7.15 + col * 2.54, gpioY1, 1)
    pad(ctx, w, h, 7.15 + col * 2.54, gpioY2, 1)
  }
  for (const [x, y] of [
    [32, 4],
    [35, 4],
    [32, 52],
    [58, 49],
    [11, 4],
    [40, 4],
  ]) {
    pad(ctx, w, h, x, y, 0.9)
  }

  // SMD pad clusters (PMIC, decoupling)
  ctx.fillStyle = "#c9a24d"
  for (const [cx, cy] of [
    [14, 10],
    [16, 12],
    [18, 9],
    [20, 11],
    [24, 15],
    [26, 13],
    [46, 36],
    [50, 35],
    [52, 37],
    [56, 33],
  ]) {
    pad(ctx, w, h, cx, cy, 0.55)
  }

  noiseFill(ctx, w, h)

  // Silkscreen
  ctx.fillStyle = "rgba(245, 240, 228, 0.92)"
  ctx.font = `600 ${Math.round(w * 0.028)}px system-ui, sans-serif`
  ctx.fillText("Raspberry Pi 4 Model B", mmX(42, w), mmY(54, h))
  ctx.font = `500 ${Math.round(w * 0.016)}px system-ui, sans-serif`
  ctx.fillText("CAMERA", mmX(2, w), mmY(32, h))
  ctx.fillText("DISPLAY", mmX(2, w), mmY(26, h))
  ctx.fillText("Ethernet", mmX(72, w), mmY(48, h))
  ctx.fillText("USB 3.0", mmX(72, w), mmY(28, h))
  ctx.fillText("USB 2.0", mmX(72, w), mmY(10, h))
  ctx.fillText("PWR IN", mmX(8, w), mmY(2, h))
  ctx.fillText("RUN", mmX(30, w), mmY(6, h))

  ctx.restore()

  const heightC = document.createElement("canvas")
  heightC.width = w
  heightC.height = h
  const hctx = heightC.getContext("2d")!
  hctx.drawImage(colorC, 0, 0)
  const id = hctx.getImageData(0, 0, w, h)
  for (let i = 0; i < id.data.length; i += 4) {
    const r = id.data[i]
    const g = id.data[i + 1]
    const b = id.data[i + 2]
    const isCopper = r > 150 && g > 90 && b < 120
    const isPad = r > 200 && g > 180
    const isSilk = r > 230 && g > 230
    let height = 0.45
    if (isCopper) height = 0.72
    if (isPad) height = 0.82
    if (isSilk) height = 0.55
    const v = Math.round(height * 255)
    id.data[i] = v
    id.data[i + 1] = v
    id.data[i + 2] = v
    id.data[i + 3] = 255
  }
  hctx.putImageData(id, 0, 0)

  const roughC = document.createElement("canvas")
  roughC.width = w
  roughC.height = h
  const rctx = roughC.getContext("2d")!
  rctx.drawImage(colorC, 0, 0)
  const rid = rctx.getImageData(0, 0, w, h)
  for (let i = 0; i < rid.data.length; i += 4) {
    const r = rid.data[i]
    const g = rid.data[i + 1]
    const b = rid.data[i + 2]
    const isCopper = r > 150 && g > 90 && b < 120
    const isPad = r > 200 && g > 180
    let rough = 210
    if (isCopper || isPad) rough = 95
    rid.data[i] = rough
    rid.data[i + 1] = rough
    rid.data[i + 2] = rough
    rid.data[i + 3] = 255
  }
  rctx.putImageData(rid, 0, 0)

  const metalC = document.createElement("canvas")
  metalC.width = w
  metalC.height = h
  const mctx = metalC.getContext("2d")!
  mctx.drawImage(colorC, 0, 0)
  const mid = mctx.getImageData(0, 0, w, h)
  for (let i = 0; i < mid.data.length; i += 4) {
    const r = mid.data[i]
    const g = mid.data[i + 1]
    const b = mid.data[i + 2]
    const isCopper = r > 150 && g > 90 && b < 120
    const isPad = r > 200 && g > 180
    const metal = isCopper || isPad ? 230 : 25
    mid.data[i] = metal
    mid.data[i + 1] = metal
    mid.data[i + 2] = metal
    mid.data[i + 3] = 255
  }
  mctx.putImageData(mid, 0, 0)

  const aoC = document.createElement("canvas")
  aoC.width = w
  aoC.height = h
  const actx = aoC.getContext("2d")!
  actx.fillStyle = "#ffffff"
  actx.fillRect(0, 0, w, h)
  actx.globalCompositeOperation = "multiply"
  actx.filter = "blur(6px)"
  actx.drawImage(heightC, 0, 0)
  actx.filter = "none"

  const color = new THREE.CanvasTexture(colorC)
  const height = new THREE.CanvasTexture(heightC)
  const roughness = new THREE.CanvasTexture(roughC)
  const metalness = new THREE.CanvasTexture(metalC)
  const ao = new THREE.CanvasTexture(aoC)
  for (const t of [color, height, roughness, metalness, ao]) {
    t.colorSpace = THREE.NoColorSpace
    t.wrapS = THREE.ClampToEdgeWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    t.anisotropy = 8
  }
  color.colorSpace = THREE.SRGBColorSpace

  return {
    color,
    height,
    roughness,
    metalness,
    ao,
    dispose() {
      color.dispose()
      height.dispose()
      roughness.dispose()
      metalness.dispose()
      ao.dispose()
    },
  }
}

export function createBrushedMetalMap(seed = 1): THREE.CanvasTexture {
  const size = 256
  const c = document.createElement("canvas")
  c.width = size
  c.height = size
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "#b8bcc6"
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 900; i++) {
    const y = (i * (seed * 17.3)) % size
    ctx.strokeStyle = `rgba(255,255,255,${0.04 + (i % 5) * 0.01})`
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y + 2)
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(2, 2)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function createBgaMap(grid = 14): THREE.CanvasTexture {
  const size = 256
  const c = document.createElement("canvas")
  c.width = size
  c.height = size
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "#141c28"
  ctx.fillRect(0, 0, size, size)
  const step = size / grid
  ctx.fillStyle = "#2a3544"
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      if ((row + col) % 5 === 0) continue
      ctx.beginPath()
      ctx.arc(col * step + step / 2, row * step + step / 2, step * 0.18, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function createShieldVentMap(): THREE.CanvasTexture {
  const size = 128
  const c = document.createElement("canvas")
  c.width = size
  c.height = size
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "#9aa3ad"
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = "#1a2030"
  for (let y = 4; y < size; y += 8) {
    for (let x = 4; x < size; x += 8) {
      ctx.beginPath()
      ctx.arc(x, y, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 3)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
