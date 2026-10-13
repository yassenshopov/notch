import {
  fetchAirQuality,
  type AirQualityPayload,
  type AirQualitySample,
  type AqiScale,
  type PollenType,
} from "./air-quality"
import { getSettings } from "../config/settings-store"
import { normalizeWindDegrees, windDirection } from "./utils"

export type WeatherCode =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder"

export type HourlyPoint = {
  time: string
  temp: number
  feelsLike: number
  humidity: number
  windSpeed: number
  windDir: string
  windDegrees: number
  pressure: number
  visibilityKm: number
  uvIndex: number
  aqi: number | null
  aqiScale: AqiScale
  pm25: number | null
  pollen: number | null
  pollenType: PollenType | null
  code: WeatherCode
  isDay: boolean
}

export type DayForecast = {
  date: string
  isToday: boolean
  high: number
  low: number
  code: WeatherCode
  sunrise: string
  sunset: string
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  windDir: string
  windDegrees: number
  pressure: number
  visibilityKm: number
  uvIndex: number
  aqi: number | null
  aqiScale: AqiScale
  pm25: number | null
  pollen: number | null
  pollenType: PollenType | null
  isDay: boolean
  /** Compact strip for the overview row */
  hourly: HourlyPoint[]
  /** Denser day series for metric graphs */
  series: HourlyPoint[]
}

export type WeatherSnapshot = {
  locationLabel: string
  temperature: number
  code: WeatherCode
  isDay: boolean
  days: DayForecast[]
  fetchedAt: number
}

export type WeatherMetric =
  | "sunrise"
  | "sunset"
  | "feelsLike"
  | "wind"
  | "humidity"
  | "pressure"
  | "visibility"
  | "uv"
  | "aqi"
  | "pollen"

type GeoResult = {
  latitude: number
  longitude: number
  label: string
}

type HourlyBags = {
  time: string[]
  temperature_2m: number[]
  apparent_temperature: number[]
  relative_humidity_2m: number[]
  weather_code: number[]
  visibility: number[]
  uv_index: number[]
  is_day: number[]
  wind_speed_10m: number[]
  wind_direction_10m: number[]
  surface_pressure: number[]
}

function mapWeatherCode(code: number): WeatherCode {
  if (code === 0) return "clear"
  if (code <= 2) return "partly"
  if (code === 3) return "cloudy"
  if (code === 45 || code === 48) return "fog"
  if (code >= 51 && code <= 57) return "drizzle"
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain"
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow"
  if (code >= 95) return "thunder"
  return "cloudy"
}

function dateKey(iso: string) {
  return iso.slice(0, 10)
}

const emptyAq: AirQualitySample = {
  aqi: null,
  aqiScale: "european",
  pm25: null,
  pm10: null,
  uvIndex: null,
  pollen: null,
  pollenType: null,
}

function aqAt(aq: AirQualityPayload | null, time: string): AirQualitySample {
  return aq?.byTime.get(time) ?? emptyAq
}

function pointAt(hourly: HourlyBags, i: number, aq: AirQualityPayload | null): HourlyPoint {
  const windDegrees = normalizeWindDegrees(hourly.wind_direction_10m[i])
  const time = hourly.time[i]
  const air = aqAt(aq, time)
  const forecastUv = Math.round((hourly.uv_index?.[i] ?? 0) * 10) / 10
  return {
    time,
    temp: hourly.temperature_2m[i],
    feelsLike: hourly.apparent_temperature[i],
    humidity: hourly.relative_humidity_2m[i],
    windSpeed: hourly.wind_speed_10m[i],
    windDir: windDirection(windDegrees),
    windDegrees,
    pressure: Math.round(hourly.surface_pressure[i]),
    visibilityKm: Math.round(((hourly.visibility?.[i] ?? 10000) / 1000) * 10) / 10,
    uvIndex: air.uvIndex ?? forecastUv,
    aqi: air.aqi,
    aqiScale: air.aqiScale,
    pm25: air.pm25,
    pollen: air.pollen,
    pollenType: air.pollenType,
    code: mapWeatherCode(hourly.weather_code[i]),
    isDay: hourly.is_day[i] === 1,
  }
}

