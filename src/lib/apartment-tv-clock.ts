import * as THREE from "three"

const CLOCK_CANVAS_W = 640
const CLOCK_CANVAS_H = 360

export type LivingTvClockRig = {
  texture: THREE.CanvasTexture
  canvas: HTMLCanvasElement
  label: string
  light: THREE.PointLight
  displayMat: THREE.MeshStandardMaterial
}

function formatHHMM(d = new Date()): string {
  const h = d.getHours()
  const m = d.getMinutes()
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

type ClockFaceState = Pick<LivingTvClockRig, "texture" | "canvas" | "label">

function drawClockFace(rig: ClockFaceState, label: string) {
  const ctx = rig.canvas.getContext("2d")
  if (!ctx) return
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, rig.canvas.width, rig.canvas.height)
  ctx.fillStyle = "#000000"
  const fontSize = Math.round(rig.canvas.height * 0.36)
  ctx.font = `600 ${fontSize}px ui-monospace,SFMono-Regular,Consolas,monospace`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(label, rig.canvas.width / 2, rig.canvas.height / 2)
  rig.label = label
  rig.texture.needsUpdate = true
}

export function createLivingTvClockMaterial(): {
  displayMat: THREE.MeshStandardMaterial
  clock: ClockFaceState
} {
  const canvas = document.createElement("canvas")
  canvas.width = CLOCK_CANVAS_W
  canvas.height = CLOCK_CANVAS_H
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const clock = { texture, canvas, label: "" }
  drawClockFace(clock, formatHHMM())

  const displayMat = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    roughness: 0.34,
    metalness: 0.06,
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: 0.52,
  })
  return { displayMat, clock }
}

export function tickLivingTvClock(rig: LivingTvClockRig) {
  const label = formatHHMM()
  if (label === rig.label) return
  drawClockFace(rig, label)
}