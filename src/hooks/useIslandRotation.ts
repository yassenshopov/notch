import { useEffect, useMemo, useState } from "react"
import type { IslandFace } from "../config/settings"

type Options = {
  enabled: boolean
  intervalMs: number
  /** Faces that are available right now (settings + data) */
  available: IslandFace[]
}

/** Cycles a single collapsed face — weather → battery → clock → … */
export function useIslandRotation({ enabled, intervalMs, available }: Options) {
  const facesKey = available.join("|")
  const faces = useMemo(() => available, [facesKey])

  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [facesKey])

  useEffect(() => {
    if (!enabled || faces.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % faces.length)
    }, Math.max(2_000, intervalMs))
    return () => window.clearInterval(id)
  }, [enabled, faces, intervalMs])

  if (faces.length === 0) return null
  return faces[index % faces.length] ?? faces[0]
}
