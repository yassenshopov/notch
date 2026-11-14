import * as THREE from "three"

export type CarViewerTheme = "light" | "dark"

export type CarViewerPalette = {
  clearColor: number
  hemisphereSky: number
  hemisphereGround: number
  hemisphereIntensity: number
  keyLight: number
  keyIntensity: number
  fillLight: number
  fillIntensity: number
  gridPrimary: number
  gridSecondary: number
  gridOpacity: number
  bodyPaint: number
  bodyDark: number
  chrome: number
  edge: number
  shadowOpacity: number
  contactShadow: string
  exposure: number
}

export const CAR_VIEWER_PALETTES: Record<CarViewerTheme, CarViewerPalette> = {
  light: {
    clearColor: 0xf5f4f0,
    hemisphereSky: 0xe8eef5,
    hemisphereGround: 0xd8dce0,
    hemisphereIntensity: 0.72,
    keyLight: 0xffffff,
    keyIntensity: 1.12,
    fillLight: 0xe8e8e8,
    fillIntensity: 0.48,
    gridPrimary: 0xc9ccc4,
    gridSecondary: 0xe3e1da,
    gridOpacity: 0.38,
    bodyPaint: 0x0a0a0c,
    bodyDark: 0x1a1e22,
    chrome: 0xd4d9df,
    edge: 0x8a95a5,
    shadowOpacity: 0.32,
    contactShadow: "rgba(0,0,0,0.42)",
    exposure: 1.08,
  },
  dark: {
    clearColor: 0x14181e,
    hemisphereSky: 0x4a5a6e,
    hemisphereGround: 0x282c32,
    hemisphereIntensity: 0.58,
    keyLight: 0xffffff,
    keyIntensity: 1.2,
    fillLight: 0x9ca3af,
    fillIntensity: 0.38,
    gridPrimary: 0x3a4552,
    gridSecondary: 0x2a323b,
    gridOpacity: 0.22,
    bodyPaint: 0x0a0a0c,
    bodyDark: 0x15181c,
    chrome: 0xa8b2bc,
    edge: 0x6a7a8c,
    shadowOpacity: 0.45,
    contactShadow: "rgba(0,0,0,0.55)",
    exposure: 1.28,
  },
}

export function parseCarBodyPaintHex(value: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(value.trim())
  if (!m) return null
  return parseInt(m[1]!, 16)
}

export function radialContactShadowTex(inner: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement("canvas")
  c.width = c.height = 128
  const g = c.getContext("2d")
  if (!g) return new THREE.CanvasTexture(c)
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, inner)
  gr.addColorStop(0.28, inner.replace(/,\s*[\d.]+\)$/, ",0.55)"))
  gr.addColorStop(1, outer)
  g.fillStyle = gr
  g.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Studio sphere + soft panels for PBR reflections (eculink-style). */
export function applyCarStudioEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, theme: CarViewerTheme) {
  const env = new THREE.Scene()
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }),
  )
  const cols: number[] = []
  const pos = room.geometry.attributes.position
  const skyLift = theme === "light" ? 1.1 : 0.96
  const groundLift = theme === "light" ? 1.05 : 1.08
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50
    const k = y > 0 ? (0.55 + y * 0.35) * skyLift : (0.12 + (y + 1) * 0.1) * groundLift
    cols.push(k * 0.92, k * 0.96, k)
  }
  room.geometry.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3))
  env.add(room)

  const panelBoost = theme === "light" ? 1.12 : 0.95
  const panel = (x: number, y: number, z: number, w: number, h: number, k: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(k * panelBoost, k * panelBoost, k * panelBoost),
        side: THREE.DoubleSide,
      }),
    )
    m.position.set(x, y, z)
    m.lookAt(0, 0, 0)
    env.add(m)
  }
  panel(0, 40, 0, 40, 18, 4.0)
  panel(30, 15, 25, 20, 10, 2.2)
  panel(-30, 12, -20, 22, 8, theme === "light" ? 1.6 : 2.1)
  panel(-22, 6, 18, 18, 12, theme === "light" ? 1.2 : 1.85)

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(env, theme === "light" ? 0.025 : 0.018).texture
  pmrem.dispose()
}

/** Garage bay: darker shell with bright ceiling panels for PBR highlights. */
export function applyCarGarageEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, theme: CarViewerTheme) {
  const env = new THREE.Scene()
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(48, 28, 14),
    new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }),
  )
  const cols: number[] = []
  const pos = shell.geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 48
    const top = y > 0.55
    const k = top
      ? (theme === "light" ? 0.78 : 0.22) + y * 0.08
      : (theme === "light" ? 0.42 : 0.1) + Math.max(0, y + 0.35) * 0.18
    cols.push(k * 0.94, k * 0.96, k)
  }
  shell.geometry.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3))
  env.add(shell)

  const strip = (x: number, z: number, w: number, h: number, k: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(k, k, k * 1.02),
        side: THREE.DoubleSide,
      }),
    )
    m.position.set(x, 42, z)
    m.rotation.x = -Math.PI / 2.15
    env.add(m)
  }
  const stripBoost = theme === "light" ? 2.8 : 3.4
  strip(0, 0, 28, 6, stripBoost)
  strip(-18, -8, 12, 4, stripBoost * 0.55)
  strip(18, -8, 12, 4, stripBoost * 0.55)

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(env, theme === "light" ? 0.022 : 0.02).texture
  pmrem.dispose()
}