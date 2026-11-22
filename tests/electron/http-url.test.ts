import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const { isHttpUrl } = require("../../electron/http-url.cjs")

describe("isHttpUrl", () => {
  it("accepts http and https", () => {
    expect(isHttpUrl("https://example.com")).toBe(true)
    expect(isHttpUrl(" http://127.0.0.1:8080 ")).toBe(true)
  })

  it("rejects other schemes", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false)
    expect(isHttpUrl("")).toBe(false)
    expect(isHttpUrl(null)).toBe(false)
  })
})