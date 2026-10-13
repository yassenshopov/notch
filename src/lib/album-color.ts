export type AlbumPalette = {
  bg: string
  bgSoft: string
  fg: string
  muted: string
  subtle: string
  control: string
  controlFg: string
}

type Rgb = { r: number; g: number; b: number }

function clamp(n: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, n))
}

function toCss({ r, g, b }: Rgb, a = 1) {
  if (a >= 1) return `rgb(${r}, ${g}, ${b})`
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function luminance({ r, g, b }: Rgb) {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  }
}

function saturate(c: Rgb, amount: number): Rgb {
  const avg = (c.r + c.g + c.b) / 3
  return {
    r: clamp(Math.round(avg + (c.r - avg) * amount)),
    g: clamp(Math.round(avg + (c.g - avg) * amount)),
    b: clamp(Math.round(avg + (c.b - avg) * amount)),
  }
}

function buildPalette(raw: Rgb): AlbumPalette {
  // Spotify-like: deepen + slightly boost chroma for a rich panel
  let base = saturate(raw, 1.25)
  const lum = luminance(base)
  // Prefer a dark-ish panel for artwork colors; lift very dark ones a bit
  if (lum < 0.08) base = mix(base, { r: 40, g: 40, b: 40 }, 0.45)
  else if (lum > 0.55) base = mix(base, { r: 0, g: 0, b: 0 }, 0.45)
  else base = mix(base, { r: 0, g: 0, b: 0 }, 0.28)

  const bg = base
  const bgSoft = mix(base, { r: 255, g: 255, b: 255 }, 0.08)
  const lightFg = luminance(bg) > 0.42
  const fg = lightFg ? { r: 18, g: 18, b: 18 } : { r: 255, g: 255, b: 255 }
  const muted = lightFg ? toCss(fg, 0.55) : toCss(fg, 0.55)
  const subtle = lightFg ? toCss(fg, 0.35) : toCss(fg, 0.35)
  const control = lightFg ? { r: 18, g: 18, b: 18 } : { r: 255, g: 255, b: 255 }
  const controlFg = lightFg ? { r: 255, g: 255, b: 255 } : { r: 18, g: 18, b: 18 }

  return {
    bg: toCss(bg),
    bgSoft: toCss(bgSoft),
    fg: toCss(fg),
    muted,
    subtle,
    control: toCss(control),
    controlFg: toCss(controlFg),
  }
}

/** Extract a weighted dominant color from album art (CORS-safe when CDN allows). */
export function extractAlbumPalette(imageUrl: string): Promise<AlbumPalette | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    const fail = () => resolve(null)
    const timer = window.setTimeout(fail, 3500)

    img.onload = () => {
      window.clearTimeout(timer)
      try {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) {
          resolve(null)
          return
        }

        const maxSize = 64
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
        canvas.width = Math.max(1, Math.floor(img.width * scale))
        canvas.height = Math.max(1, Math.floor(img.height * scale))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const buckets = new Map<string, { r: number; g: number; b: number; w: number }>()

        const step = 4 * 3 // every 3rd pixel
        for (let i = 0; i < data.length; i += step) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]
          if (a < 140) continue

          // Skip near-white / near-black noise
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          if (max < 28 || min > 235) continue

          const pixelIndex = i / 4
          const x = pixelIndex % canvas.width
          const y = Math.floor(pixelIndex / canvas.width)
          const cx = canvas.width / 2
          const cy = canvas.height / 2
          const dist = Math.hypot(x - cx, y - cy)
          const maxDist = Math.hypot(cx, cy) || 1
          const centerWeight = 1.15 - (dist / maxDist) * 0.55

          // Quantize to reduce noise
          const qr = r >> 4
          const qg = g >> 4
          const qb = b >> 4
          const key = `${qr},${qg},${qb}`
          const existing = buckets.get(key)
          if (existing) {
            existing.r += r * centerWeight
            existing.g += g * centerWeight
            existing.b += b * centerWeight
            existing.w += centerWeight
          } else {
            buckets.set(key, {
              r: r * centerWeight,
              g: g * centerWeight,
              b: b * centerWeight,
              w: centerWeight,
            })
          }
        }

        let best: { r: number; g: number; b: number; w: number } | null = null
        for (const bucket of buckets.values()) {
          if (!best || bucket.w > best.w) best = bucket
        }

        if (!best || best.w <= 0) {
          resolve(null)
          return
        }

        resolve(
          buildPalette({
            r: clamp(Math.round(best.r / best.w)),
            g: clamp(Math.round(best.g / best.w)),
            b: clamp(Math.round(best.b / best.w)),
          }),
        )
      } catch {
        resolve(null)
      }
    }

    img.onerror = fail
    img.src = imageUrl
  })
}
