/** Open-Meteo Air Quality helpers — AQI / pollen / UV labels */

export type AqiScale = "european" | "us"

export type PollenType =
  | "alder"
  | "birch"
  | "grass"
  | "mugwort"
  | "olive"
  | "ragweed"

export type PollenGrains = Partial<Record<PollenType, number>>

export type AirQualitySample = {
  aqi: number | null
  aqiScale: AqiScale
  pm25: number | null
  pm10: number | null
  uvIndex: number | null
  /** Peak pollen grains/m³ across available types (Europe only) */
  pollen: number | null
  pollenType: PollenType | null
  /** Per-type grains/m³ when Open-Meteo provides them */
  pollenGrains: PollenGrains
}

const POLLEN_KEYS = [
  "alder_pollen",
  "birch_pollen",
  "grass_pollen",
  "mugwort_pollen",
  "olive_pollen",
  "ragweed_pollen",
] as const

const POLLEN_FROM_KEY: Record<(typeof POLLEN_KEYS)[number], PollenType> = {
  alder_pollen: "alder",
  birch_pollen: "birch",
  grass_pollen: "grass",
  mugwort_pollen: "mugwort",
  olive_pollen: "olive",
  ragweed_pollen: "ragweed",
}

export const POLLEN_TYPE_LABEL: Record<PollenType, string> = {
  alder: "Alder",
  birch: "Birch",
  grass: "Grass",
  mugwort: "Mugwort",
  olive: "Olive",
  ragweed: "Ragweed",
}

type RawBags = {
  time?: string[]
  european_aqi?: (number | null)[]
  us_aqi?: (number | null)[]
  pm2_5?: (number | null)[]
  pm10?: (number | null)[]
  uv_index?: (number | null)[]
  alder_pollen?: (number | null)[]
  birch_pollen?: (number | null)[]
  grass_pollen?: (number | null)[]
  mugwort_pollen?: (number | null)[]
  olive_pollen?: (number | null)[]
  ragweed_pollen?: (number | null)[]
}

type RawCurrent = {
  european_aqi?: number | null
  us_aqi?: number | null
  pm2_5?: number | null
  pm10?: number | null
  uv_index?: number | null
  alder_pollen?: number | null
  birch_pollen?: number | null
  grass_pollen?: number | null
  mugwort_pollen?: number | null
  olive_pollen?: number | null
  ragweed_pollen?: number | null
}

function pickAqi(
  european: number | null | undefined,
  us: number | null | undefined,
): { aqi: number | null; aqiScale: AqiScale } {
  if (european != null && Number.isFinite(european)) {
    return { aqi: Math.round(european), aqiScale: "european" }
  }
  if (us != null && Number.isFinite(us)) {
    return { aqi: Math.round(us), aqiScale: "us" }
  }
  return { aqi: null, aqiScale: "european" }
}

function pollenGrainsFromFields(
  bag: Record<string, number | null | undefined>,
): PollenGrains {
  const grains: PollenGrains = {}
  for (const key of POLLEN_KEYS) {
    const v = bag[key]
    if (v == null || !Number.isFinite(v) || v <= 0) continue
    grains[POLLEN_FROM_KEY[key]] = Math.round(v * 10) / 10
  }
  return grains
}

function pickPollen(bag: Record<string, number | null | undefined>): {
  pollen: number | null
  pollenType: PollenType | null
} {
  let any = false
  let max = -1
  let type: PollenType | null = null
  for (const key of POLLEN_KEYS) {
    const v = bag[key]
    if (v == null || !Number.isFinite(v)) continue
    any = true
    if (v > max) {
      max = v
      type = POLLEN_FROM_KEY[key]
    }
  }
  if (!any) return { pollen: null, pollenType: null }
  return {
    pollen: Math.round(max * 10) / 10,
    pollenType: max > 0 ? type : null,
  }
}