async function resolveLocation(): Promise<GeoResult> {
  const settings = getSettings()
  if (settings.location.mode === "manual") {
    return {
      latitude: settings.location.latitude,
      longitude: settings.location.longitude,
      label: settings.location.label,
    }
  }

  try {
    const res = await fetch("https://ipapi.co/json/")
    if (res.ok) {
      const data = (await res.json()) as {
        latitude?: number
        longitude?: number
        city?: string
        country_name?: string
        error?: boolean
      }
      if (!data.error && data.latitude != null && data.longitude != null) {
        const city = data.city ?? "Unknown"
        const country = data.country_name ?? ""
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          label: country ? `${city}, ${country}` : city,
        }
      }
    }
  } catch {
    // fall through
  }

  return {
    latitude: 52.52,
    longitude: 13.41,
    label: "Berlin, Germany",
  }
}

function dayIndices(day: string, times: string[]) {
  return times.map((t, i) => (dateKey(t) === day ? i : -1)).filter((i) => i >= 0)
}

function pickOverviewHours(
  indices: number[],
  times: string[],
  isToday: boolean,
  nowMs: number,
): number[] {
  if (indices.length === 0) return []

  if (isToday) {
    let start = indices.findIndex((i) => new Date(times[i]).getTime() >= nowMs)
    if (start < 0) start = Math.max(0, indices.length - 6)
    else if (start > 0) start -= 1
    return indices.slice(start, start + 6)
  }

  const targets = [6, 9, 12, 15, 18, 21]
  const chosen = targets
    .map((hour) => indices.find((i) => new Date(times[i]).getHours() === hour))
    .filter((i): i is number => i != null)
  if (chosen.length >= 4) return chosen.slice(0, 6)

  const step = Math.max(1, Math.floor(indices.length / 6))
  return Array.from({ length: 6 }, (_, n) => indices[Math.min(n * step, indices.length - 1)])
}

