import { describe, expect, it } from "vitest"
import {
  islandFaceToPanel,
  panelForCollapsedTap,
  panelLabel,
} from "../../src/lib/panel-routing"

describe("panelForCollapsedTap", () => {
  it("prioritizes spotify when playing", () => {
    expect(
      panelForCollapsedTap({
        spotifyPlaying: true,
        browserMediaActive: false,
        liveActivity: null,
        timerShowing: false,
        islandFace: "weather",
      }),
    ).toBe("spotify")
  })

  it("opens live activity panel", () => {
    expect(
      panelForCollapsedTap({
        spotifyPlaying: false,
        browserMediaActive: false,
        liveActivity: {
          id: "x",
          kind: "cursor-usage",
          panel: "cursor",
          label: "Cursor 90%",
          priority: 100,
        },
        timerShowing: false,
        islandFace: "weather",
      }),
    ).toBe("cursor")
  })

  it("maps battery face to controls", () => {
    expect(islandFaceToPanel("battery")).toBe("controls")
  })

  it("labels panels", () => {
    expect(panelLabel("github")).toBe("GitHub")
    expect(panelLabel("wifi-sense")).toBe("Wi‑Fi Sense")
  })

  it("maps island faces", () => {
    expect(
      panelForCollapsedTap({
        spotifyPlaying: false,
        browserMediaActive: false,
        liveActivity: null,
        timerShowing: false,
        islandFace: "github",
      }),
    ).toBe("github")
  })
})