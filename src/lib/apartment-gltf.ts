import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js"
import { publicAssetUrl } from "./car-asset-url"

let ktx2Loader: KTX2Loader | null = null

/** GLTF loader for apartment props (acoustic guitar uses KTX2/Basis textures). */
export function createApartmentGltfLoader(renderer: THREE.WebGLRenderer): GLTFLoader {
  const loader = new GLTFLoader()
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader().setTranscoderPath(publicAssetUrl("basis/"))
    ktx2Loader.detectSupport(renderer)
  }
  loader.setKTX2Loader(ktx2Loader)
  return loader
}