function pickSeriesHours(indices: number[]): number[] {
  if (indices.length <= 12) return indices
  const step = Math.max(1, Math.floor(indices.length / 12))
  const out: number[] = []
  for (let i = 0; i < indices.length && out.length < 12; i += step) out.push(indices[i])
  const last = indices[indices.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

function sampleAt(day: string, hourly: HourlyBags, values: number[], hour = 12): number {
  const idx = hourly.time.findIndex((t) => dateKey(t) === day && new Date(t).getHours() === hour)
  if (idx >= 0) return values[idx]
  const any = hourly.time.findIndex((t) => dateKey(t) === day)
  return any >= 0 ? values[any] : 0
}

export async function fetchWeather(): Promise<WeatherSnapshot> {
  const settings = getSettings()
  const loc = await resolveLocation()
  const tempUnit = settings.temperatureUnit
  const windUnit = settings.windSpeedUnit

  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "surface_pressure",
      "is_day",
    ].join(","),
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "weather_code",
      "visibility",
      "uv_index",
      "is_day",
      "wind_speed_10m",
      "wind_direction_10m",
      "surface_pressure",
    ].join(","),
    daily: ["weather_code", "temperature_2m_max", "temperature_2m_min", "sunrise", "sunset"].join(
      ",",
    ),
    timezone: "auto",
    forecast_days: "7",
    temperature_unit: tempUnit,
    wind_speed_unit: windUnit,
  })

  const [res, air] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`),
    fetchAirQuality(loc.latitude, loc.longitude, 7),
  ])
  if (!res.ok) throw new Error("Weather request failed")

  const data = await res.json()
  const nowMs = Date.now()
  const todayKey = dateKey(new Date().toISOString())
  const apiToday = data.daily.time[0] as string
  const hourly = data.hourly as HourlyBags

  let currentHourIndex = hourly.time.findIndex((t: string) => new Date(t).getTime() >= nowMs)
  if (currentHourIndex < 0) currentHourIndex = Math.max(0, hourly.time.length - 1)
  else if (currentHourIndex > 0) currentHourIndex -= 1

  const days: DayForecast[] = data.daily.time.slice(0, 7).map((date: string, i: number) => {
    const isToday = date === apiToday || date === todayKey
    const indices = dayIndices(date, hourly.time)
    const overviewIdx = pickOverviewHours(indices, hourly.time, isToday, nowMs)
    const seriesIdx = pickSeriesHours(indices)
    const overview = overviewIdx.map((idx) => pointAt(hourly, idx, air))
    const series = seriesIdx.map((idx) => pointAt(hourly, idx, air))

    if (isToday) {
      const visibilityM = hourly.visibility?.[currentHourIndex] ?? 10000
      const forecastUv = hourly.uv_index?.[currentHourIndex] ?? 0
      const currentAq = air?.current ?? aqAt(air, hourly.time[currentHourIndex])
      return {
        date,
        isToday: true,
        high: data.daily.temperature_2m_max[i],
        low: data.daily.temperature_2m_min[i],
        code: mapWeatherCode(data.current.weather_code),
        sunrise: data.daily.sunrise[i],
        sunset: data.daily.sunset[i],
        temperature: data.current.temperature_2m,
        feelsLike: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        windDir: windDirection(data.current.wind_direction_10m),
        windDegrees: normalizeWindDegrees(data.current.wind_direction_10m),
        pressure: Math.round(data.current.surface_pressure),
        visibilityKm: Math.round((visibilityM / 1000) * 10) / 10,
        uvIndex: currentAq.uvIndex ?? Math.round(forecastUv * 10) / 10,
        aqi: currentAq.aqi,
        aqiScale: currentAq.aqiScale,
        pm25: currentAq.pm25,
        pollen: currentAq.pollen,
        pollenType: currentAq.pollenType,
        isDay: data.current.is_day === 1,
        hourly: overview,
        series,
      }
    }

    const noonIdx = hourly.time.findIndex(
      (t) => dateKey(t) === date && new Date(t).getHours() === 12,
    )
    const sampleIdx = noonIdx >= 0 ? noonIdx : hourly.time.findIndex((t) => dateKey(t) === date)
    const visibilityM = hourly.visibility?.[sampleIdx] ?? 10000
    const forecastUv = hourly.uv_index?.[sampleIdx] ?? 0
    const noonAq = aqAt(air, hourly.time[sampleIdx] ?? "")

    return {
      date,
      isToday: false,
      high: data.daily.temperature_2m_max[i],
      low: data.daily.temperature_2m_min[i],
      code: mapWeatherCode(data.daily.weather_code[i]),
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
      temperature: data.daily.temperature_2m_max[i],
      feelsLike: sampleAt(date, hourly, hourly.apparent_temperature),
      humidity: Math.round(sampleAt(date, hourly, hourly.relative_humidity_2m)),
      windSpeed: sampleAt(date, hourly, hourly.wind_speed_10m),
      windDir: windDirection(sampleAt(date, hourly, hourly.wind_direction_10m)),
      windDegrees: normalizeWindDegrees(sampleAt(date, hourly, hourly.wind_direction_10m)),
      pressure: Math.round(sampleAt(date, hourly, hourly.surface_pressure)),
      visibilityKm: Math.round((visibilityM / 1000) * 10) / 10,
      uvIndex: noonAq.uvIndex ?? Math.round(forecastUv * 10) / 10,
      aqi: noonAq.aqi,
      aqiScale: noonAq.aqiScale,
      pm25: noonAq.pm25,
      pollen: noonAq.pollen,
      pollenType: noonAq.pollenType,
      isDay: true,
      hourly: overview,
      series,
    }
  })

  const today = days.find((d) => d.isToday) ?? days[0]

  return {
    locationLabel: loc.label,
    temperature: today.temperature,
    code: today.code,
    isDay: today.isDay,
    days,
    fetchedAt: Date.now(),
  }
}
