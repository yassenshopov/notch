import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js"
import type { CarViewerPalette } from "./car-3d-studio"
import type { CarModelHandle } from "./car-model-handle"
import { publicAssetUrl } from "./car-asset-url"
import { attachRegistrationPlates } from "./car-plate-mesh"
import {
  applyBodyColorToPaint,
  applyCarVisualDetails,
  applyMiniClubmanPaint,
  classifyMiniClubmanFallback,
  classifyMiniClubmanMesh,
  type CarVisualPaintResult,
} from "./car-glb-detail"

const MAZDA6_WAGON_GLB = () => publicAssetUrl("models/mazda-6-wagon.glb")
/** Bump when Mini GLB or paint pipeline changes (cache-busts public/models + remounts viewer). */
export const CAR_MINI_VIEWER_REVISION = 8

const MINI_CLUBMAN_JCW_GLB = () =>
  publicAssetUrl(`models/mini-clubman-jcw.glb?v=${CAR_MINI_VIEWER_REVISION}`)
const MAZDA6_TARGET_LENGTH_M = 4.785
const MINI_CLUBMAN_TARGET_LENGTH_M = 3.968

function wrapCarRig(sceneRoot: THREE.Object3D) {
  const rig = new THREE.Group()
  rig.name = "car-rig"
  while (sceneRoot.children.length > 0) {
    rig.add(sceneRoot.children[0])
  }
  sceneRoot.add(rig)
  return rig
}

function detectNeedsZUpCorrection(rig: THREE.Object3D) {
  rig.rotation.set(0, 0, 0)
  rig.scale.setScalar(1)
  rig.updateMatrixWorld(true)
  const size = new THREE.Box3().setFromObject(rig).getSize(new THREE.Vector3())
  // Guruware OBJ export: length on Y, height on Z — smallest is usually width (X).
  return size.z < size.y && size.z < size.x * 0.85
}

type OrientOpts = {
  /** Blender / glTF exports that are already Y-up (skip Mazda OBJ Z-correction). */
  yUpGltf?: boolean
  /** Rotate rig around Y after sizing (radians). */
  yawRad?: number
}

function disposeMesh(obj: THREE.Mesh) {
  obj.geometry.dispose()
  const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
  mats.forEach((m) => m.dispose())
}

/** OpenSKP export can leave library duplicates and stray edge shells — drop outliers. */
function pruneMiniClubmanDebris(sceneRoot: THREE.Object3D) {
  const meshes: THREE.Mesh[] = []
  sceneRoot.traverse((obj) => {
    if (obj instanceof THREE.Mesh) meshes.push(obj)
  })
  if (meshes.length === 0) return

  const core = meshes.filter((m) => {
    const n = m.name.toLowerCase()
    return (
      n.includes("black_body") ||
      n.includes("chrome_hoo") ||
      n.includes("chrome_bod") ||
      n.includes("body_bum") ||
      n.includes("body_body") ||
      n.includes("frame_body")
    )
  })
  const sample = core.length >= 3 ? core : meshes

  const shell = new THREE.Box3()
  for (const m of sample) shell.union(new THREE.Box3().setFromObject(m))
  const pad = Math.max(shell.getSize(new THREE.Vector3()).length() * 0.08, 0.35)
  shell.expandByScalar(pad)

  const drop: THREE.Mesh[] = []
  for (const m of meshes) {
    const n = m.name.toLowerCase()
    if (n.includes("(lines)")) {
      drop.push(m)
      continue
    }
    const box = new THREE.Box3().setFromObject(m)
    if (!shell.intersectsBox(box)) drop.push(m)
  }

  for (const m of drop) {
    m.parent?.remove(m)
    disposeMesh(m)
  }
}

