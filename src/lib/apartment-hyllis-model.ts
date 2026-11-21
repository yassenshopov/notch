/**
 * Grey IKEA HYLLIS–style pair on the east wall: combined along-wall span matches the TV screen.
 * CC0 metal bay mesh from 3DAssets.dev, scaled and tinted; procedural fallback if load fails.
 * https://3dassets.dev/assets/clinic-and-veterinary-practice-stock-shelving-c5a90861
 */
import * as THREE from "three"
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { publicAssetUrl } from "./car-asset-url"
import { livingEastWallTvCenterZ } from "./apartment-living-layout"
import { LIVING_TV_SCREEN_ALONG_WALL_M, type SpaceSpec } from "./apartment-floor-plan"

const HYLLIS_GLB = () => publicAssetUrl("models/hyllis-shelf-bay.glb")
const HYLLIS_UNIT_NAME = "hyllis-unit"
const FLOOR_THICKNESS_M = 0.08
const HYLLIS_D_M = 0.27
const HYLLIS_H_M = 0.74
const SRC_W = 1
const SRC_H = 1.922
const SRC_D = 0.45
const HYLLIS_ROT_Y = -Math.PI / 2
const EAST_WALL_INSET_M = 0.06
const HYLLIS_PAIR_GAP_M = 0.02
const SHELF_WOOD = 0x3c2a1e

function hyllisUnitAlongWallM() {
  return (LIVING_TV_SCREEN_ALONG_WALL_M - HYLLIS_PAIR_GAP_M) / 2
}

function hyllisMetalMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xa9afb5,
    metalness: 0.72,
    roughness: 0.38,
  })
}

function hyllisShelfMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: SHELF_WOOD,
    metalness: 0.04,
    roughness: 0.82,
  })
}

function isShelfMesh(mesh: THREE.Mesh): boolean {
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox
  if (!box) return false
  const size = new THREE.Vector3()
  box.getSize(size)
  const sx = size.x * Math.abs(mesh.scale.x)
  const sy = size.y * Math.abs(mesh.scale.y)
  const sz = size.z * Math.abs(mesh.scale.z)
  return sy < 0.06 && Math.max(sx, sz) > 0.08
}

function applyHyllisMaterials(root: THREE.Object3D) {
  const metal = hyllisMetalMat()
  const wood = hyllisShelfMat()
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    obj.material = isShelfMesh(obj) ? wood : metal
  })
}

function fitHyllisUnit(model: THREE.Object3D, alongWallM: number) {
  model.position.set(0, 0, 0)
  model.rotation.set(0, 0, 0)
  model.scale.set(alongWallM / SRC_W, HYLLIS_H_M / SRC_H, HYLLIS_D_M / SRC_D)
  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  model.position.y -= box.min.y
}

function buildProceduralHyllis(alongWallM: number): THREE.Group {
  const group = new THREE.Group()
  const metal = hyllisMetalMat()
  const wood = hyllisShelfMat()
  const postT = 0.016
  const w = alongWallM
  const d = HYLLIS_D_M
  const h = HYLLIS_H_M
  const posts: [number, number][] = [
    [0, 0],
    [w, 0],
    [0, d],
    [w, d],
  ]
  for (const [px, pz] of posts) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(postT, h, postT), metal)
    post.position.set(px, h / 2, pz)
    group.add(post)
  }
  for (let i = 0; i < 4; i++) {
    const y = (h * (i + 1)) / 5
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), wood)
    shelf.position.set(w / 2, y, d / 2)
    group.add(shelf)
  }
  return group
}

/** Pair along east wall, same total width as TV screen, centered on TV. */
function hyllisCenters(living: SpaceSpec): number[] {
  const { rect } = living
  const along = hyllisUnitAlongWallM()
  const midZ = livingEastWallTvCenterZ(rect)
  const gapHalf = HYLLIS_PAIR_GAP_M / 2
  return [midZ - along / 2 - gapHalf, midZ + along / 2 + gapHalf]
}

function clearHyllisUnits(root: THREE.Group) {
  const remove: THREE.Object3D[] = []
  root.traverse((obj) => {
    if (obj.name === HYLLIS_UNIT_NAME) remove.push(obj)
  })
  for (const obj of remove) {
    obj.removeFromParent()
  }
}

function placeHyllisOnEastWall(
  root: THREE.Group,
  unit: THREE.Object3D,
  living: SpaceSpec,
  zCenter: number,
) {
  const { rect } = living
  const rig = new THREE.Group()
  rig.name = HYLLIS_UNIT_NAME
  rig.rotation.y = HYLLIS_ROT_Y
  rig.add(unit)
  root.add(rig)
  rig.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(rig)
  rig.position.x = rect.x + rect.w - EAST_WALL_INSET_M - box.max.x
  rig.position.y = FLOOR_THICKNESS_M - box.min.y
  rig.position.z = zCenter - (box.min.z + box.max.z) * 0.5
}

function mountHyllisPair(root: THREE.Group, living: SpaceSpec, template: THREE.Object3D) {
  clearHyllisUnits(root)
  for (const z of hyllisCenters(living)) {
    const unit = template.clone(true)
    placeHyllisOnEastWall(root, unit, living, z)
  }
}

export async function loadHyllisPair(
  root: THREE.Group,
  living: SpaceSpec,
  loader: GLTFLoader,
  isAlive: () => boolean,
) {
  const alongWallM = hyllisUnitAlongWallM()
  mountHyllisPair(root, living, buildProceduralHyllis(alongWallM))
  if (!isAlive()) return

  try {
    const gltf = await loader.loadAsync(HYLLIS_GLB())
    if (!isAlive()) return
    const template = gltf.scene
    fitHyllisUnit(template, alongWallM)
    applyHyllisMaterials(template)
    mountHyllisPair(root, living, template)
  } catch {
    // procedural pair already mounted
  }
}