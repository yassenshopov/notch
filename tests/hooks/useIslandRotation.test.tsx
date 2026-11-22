import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { useIslandRotation } from "../../src/hooks/useIslandRotation"

describe("useIslandRotation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns first face when disabled", () => {
    const { result } = renderHook(() =>
      useIslandRotation({ enabled: false, intervalMs: 5000, available: ["weather", "clock"] }),
    )
    expect(result.current).toBe("weather")
  })

  it("rotates faces on interval", () => {
    const { result } = renderHook(() =>
      useIslandRotation({ enabled: true, intervalMs: 3000, available: ["weather", "clock"] }),
    )
    expect(result.current).toBe("weather")
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current).toBe("clock")
  })
})