import { describe, expect, it } from "vitest"
import { getStravaMapTileLayerProps, stravaLeafletInteraction } from "../../src/lib/strava-map-tiles"

describe("stravaLeafletInteraction", () => {
  it("disables interaction by default", () => {
    const opts = stravaLeafletInteraction()
    expect(opts.scrollWheelZoom).toBe(false)
    expect(stravaLeafletInteraction(true).dragging).toBe(true)
  })
})

describe("getStravaMapTileLayerProps", () => {
  it("appends api key when override provided", () => {
    const layer = getStravaMapTileLayerProps("test-key")
    expect(layer.url).toContain("key=test-key")
    expect(layer.subdomains).toBe("abcd")
  })
})