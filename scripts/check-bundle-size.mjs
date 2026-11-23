import fs from "node:fs"
import path from "node:path"

const DIST = path.resolve("dist/assets")
const MAX_THREE_KB = 720

const files = fs.readdirSync(DIST).filter((f) => f.startsWith("three-") && f.endsWith(".js"))

let failed = false
for (const file of files) {
  const bytes = fs.statSync(path.join(DIST, file)).size
  const kb = bytes / 1024
  if (file.startsWith("three-") && kb > MAX_THREE_KB) {
    console.error(`[bundle] ${file} is ${kb.toFixed(0)} kB (limit ${MAX_THREE_KB} kB)`)
    failed = true
  }
}

if (failed) process.exit(1)
console.info("[bundle] three chunks within limit")