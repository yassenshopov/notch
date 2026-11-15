import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { CarStatus } from "./car-mock"
import {
  applyCarGarageEnvironment,
  applyCarStudioEnvironment,
  CAR_VIEWER_PALETTES,
  type CarViewerTheme,
} from "./car-3d-studio"
import {
  createCarGarageBackdrop,
  GARAGE_BACKDROP_PALETTES,
  type CarViewerBackdrop,
} from "./car-viewer-backdrop"
import type { CarModelHandle } from "./car-model-handle"
import { loadCarViewerModel, type CarViewerModelId } from "./car-model-loader"

export type CarModelLoadState = "loading" | "ready" | "error"

export type CarSceneHandle = {
  dispose: () => void
  setDark: (dark: boolean) => void
  setStatus: (status: CarStatus) => void
  setBodyColor: (hex: string) => void
  setPlate: (text: string) => void
  setPan: (enabled: boolean) => void
  setBackdrop: (backdrop: CarViewerBackdrop) => void
  getBackdrop: () => CarViewerBackdrop
  resize: () => void
  getModelLoadState: () => CarModelLoadState
  onModelLoadState: (cb: (state: CarModelLoadState) => void) => () => void
}

function frameCar(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  container: HTMLElement,
) {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const height = Math.max(size.y, 0.45)
  const length = Math.max(size.x, size.z, 2)

  const { width: viewW, height: viewH } = container.getBoundingClientRect()
  const tallViewport = viewH > viewW * 0.72
  const verticalDrop = height * (tallViewport ? 0.1 : 0.05)

  const focusY = center.y + height * 0.2 - verticalDrop
  controls.target.set(center.x, focusY, center.z)

  const dist = length * 1.05 + height * 0.78
  const az = Math.PI / 4.2
  camera.position.set(
    center.x + Math.cos(az) * dist * 0.92,
    focusY + height * 0.58,
    center.z + Math.sin(az) * dist * 0.92,
  )
  camera.near = Math.max(0.05, dist / 120)
  camera.far = dist * 120
  camera.updateProjectionMatrix()
  controls.minAzimuthAngle = -Infinity
  controls.maxAzimuthAngle = Infinity
  controls.update()
}

