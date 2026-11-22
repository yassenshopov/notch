import { describe, expect, it } from "vitest"
import {
  collectLiveActivities,
  collectWeatherPrecipActivity,
  snoozeWeatherPrecipActivity,
} from "../../src/lib/live-activities"
import { makeSettings } from "../fixtures/app-settings"
import { rainyWeatherNow } from "../fixtures/weather"

describe("collectWeatherPrecipActivity", () => {
  it("returns rain now label", () => {
    const activity = collectWeatherPrecipActivity(rainyWeatherNow(), makeSettings())
    expect(activity?.label).toBe("Rain now")
    expect(activity?.panel).toBe("weather")
  })

  it("respects snooze", () => {
    const settings = makeSettings({
      liveActivities: {
        weather: { snoozedUntilMs: Date.now() + 60_000, snoozedForId: "weather-now-rain" },
      },
    })
    expect(collectWeatherPrecipActivity(rainyWeatherNow(), settings)).toBeNull()
  })
})

describe("snoozeWeatherPrecipActivity", () => {
  it("extends snooze window", () => {
    const next = snoozeWeatherPrecipActivity(makeSettings(), "id-1")
    expect(next.snoozedForId).toBe("id-1")
    expect(next.snoozedUntilMs).toBeGreaterThan(Date.now())
  })
})

describe("collectLiveActivities", () => {
  it("sorts by priority", () => {
    const settings = makeSettings()
    const items = collectLiveActivities(rainyWeatherNow(), null, settings)
    expect(items.length).toBe(1)
    expect(items[0].priority).toBe(40)
  })
})