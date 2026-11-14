import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { ServerStatsStatus } from "./server-stats"
import { buildRaspberryPi4Model } from "./pi-hardware-rpi4b-model"

export type PiHardwareSceneHandle = {
  dispose: () => void
  setStats: (status: ServerStatsStatus) => void
  setDark: (dark: boolean) => void
  resize: () => void
}

type ScenePalette = {
  background: number
  ambient: number
  ambientIntensity: number
  key: number
  keyIntensity: number
  fill: number
  fillIntensity: number
  exposure: number
  gridMain: number
  gridSub: number
}

const PALETTE: Record<"light" | "dark", ScenePalette> = {
  light: {
    background: 0xf2f2f4,
    ambient: 0xffffff,
    ambientIntensity: 0.72,
    key: 0xfff7ed,
    keyIntensity: 1.05,
    fill: 0xe0e7ff,
    fillIntensity: 0.35,
    exposure: 1.08,
    gridMain: 0xd4d4d8,
    gridSub: 0xe4e4e7,
  },
  dark: {
    background: 0x3a3a40,
    ambient: 0xf4f4f5,
    ambientIntensity: 0.95,
    key: 0xffffff,
    keyIntensity: 1.35,
    fill: 0xfca5a5,
    fillIntensity: 0.28,
    exposure: 1.42,
    gridMain: 0x52525b,
    gridSub: 0x3f3f46,
  },
}

function tempEmissive(c: number | null, connected: boolean): THREE.Color {
  if (!connected || c == null) return new THREE.Color(0x0a0a0a)
  const t = Math.min(1, Math.max(0, (c - 38) / 48))
  return new THREE.Color().lerpColors(new THREE.Color(0x0e7490), new THREE.Color(0xdc2626), t)
}

function usageEmissive(pct: number | null, connected: boolean, hue: number): THREE.Color {
  if (!connected || pct == null) return new THREE.Color(0x050505)
  const s = Math.min(1, pct / 100)
  return new THREE.Color().setHSL(hue, 0.65, 0.18 + s * 0.32)
}

function frameObject(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  container: HTMLElement,
) {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  controls.target.copy(center)

  const { width, height } = container.getBoundingClientRect()
  const aspect = Math.max(width / height, 0.01)
  const vFov = (camera.fov * Math.PI) / 180
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
  const distV = size.y / 2 / Math.tan(vFov / 2)
  const distH = size.x / 2 / Math.tan(hFov / 2)
  const dist = Math.max(distV, distH, size.z / 2 / Math.tan(vFov / 2)) * 1.22

  const az = Math.PI * 0.22
  const el = Math.PI * 0.28
  camera.position.set(
    center.x + dist * Math.cos(el) * Math.sin(az),
    center.y + dist * Math.sin(el),
    center.z + dist * Math.cos(el) * Math.cos(az),
  )
  camera.near = dist / 80
  camera.far = dist * 80
  camera.updateProjectionMatrix()
}

export function createPiHardwareScene(
  container: HTMLElement,
  initial: ServerStatsStatus,
  dark = false,
): PiHardwareSceneHandle {
  let themeDark = dark
  const palette = () => (themeDark ? PALETTE.dark : PALETTE.light)

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 500)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.domElement.style.display = "block"
  renderer.domElement.style.width = "100%"
  renderer.domElement.style.height = "100%"
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.autoRotate = false
  controls.minDistance = 40
  controls.maxDistance = 220

  const model = buildRaspberryPi4Model()
  const { root, interactive } = model
  scene.add(root)

  const keyLight = new THREE.DirectionalLight(0xffffff, 1)
  keyLight.position.set(60, 90, 40)
  scene.add(keyLight)

  const fillLight = new THREE.PointLight(0xffffff, 0.3, 400)
  fillLight.position.set(-50, 35, 60)
  scene.add(fillLight)

  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambient)

  const grid = new THREE.GridHelper(200, 40)
  grid.position.y = -12
  scene.add(grid)

  let stats = initial
  let raf = 0
  let pulse = 0

  const applyTheme = () => {
    const p = palette()
    scene.background = new THREE.Color(p.background)
    scene.fog = new THREE.FogExp2(p.background, themeDark ? 0.0028 : 0.0045)
    ambient.color.setHex(p.ambient)
    ambient.intensity = p.ambientIntensity
    keyLight.color.setHex(p.key)
    keyLight.intensity = p.keyIntensity
    fillLight.color.setHex(p.fill)
    fillLight.intensity = p.fillIntensity
    renderer.toneMappingExposure = p.exposure
    const mats = Array.isArray(grid.material) ? grid.material : [grid.material]
    for (const mat of mats) {
      if (mat instanceof THREE.LineBasicMaterial) {
        mat.transparent = true
        mat.opacity = themeDark ? 0.42 : 0.35
      }
    }
    if (mats[0] instanceof THREE.LineBasicMaterial) mats[0].color.setHex(p.gridSub)
    if (mats[1] instanceof THREE.LineBasicMaterial) mats[1].color.setHex(p.gridMain)
  }

  const applyStats = () => {
    const connected = stats.connected
    interactive.socMat.emissive.copy(tempEmissive(stats.cpuTempC ?? null, connected))
    interactive.ramMat.emissive.copy(usageEmissive(stats.memUsedPct ?? null, connected, 0.58))
    interactive.sdMat.emissive.copy(usageEmissive(stats.diskUsedPct ?? null, connected, 0.07))

    const load = stats.load1 ?? 0
    const cores = Math.max(1, stats.cpuCount ?? 4)
    const activity = connected ? Math.min(1, load / cores) : 0
    interactive.activityLedMat.emissive.setHSL(0.38, 0.9, 0.12 + activity * 0.4)
    interactive.powerLedMat.emissiveIntensity = connected ? 1.2 : 0.25

    for (let i = 0; i < interactive.gpioPinMats.length; i++) {
      const m = interactive.gpioPinMats[i]
      const bit = connected && ((Math.floor(load * 4) + i) % 4 === 0)
      m.emissive.setHex(bit ? 0x166534 : 0x000000)
      m.emissiveIntensity = bit ? 0.85 : 0
    }
  }

  const resize = () => {
    const { width, height } = container.getBoundingClientRect()
    if (width < 2 || height < 2) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    frameObject(camera, controls, root, container)
  }

  const animate = () => {
    raf = requestAnimationFrame(animate)
    pulse += 0.02
    if (stats.connected && stats.cpuTempC != null && stats.cpuTempC > 72) {
      const wobble = Math.sin(pulse * 3) * 0.08 * ((stats.cpuTempC - 72) / 28)
      interactive.socMesh.position.y = wobble
    } else {
      interactive.socMesh.position.y = 0
    }
    controls.update()
    renderer.render(scene, camera)
  }

  applyTheme()
  applyStats()
  resize()
  animate()

  const ro = new ResizeObserver(() => resize())
  ro.observe(container)

  return {
    setStats(next) {
      stats = next
      applyStats()
    },
    setDark(nextDark) {
      themeDark = nextDark
      applyTheme()
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          for (const mat of mats) mat.dispose()
        }
      })
      model.dispose()
    },
  }
}
