import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js"
import type { CarViewerPalette } from "./car-3d-studio"
import type { CarModelHandle } from "./car-model-handle"
import { publicAssetUrl } from "./car-asset-url"
import { attachRegistrationPlates } from "./car-plate-mesh"
import { applyBodyColorToPaint, applyCarVisualDetails } from "./car-glb-detail"

const MAZDA6_WAGON_GLB = () => publicAssetUrl("models/mazda-6-wagon.glb")
const TARGET_LENGTH_M = 4.785

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

function orientAndScaleToMeters(sceneRoot: THREE.Object3D) {
  const rig = wrapCarRig(sceneRoot)
  rig.position.set(0, 0, 0)
  rig.rotation.set(0, 0, 0)
  rig.scale.set(1, 1, 1)

  if (detectNeedsZUpCorrection(rig)) {
    rig.rotation.order = "XYZ"
    rig.rotation.x = -Math.PI / 2
    rig.rotation.y = 0
    rig.rotation.z = 0
  }
  rig.updateMatrixWorld(true)

  let box = new THREE.Box3().setFromObject(rig)
  const size = box.getSize(new THREE.Vector3())
  const longest = Math.max(size.x, size.y, size.z)
  rig.scale.setScalar(TARGET_LENGTH_M / longest)
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

export async function loadMazda6WagonModel(
  _palette: CarViewerPalette,
  bodyColorHex: string,
  plateText = "",
): Promise<CarModelHandle> {
  const url = MAZDA6_WAGON_GLB()
  try {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    const gltf = await loader.loadAsync(url)
    const root = gltf.scene
    orientAndScaleToMeters(root)

    let plates = plateText.trim() ? attachRegistrationPlates(root, plateText) : null
    const { paintMats, interiorMats } = applyCarVisualDetails(root, bodyColorHex)

    return {
      root,
      wheelGroups: [],
      repositionPlates: () => plates?.reposition(),
      setBodyColor(hex: string) {
        applyBodyColorToPaint(paintMats, hex)
        applyBodyColorToPaint(interiorMats, hex)
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
    console.error("[notch] Mazda 6 GLB failed", url, err)
    throw err
  }
}

export type { CarModelHandle }