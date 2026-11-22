import { defaultSettings, type AppSettings } from "../../src/config/settings"

export function makeSettings(patch: Partial<AppSettings> = {}): AppSettings {
  return {
    ...defaultSettings,
    ...patch,
    island: { ...defaultSettings.island, ...patch.island, faces: { ...defaultSettings.island.faces, ...patch.island?.faces } },
    liveActivities: {
      ...defaultSettings.liveActivities,
      ...patch.liveActivities,
      weather: { ...defaultSettings.liveActivities.weather, ...patch.liveActivities?.weather },
      cursor: { ...defaultSettings.liveActivities.cursor, ...patch.liveActivities?.cursor },
    },
    wifiSense: { ...defaultSettings.wifiSense, ...patch.wifiSense },
  }
}