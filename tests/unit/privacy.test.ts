import { describe, expect, it } from "vitest"
import { maskEmail, maskHost, maskLogin } from "../../src/lib/privacy"

describe("privacy masks", () => {
  it("maskEmail hides local and domain when enabled", () => {
    expect(maskEmail("yassen@example.com", true)).toBe("y•••n@e•••.com")
    expect(maskEmail("yassen@example.com", false)).toBe("yassen@example.com")
  })

  it("maskHost shortens fqdn", () => {
    expect(maskHost("pi.local", true)).toBe("•••.local")
  })

  it("maskLogin trims long logins", () => {
    expect(maskLogin("yassenshopov", true)).toBe("ya•••")
    expect(maskLogin("ab", true)).toBe("ab")
  })
})