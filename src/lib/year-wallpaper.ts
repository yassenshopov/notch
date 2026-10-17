import { defaultSettings, type AppSettings } from "../config/settings"

export type YearWallpaperShape = "square" | "circle"

export type YearWallpaperSettings = AppSettings["yearWallpaper"]

export function yearWallpaperDefaults(): YearWallpaperSettings {
  return { ...defaultSettings.yearWallpaper }
}

export function mergeYearWallpaper(
  partial?: Partial<YearWallpaperSettings> | null,
): YearWallpaperSettings {
  return { ...yearWallpaperDefaults(), ...partial }
}

export function wallpaperFileName(year: number) {
  return `year-${year}-wallpaper.png`
}

export function wallpaperOutputDirLabel(outputDir: string) {
  const trimmed = outputDir.trim()
  return trimmed.length > 0 ? trimmed : "Pictures/Notch"
}