export function createCarScene(
  container: HTMLElement,
  opts: {
    bodyColor: string
    status: CarStatus
    plate?: string
    dark?: boolean
    modelId?: CarViewerModelId
  },
): CarSceneHandle {
  let theme: CarViewerTheme = opts.dark ? "dark" : "light"
  let backdrop: CarViewerBackdrop = "studio"
  let status = opts.status
  let bodyColor = opts.bodyColor
  let plate = opts.plate ?? ""
  let disposed = false
  let model: CarModelHandle | null = null
  let modelLoadState: CarModelLoadState = "loading"
  const loadListeners = new Set<(state: CarModelLoadState) => void>()
  const setModelLoadState = (next: CarModelLoadState) => {
    modelLoadState = next
    loadListeners.forEach((cb) => cb(next))
  }
  const palette = () => CAR_VIEWER_PALETTES[theme]

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 500)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.style.display = "block"
  renderer.domElement.style.width = "100%"
  renderer.domElement.style.height = "100%"
  container.appendChild(renderer.domElement)

  applyCarStudioEnvironment(renderer, scene, theme)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.enableZoom = true
  controls.zoomToCursor = true
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.minPolarAngle = Math.PI * 0.28
  controls.maxPolarAngle = Math.PI * 0.49
  controls.minDistance = 2.2
  controls.maxDistance = 16

  const onViewerWheel = (e: WheelEvent) => {
    e.stopPropagation()
  }
  renderer.domElement.addEventListener("wheel", onViewerWheel, { passive: true })

  const hemi = new THREE.HemisphereLight(palette().hemisphereSky, palette().hemisphereGround, palette().hemisphereIntensity)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(palette().keyLight, palette().keyIntensity)
  key.position.set(6, 10, 8)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.near = 2
  key.shadow.camera.far = 28
  key.shadow.camera.left = -8
  key.shadow.camera.right = 8
  key.shadow.camera.top = 8
  key.shadow.camera.bottom = -8
  scene.add(key)

  const fill = new THREE.DirectionalLight(palette().fillLight, palette().fillIntensity)
  fill.position.set(-5, 4, -6)
  scene.add(fill)

  const studioRoot = new THREE.Group()
  scene.add(studioRoot)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: palette().shadowOpacity }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  studioRoot.add(ground)

  const grid = new THREE.GridHelper(24, 24, palette().gridPrimary, palette().gridSecondary)
  grid.position.y = 0.001
  const gridMat = grid.material as THREE.Material
  gridMat.transparent = true
  ;(gridMat as THREE.LineBasicMaterial).opacity = palette().gridOpacity
  studioRoot.add(grid)

  const garage = createCarGarageBackdrop(theme)
  garage.group.visible = false
  scene.add(garage.group)

  let raf = 0
  let wheelSpin = 0

  const applyBackdropVisibility = () => {
    const inGarage = backdrop === "garage"
    studioRoot.visible = !inGarage
    garage.group.visible = inGarage
    const gp = GARAGE_BACKDROP_PALETTES[theme]
    if (inGarage) {
      scene.background = new THREE.Color(gp.wall)
      scene.fog = new THREE.FogExp2(gp.wall, gp.fogDensity)
      key.intensity = palette().keyIntensity * (theme === "dark" ? 0.72 : 0.88)
      fill.intensity = palette().fillIntensity * 1.12
    } else {
      const p = palette()
      scene.background = new THREE.Color(p.clearColor)
      scene.fog = new THREE.FogExp2(p.clearColor, theme === "light" ? 0.028 : 0.022)
      key.intensity = p.keyIntensity
      fill.intensity = p.fillIntensity
    }
  }

  const applyTheme = () => {
    const p = palette()
    hemi.color.setHex(p.hemisphereSky)
    hemi.groundColor.setHex(p.hemisphereGround)
    hemi.intensity = p.hemisphereIntensity
    key.color.setHex(p.keyLight)
    fill.color.setHex(p.fillLight)
    ;(ground.material as THREE.ShadowMaterial).opacity = p.shadowOpacity
    const g0 = grid.material as THREE.LineBasicMaterial
    if (Array.isArray(grid.material)) {
      ;(grid.material[0] as THREE.LineBasicMaterial).color.setHex(p.gridSecondary)
      ;(grid.material[1] as THREE.LineBasicMaterial).color.setHex(p.gridPrimary)
      grid.material.forEach((m) => {
        ;(m as THREE.LineBasicMaterial).opacity = p.gridOpacity
      })
    } else {
      g0.opacity = p.gridOpacity
    }
    renderer.toneMappingExposure = p.exposure
    garage.applyTheme(theme)
    scene.environment?.dispose()
    if (backdrop === "garage") {
      applyCarGarageEnvironment(renderer, scene, theme)
    } else {
      applyCarStudioEnvironment(renderer, scene, theme)
    }
    applyBackdropVisibility()
  }

  const resize = () => {
    const { width, height } = container.getBoundingClientRect()
    if (width < 2 || height < 2) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    if (model) {
      frameCar(camera, controls, model.root, container)
      model.repositionPlates?.()
    }
  }

  const animate = () => {
    raf = requestAnimationFrame(animate)
    controls.autoRotate = false
    if (status === "driving" && model) {
      wheelSpin += 0.12
      for (const w of model.wheelGroups) {
        w.rotation.x = wheelSpin
      }
    }
    controls.update()
    renderer.render(scene, camera)
  }

  applyTheme()
  resize()
  animate()

  const modelId = opts.modelId ?? "mazda-6-wagon"
  void loadCarViewerModel(modelId, palette(), bodyColor, plate)
    .then((loaded) => {
      if (disposed) {
        loaded.dispose()
        return
      }
      model = loaded
      scene.add(loaded.root)
      loaded.setBodyColor(bodyColor)
      setModelLoadState("ready")
      resize()
      loaded.repositionPlates?.()
    })
    .catch((err) => {
      console.error("[notch] Car 3D model load failed", err)
      setModelLoadState("error")
    })

  const ro = new ResizeObserver(() => resize())
  ro.observe(container)

  return {
    setDark(nextDark) {
      theme = nextDark ? "dark" : "light"
      applyTheme()
    },
    setStatus(next) {
      status = next
    },
    setBodyColor(hex) {
      bodyColor = hex
      model?.setBodyColor(hex)
    },
    setPlate(text) {
      plate = text
      model?.setPlate?.(text)
      model?.repositionPlates?.()
    },
    setPan(enabled) {
      controls.enablePan = enabled
      if (enabled) {
        controls.mouseButtons = {
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }
      } else {
        controls.mouseButtons = {
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }
      }
    },
    setBackdrop(next) {
      if (backdrop === next) return
      backdrop = next
      applyTheme()
    },
    getBackdrop: () => backdrop,
    resize,
    getModelLoadState: () => modelLoadState,
    onModelLoadState(cb) {
      loadListeners.add(cb)
      cb(modelLoadState)
      return () => loadListeners.delete(cb)
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.domElement.removeEventListener("wheel", onViewerWheel)
      if (scene.environment) scene.environment.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
      ground.geometry.dispose()
      ;(ground.material as THREE.Material).dispose()
      grid.geometry.dispose()
      if (Array.isArray(grid.material)) grid.material.forEach((m) => m.dispose())
      else grid.material.dispose()
      garage.dispose()
      model?.dispose()
    },
  }
}