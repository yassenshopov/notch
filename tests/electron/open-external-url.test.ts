import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const { openExternalHttpUrl } = require("../../electron/ipc/open-external-url.cjs")

describe("openExternalHttpUrl", () => {
  it("rejects missing and invalid URLs without calling shell", async () => {
    await expect(openExternalHttpUrl("")).resolves.toEqual({ ok: false, reason: "missing_url" })
    await expect(openExternalHttpUrl(null)).resolves.toEqual({ ok: false, reason: "missing_url" })
    await expect(openExternalHttpUrl("javascript:alert(1)")).resolves.toEqual({
      ok: false,
      reason: "invalid_scheme",
    })
  })
})