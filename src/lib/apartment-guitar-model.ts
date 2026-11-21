/**
 * Acoustic dreadnought guitar (CC0) — tevy “Acoustic Guitar”
 * https://tevy.dev/models/acoustic-guitar
 */
import * as THREE from "three"
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { publicAssetUrl } from "./car-asset-url"

const GUITAR_GLB = () => publicAssetUrl("models/acoustic-guitar.glb")
/** Model height ≈ 1.03 m at scale 1 */
const GUITAR_TARGET_HEIGHT_M = 1.05

function warmLightWoodTones(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    const next: THREE.Material[] = []
    for (const raw of mats) {
      if (!(raw instanceof THREE.MeshStandardMaterial)) {
        next.push(raw)
        continue
      }
      const m = raw.clone()
      const lum = m.color.r * 0.299 + m.color.g * 0.587 + m.color.b * 0.114
      if (lum < 0.62 && lum > 0.06) {
        m.color.lerp(new THREE.Color(0xf2dc9a), 0.22)
      }
      next.push(m)
    }
    obj.material = next.length === 1 ? next[0]! : next
  })
}

function fitGuitarUpright(model: THREE.Object3D) {
  model.position.set(0, 0, 0)
  model.rotation.set(0, 0, 0)
  model.scale.setScalar(1)
  model.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  if (size.y > 1e-4) {
    model.scale.setScalar(GUITAR_TARGET_HEIGHT_M / size.y)
  }

  model.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(model)
  model.position.y -= grounded.min.y
}

function buildProceduralGuitar(): THREE.Group {
  const group = new THREE.Group()
  const body = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.82, metalness: 0.05 })
  const neck = new THREE.MeshStandardMaterial({ color: 0x5c4032, roughness: 0.78, metalness: 0.04 })
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 1.02), body)
  bodyMesh.position.set(0, 0.52, 0.08)
  group.add(bodyMesh)
  const neckMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.88), neck)
  neckMesh.position.set(0, 0.62, -0.38)
  group.add(neckMesh)
  return group
}

function mountGuitarOnLamp(lampRoot: THREE.Object3D, model: THREE.Object3D, localX: number, localZ: number) {
  const existing = lampRoot.getObjectByName("sofa-lamp-guitar")
  if (existing) existing.removeFromParent()

  const rig = new THREE.Group()
  rig.name = "sofa-lamp-guitar"
  rig.position.set(localX, 0, localZ)
  rig.rotation.z = 0.14
  rig.rotation.y = 0.06
  model.name = "guitar-mesh"
  rig.add(model)
  lampRoot.add(rig)
}

export async function loadGuitarLeaningOnLamp(
  lampRoot: THREE.Object3D,
  loader: GLTFLoader,
  isAlive: () => boolean,
  localX = 0.07,
  localZ = 0.02,
) {
  try {
    const gltf = await loader.loadAsync(GUITAR_GLB())
    if (!isAlive()) return
    const model = gltf.scene
    warmLightWoodTones(model)
    fitGuitarUpright(model)
    mountGuitarOnLamp(lampRoot, model, localX, localZ)
  } catch {
    if (!isAlive()) return
    const model = buildProceduralGuitar()
    fitGuitarUpright(model)
    mountGuitarOnLamp(lampRoot, model, localX, localZ)
  }
}