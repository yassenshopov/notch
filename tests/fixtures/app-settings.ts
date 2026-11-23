import { defaultSettings, type AppSettings } from "../../src/config/settings"

type SettingsPatch = Partial<Omit<AppSettings, "island" | "liveActivities" | "wifiSense">> & {
  island?: Partial<AppSettings["island"]> & {
    faces?: Partial<AppSettings["island"]["faces"]>
  }
  liveActivities?: Partial<AppSettings["liveActivities"]> & {
    weather?: Partial<AppSettings["liveActivities"]["weather"]>
    cursor?: Partial<AppSettings["liveActivities"]["cursor"]>
  }
  wifiSense?: Partial<AppSettings["wifiSense"]>
}

export function makeSettings(patch: SettingsPatch = {}): AppSettings {
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