function sampleFromFields(fields: RawCurrent): AirQualitySample {
  const { aqi, aqiScale } = pickAqi(fields.european_aqi, fields.us_aqi)
  const pollen = pickPollen(fields)
  const pollenGrains = pollenGrainsFromFields(fields)
  return {
    aqi,
    aqiScale,
    pm25:
      fields.pm2_5 != null && Number.isFinite(fields.pm2_5)
        ? Math.round(fields.pm2_5 * 10) / 10
        : null,
    pm10:
      fields.pm10 != null && Number.isFinite(fields.pm10)
        ? Math.round(fields.pm10 * 10) / 10
        : null,
    uvIndex:
      fields.uv_index != null && Number.isFinite(fields.uv_index)
        ? Math.round(fields.uv_index * 10) / 10
        : null,
    pollen: pollen.pollen,
    pollenType: pollen.pollenType,
    pollenGrains,
  }
}

export type AirQualityPayload = {
  current: AirQualitySample
  /** ISO hour → sample */
  byTime: Map<string, AirQualitySample>
}

export async function fetchAirQuality(
  latitude: number,
  longitude: number,
  forecastDays = 7,
): Promise<AirQualityPayload | null> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      "european_aqi",
      "us_aqi",
      "pm2_5",
      "pm10",
      "uv_index",
      ...POLLEN_KEYS,
    ].join(","),
    hourly: [
      "european_aqi",
      "us_aqi",
      "pm2_5",
      "pm10",
      "uv_index",
      ...POLLEN_KEYS,
    ].join(","),
    timezone: "auto",
    forecast_days: String(Math.min(7, Math.max(1, forecastDays))),
  })

  try {
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      current?: RawCurrent
      hourly?: RawBags
    }

    const current = sampleFromFields(data.current ?? {})
    const byTime = new Map<string, AirQualitySample>()
    const hourly = data.hourly
    const times = hourly?.time ?? []
    for (let i = 0; i < times.length; i++) {
      byTime.set(
        times[i],
        sampleFromFields({
          european_aqi: hourly?.european_aqi?.[i],
          us_aqi: hourly?.us_aqi?.[i],
          pm2_5: hourly?.pm2_5?.[i],
          pm10: hourly?.pm10?.[i],
          uv_index: hourly?.uv_index?.[i],
          alder_pollen: hourly?.alder_pollen?.[i],
          birch_pollen: hourly?.birch_pollen?.[i],
          grass_pollen: hourly?.grass_pollen?.[i],
          mugwort_pollen: hourly?.mugwort_pollen?.[i],
          olive_pollen: hourly?.olive_pollen?.[i],
          ragweed_pollen: hourly?.ragweed_pollen?.[i],
        }),
      )
    }

    return { current, byTime }
  } catch {
    return null
  }
}

/** European AQI bands (EAQI) */
export function aqiCategory(value: number, scale: AqiScale): string {
  if (scale === "us") {
    if (value <= 50) return "Good"
    if (value <= 100) return "Moderate"
    if (value <= 150) return "Unhealthy*"
    if (value <= 200) return "Unhealthy"
    if (value <= 300) return "Very unhealthy"
    return "Hazardous"
  }
  if (value <= 20) return "Good"
  if (value <= 40) return "Fair"
  if (value <= 60) return "Moderate"
  if (value <= 80) return "Poor"
  if (value <= 100) return "Very poor"
  return "Extremely poor"
}

export function uvCategory(uv: number): string {
  if (uv < 3) return "Low"
  if (uv < 6) return "Moderate"
  if (uv < 8) return "High"
  if (uv < 11) return "Very high"
  return "Extreme"
}

/** Rough CAMS grass-style bands for peak pollen grains/m³ */
export function pollenCategory(grains: number): string {
  if (grains <= 0) return "None"
  if (grains < 20) return "Low"
  if (grains < 50) return "Moderate"
  if (grains < 100) return "High"
  return "Very high"
}

export function formatAqi(value: number | null, scale: AqiScale): string {
  if (value == null) return "—"
  return `${value} · ${aqiCategory(value, scale)}`
}

export function formatUv(uv: number): string {
  return `${uv} · ${uvCategory(uv)}`
}

export function formatPollen(
  grains: number | null,
  type: PollenType | null,
): string {
  if (grains == null) return "—"
  const cat = pollenCategory(grains)
  if (grains <= 0) return cat
  const name = type ? POLLEN_TYPE_LABEL[type] : null
  return name ? `${cat} · ${name}` : cat
}
