import type * as THREE from "three"

export type CarModelHandle = {
  root: THREE.Group
  wheelGroups: THREE.Object3D[]
  dispose: () => void
  setBodyColor: (hex: string) => void
  setPlate?: (text: string) => void
  repositionPlates?: () => void
}