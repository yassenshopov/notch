import { createRequire } from "node:module"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const require = createRequire(import.meta.url)
const { createSmartCache } = require("../../electron/smart-cache.cjs")

describe("createSmartCache", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns fresh value within ttl", async () => {
    const cache = createSmartCache()
    const fetcher = vi.fn().mockResolvedValue("a")
    const value = await cache.get("k", { ttlMs: 1000, staleMs: 2000, fetcher })
    expect(value).toBe("a")
    expect(fetcher).toHaveBeenCalledTimes(1)
    fetcher.mockResolvedValue("b")
    await expect(cache.get("k", { ttlMs: 1000, staleMs: 2000, fetcher })).resolves.toBe("a")
  })

  it("dedupes in-flight fetches", async () => {
    const cache = createSmartCache()
    let resolve!: (v: string) => void
    const fetcher = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r
        }),
    )
    const p1 = cache.get("k", { ttlMs: 0, staleMs: 0, fetcher })
    const p2 = cache.get("k", { ttlMs: 0, staleMs: 0, fetcher })
    resolve("x")
    expect(await p1).toBe("x")
    expect(await p2).toBe("x")
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})