import type { HourlyPoint, WeatherSnapshot } from "../../src/lib/weather"

function hourPoint(partial: Partial<HourlyPoint> & Pick<HourlyPoint, "time" | "code">): HourlyPoint {
  return {
    temp: 12,
    feelsLike: 11,
    humidity: 50,
    windSpeed: 5,
    windDir: "N",
    windDegrees: 0,
    pressure: 1010,
    visibilityKm: 10,
    uvIndex: 1,
    precipProbability: 80,
    aqi: null,
    aqiScale: "us",
    pm25: null,
    pollen: null,
    pollenType: null,
    pollenGrains: 0,
    isDay: true,
    ...partial,
  }
}

export function rainyWeatherNow(): WeatherSnapshot {
  return {
    locationLabel: "Test",
    countryCode: "BG",
    temperature: 12,
    code: "rain",
    isDay: true,
    days: [],
    upcomingHours: [
      hourPoint({ time: new Date().toISOString(), code: "rain", precipProbability: 80 }),
    ],
    fetchedAt: Date.now(),
  }
}