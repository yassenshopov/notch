const fs = require("fs")
const http = require("http")
const path = require("path")

const VITE_URL = "http://127.0.0.1:5173/"
const PROJECT_ROOT = path.join(__dirname, "..")
const DIST_INDEX = path.join(PROJECT_ROOT, "dist", "index.html")
const DIST_META = path.join(PROJECT_ROOT, "dist", "build-meta.json")
const SRC_ROOT = path.join(PROJECT_ROOT, "src")
const ELECTRON_ROOT = path.join(PROJECT_ROOT, "electron")

/** @type {import('./ui-bundle.cjs').UiBundleInfo | null} */
let cachedInfo = null
/**
 * @typedef {{ useVite: boolean, distIndex: string, staleDist: boolean, builtAt: string | null, source: 'vite' | 'dist', unpackaged: boolean }} UiBundleInfo
 */

function readDistMeta() {
  try {
    if (!fs.existsSync(DIST_META)) return null
    return JSON.parse(fs.readFileSync(DIST_META, "utf8"))
  } catch {
    return null
  }
}

function newestSourceMtime() {
  let newest = 0
  let scanned = 0
  const maxFiles = 12_000
  const stack = [SRC_ROOT, ELECTRON_ROOT]

  while (stack.length > 0 && scanned < maxFiles) {
    const dir = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const ent of entries) {
      if (ent.name === "node_modules" || ent.name === "dist" || ent.name === ".git") continue
      const full = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        stack.push(full)
        continue
      }
      if (!/\.(tsx?|jsx?|cjs|mjs|css)$/i.test(ent.name)) continue
      scanned += 1
      try {
        const m = fs.statSync(full).mtimeMs
        if (m > newest) newest = m
      } catch {
        /* ignore */
      }
    }
  }
  return newest
}

function isDistStale() {
  if (!fs.existsSync(DIST_INDEX)) return true
  const distMtime = fs.statSync(DIST_INDEX).mtimeMs
  const srcMtime = newestSourceMtime()
  return srcMtime > distMtime + 750
}

function probeViteDevServer(timeoutMs = 450) {
  return new Promise((resolve) => {
    const req = http.get(VITE_URL, { timeout: timeoutMs }, (res) => {
      res.resume()
      resolve(res.statusCode != null && res.statusCode >= 200 && res.statusCode < 500)
    })
    req.on("error", () => resolve(false))
    req.on("timeout", () => {
      req.destroy()
      resolve(false)
    })
  })
}

function forceFlag(name) {
  const v = process.env[name]
  return v === "1" || v === "true"
}

/**
 * Decide whether renderer loads Vite or dist, and whether dist is behind source.
 * @param {import('electron').App} electronApp
 * @returns {Promise<UiBundleInfo>}
 */
async function resolveUiBundle(electronApp) {
  const unpackaged = !electronApp.isPackaged
  const distIndex = DIST_INDEX
  const meta = readDistMeta()
  const builtAt = typeof meta?.builtAt === "string" ? meta.builtAt : null
  const staleDist = unpackaged && isDistStale()

  if (!unpackaged) {
    cachedInfo = { useVite: false, distIndex, staleDist: false, builtAt, source: "dist", unpackaged: false }
    return cachedInfo
  }

  if (forceFlag("NOTCH_FORCE_DIST")) {
    cachedInfo = { useVite: false, distIndex, staleDist, builtAt, source: "dist", unpackaged: true }
    return cachedInfo
  }

  const wantVite =
    forceFlag("NOTCH_FORCE_VITE") ||
    forceFlag("ELECTRON_DEV") ||
    (process.env.NODE_ENV === "development" && !forceFlag("NOTCH_FORCE_DIST"))

  let viteUp = false
  if (wantVite || forceFlag("NOTCH_AUTO_VITE") || !forceFlag("NOTCH_NO_AUTO_VITE")) {
    viteUp = await probeViteDevServer()
  }

  if (viteUp) {
    cachedInfo = { useVite: true, distIndex, staleDist: false, builtAt, source: "vite", unpackaged: true }
    return cachedInfo
  }

  if (forceFlag("ELECTRON_DEV") || forceFlag("NOTCH_FORCE_VITE")) {
    console.error(
      "[notch] ELECTRON_DEV is set but Vite is not running on :5173. Start `npm run dev` or `npm run dev:web` first.",
    )
  }

  cachedInfo = { useVite: false, distIndex, staleDist, builtAt, source: "dist", unpackaged: true }
  return cachedInfo
}

function getUiBundleInfo() {
  return cachedInfo
}

function distLoadOptions() {
  if (!fs.existsSync(DIST_INDEX)) return {}
  const v = String(Math.floor(fs.statSync(DIST_INDEX).mtimeMs))
  return { query: { v } }
}

function allowDistFallbackInDev() {
  return forceFlag("NOTCH_ALLOW_DIST_FALLBACK")
}

module.exports = {
  DIST_INDEX,
  resolveUiBundle,
  getUiBundleInfo,
  distLoadOptions,
  allowDistFallbackInDev,
  probeViteDevServer,
  isDistStale,
}