function orientAndScaleToMeters(sceneRoot: THREE.Object3D, targetLengthM: number, orient?: OrientOpts) {
  const rig = wrapCarRig(sceneRoot)
  rig.position.set(0, 0, 0)
  rig.rotation.set(0, 0, 0)
  rig.scale.set(1, 1, 1)

  if (!orient?.yUpGltf && detectNeedsZUpCorrection(rig)) {
    rig.rotation.order = "XYZ"
    rig.rotation.x = -Math.PI / 2
    rig.rotation.y = 0
    rig.rotation.z = 0
  }
  if (orient?.yawRad != null) {
    rig.rotation.y += orient.yawRad
  }
  rig.updateMatrixWorld(true)

  let box = new THREE.Box3().setFromObject(rig)
  const size = box.getSize(new THREE.Vector3())
  const longest = Math.max(size.x, size.y, size.z)
  rig.scale.setScalar(targetLengthM / longest)
  rig.updateMatrixWorld(true)

  const tireBottoms: number[] = []
  rig.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    if (!obj.name.toLowerCase().includes("tire")) return
    tireBottoms.push(new THREE.Box3().setFromObject(obj).min.y)
  })

  box = new THREE.Box3().setFromObject(rig)
  const groundY = tireBottoms.length > 0 ? Math.min(...tireBottoms) : box.min.y
  const center = box.getCenter(new THREE.Vector3())
  rig.position.set(-center.x, -groundY, -center.z)
  rig.updateMatrixWorld(true)
}

async function loadGlbCarModel(
  url: string,
  targetLengthM: number,
  bodyColorHex: string,
  plateText: string,
  logLabel: string,
  visualOpts?: Parameters<typeof applyCarVisualDetails>[2],
  applyPaint?: (mats: CarVisualPaintResult, bodyHex: string) => void,
  prepareRoot?: (root: THREE.Object3D) => void,
  orient?: OrientOpts,
): Promise<CarModelHandle> {
  try {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    const gltf = await loader.loadAsync(url)
    const root = gltf.scene
    prepareRoot?.(root)
    orientAndScaleToMeters(root, targetLengthM, orient)

    let plates = plateText.trim() ? attachRegistrationPlates(root, plateText) : null
    const visual = applyCarVisualDetails(root, bodyColorHex, visualOpts)
    const paintAll =
      applyPaint ??
      ((mats, hex) => {
        applyBodyColorToPaint(mats.paintMats, hex)
        applyBodyColorToPaint(mats.interiorMats, hex)
      })
    paintAll(visual, bodyColorHex)

    return {
      root,
      wheelGroups: [],
      repositionPlates: () => plates?.reposition(),
      setBodyColor(hex: string) {
        paintAll(visual, hex)
      },
      setPlate(text: string) {
        const next = text.trim()
        if (!next) {
          plates?.dispose()
          plates = null
          return
        }
        if (!plates) plates = attachRegistrationPlates(root, next)
        else plates.setPlate(next)
      },
      dispose() {
        plates?.dispose()
        root.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
            mats.forEach((m) => m.dispose())
          }
        })
      },
    }
  } catch (err) {
    console.error(`[notch] ${logLabel} GLB failed`, url, err)
    throw err
  }
}

export async function loadMazda6WagonModel(
  _palette: CarViewerPalette,
  bodyColorHex: string,
  plateText = "",
): Promise<CarModelHandle> {
  const url = MAZDA6_WAGON_GLB()
  return loadGlbCarModel(url, MAZDA6_TARGET_LENGTH_M, bodyColorHex, plateText, "Mazda 6")
}

export async function loadMiniClubmanJcwModel(
  _palette: CarViewerPalette,
  bodyColorHex: string,
  plateText = "",
): Promise<CarModelHandle> {
  const url = MINI_CLUBMAN_JCW_GLB()
  return loadGlbCarModel(
    url,
    MINI_CLUBMAN_TARGET_LENGTH_M,
    bodyColorHex,
    plateText,
    "Mini Clubman JCW",
    {
      classify: (name) => classifyMiniClubmanMesh(name) ?? classifyMiniClubmanFallback(name),
    },
    (mats, hex) => applyMiniClubmanPaint(mats, hex),
    pruneMiniClubmanDebris,
    { yUpGltf: true },
  )
}

export type { CarModelHandle }