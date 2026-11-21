import fs from "fs"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"
import dotenv from "dotenv"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
dotenv.config({ path: path.join(root, ".env") })

const defaultDir = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads",
  "Spotify Extended Streaming History",
)

const dirArg = process.argv[2]?.trim()
const sourceDir = path.resolve(
  dirArg ||
    process.env.SPOTIFY_EXTENDED_HISTORY_DIR?.trim() ||
    defaultDir,
)

if (!fs.existsSync(sourceDir)) {
  console.error(`FAIL  directory not found: ${sourceDir}`)
  console.error(
    "Usage: npm run import:spotify-history [-- <path-to-export-folder>]",
  )
  process.exit(1)
}

const db = await import(pathToFileURL(path.join(root, "electron", "db.cjs")).href)
const library = await import(
  pathToFileURL(path.join(root, "electron", "spotify-library.cjs")).href,
)

const init = await db.init()
if (!init?.ok) {
  console.error("FAIL  database init", init)
  process.exit(1)
}

console.log(`Importing Spotify extended history from:\n  ${sourceDir}\n`)

const result = await library.importDirectory(sourceDir)
console.log(JSON.stringify(result, null, 2))

if (!result.ok) {
  process.exit(1)
}

const status = await library.libraryStatus()
console.log(JSON.stringify({ library: status }, null, 2))
process.exit(0)