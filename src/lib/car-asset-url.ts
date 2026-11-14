/** Resolve public/ assets for Vite dev, Electron file://, and production build. */
export function publicAssetUrl(relativePath: string) {
  const clean = relativePath.replace(/^\//, "")
  const base = import.meta.env.BASE_URL || "./"
  const baseUrl = new URL(base, window.location.href).href
  return new URL(clean, baseUrl).href
}