import { describe, expect, it } from "vitest"
import {
  resolveNotificationActionLabel,
  resolveNotificationSubjectTypeLabel,
  splitRepoPath,
} from "../../src/lib/github-notification-labels"

describe("resolveNotificationActionLabel", () => {
  it("maps known reasons", () => {
    expect(resolveNotificationActionLabel({ reason: "mention" } as never)).toBe("Mentioned you")
  })

  it("prefers explicit label", () => {
    expect(
      resolveNotificationActionLabel({ actionLabel: "Custom", reason: "mention" } as never),
    ).toBe("Custom")
  })
})

describe("resolveNotificationSubjectTypeLabel", () => {
  it("maps pull requests", () => {
    expect(resolveNotificationSubjectTypeLabel({ subjectType: "PullRequest" } as never)).toBe(
      "Pull request",
    )
  })
})

describe("splitRepoPath", () => {
  it("splits owner and name", () => {
    expect(splitRepoPath("org/notch")).toEqual({ owner: "org", name: "notch" })
  })
})