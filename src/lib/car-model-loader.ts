import type { CarViewerPalette } from "./car-3d-studio"
import type { CarModelHandle } from "./car-model-handle"
import { loadMazda6WagonModel, loadMiniClubmanJcwModel } from "./car-glb-model"

export type CarViewerModelId = "mazda-6-wagon" | "mini-clubman-jcw"

export async function loadCarViewerModel(
  modelId: CarViewerModelId,
  palette: CarViewerPalette,
  bodyColorHex: string,
  plateText = "",
): Promise<CarModelHandle> {
  switch (modelId) {
    case "mazda-6-wagon":
      return loadMazda6WagonModel(palette, bodyColorHex, plateText)
    case "mini-clubman-jcw":
      return loadMiniClubmanJcwModel(palette, bodyColorHex, plateText)
  }
}