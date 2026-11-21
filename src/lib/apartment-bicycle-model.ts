/**
 * CC0 city bicycle — 3DAssets.dev “Pixel Modern City Street”
 * https://3dassets.dev/assets/pixel-modern-city-street-bicycle-ecfb4c16
 */
import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { publicAssetUrl } from "./car-asset-url"
import { propM, type SpaceSpec } from "./apartment-floor-plan"

const BICYCLE_GLB = () => publicAssetUrl("models/bicycle-city.glb")
const FLOOR_THICKNESS_M = propM(0.08)
/** Matches apartment-scene balcony parapet */
const BALCONY_PARAPET_THICK_M = propM(0.26)
/** Model depth along +Z ≈ 1.78 m at scale 1 */
const BICYCLE_TARGET_LENGTH_M = propM(1.62)

function paintBikeDark(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const raw of mats) {
      if (!(raw instanceof THREE.MeshStandardMaterial)) continue
      const m = raw.clone()
      m.color.setHex(0x1a1a1a)
      m.emissive.setHex(0x000000)
      m.metalness = Math.min(0.55, m.metalness + 0.2)
      m.roughness = 0.62
      obj.material = m
    }
  })
}

function fitBicycleToGround(model: THREE.Object3D) {
  model.position.set(0, 0, 0)
  model.rotation.set(0, 0, 0)
  model.scale.setScalar(1)
  model.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const len = Math.max(size.x, size.z)
  if (len > 1e-4) {
    const s = BICYCLE_TARGET_LENGTH_M / len
    model.scale.setScalar(s)
  }

  model.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(model)
  model.position.y -= grounded.min.y
}

export async function loadBalconyBicycle(root: THREE.Group, balcony: SpaceSpec) {
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(BICYCLE_GLB())
  const model = gltf.scene
  model.name = "balcony-bicycle"
  paintBikeDark(model)
  fitBicycleToGround(model)

  const rig = new THREE.Group()
  rig.add(model)
  const { rect } = balcony
  const t = BALCONY_PARAPET_THICK_M
  const northInnerZ = rect.z + t
  rig.position.set(rect.x + t + propM(0.48), FLOOR_THICKNESS_M, northInnerZ + propM(0.44))
  rig.rotation.y = Math.PI + Math.PI / 2
  rig.rotation.x = -0.085
  root.add(rig)
}