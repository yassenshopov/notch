import { describe, expect, it } from "vitest"
import { notchIntegrationPolls, pollPanel } from "../../src/lib/notch-poll"
import { makeSettings } from "../fixtures/app-settings"

describe("pollPanel", () => {
  it("desktop polls only active panel", () => {
    expect(pollPanel("github", "github", "desktop", false)).toBe(true)
    expect(pollPanel("github", "spotify", "desktop", true)).toBe(false)
  })

  it("collapsed uses island face", () => {
    expect(pollPanel("markets", "weather", "collapsed", true)).toBe(true)
    expect(pollPanel("markets", "weather", "collapsed", false)).toBe(false)
  })
})

describe("notchIntegrationPolls", () => {
  it("enables overview polls on desktop overview", () => {
    const settings = makeSettings()
    const polls = notchIntegrationPolls("desktop", "overview", settings)
    expect(polls.overviewPoll).toBe(true)
    expect(polls.githubPoll).toBe(true)
    expect(polls.marketsPoll).toBe(true)
  })

  it("does not poll cursor on collapsed island", () => {
    const polls = notchIntegrationPolls("collapsed", "weather", makeSettings())
    expect(polls.cursorPoll).toBe(false)
  })
})