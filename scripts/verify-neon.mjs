import fs from "fs"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"
import dotenv from "dotenv"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const envPath = path.join(root, ".env")
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const db = await import(pathToFileURL(path.join(root, "electron", "db.cjs")).href)
const neonFns = await import(
  pathToFileURL(path.join(root, "electron", "neon-functions.cjs")).href
)

function section(name, result) {
  const line = `${result.ok ? "OK" : "FAIL"}  ${name}`
  console.log(line)
  console.log(JSON.stringify(result, null, 2))
  return result.ok
}

let allOk = true

if (!process.env.DATABASE_URL?.trim()) {
  console.error("FAIL  DATABASE_URL missing (run neon deploy)")
  process.exit(1)
}

const dbInit = await db.init()
allOk = section("postgres migrations", {
  ok: Boolean(dbInit.ok),
  ...db.status(),
  init: dbInit,
}) && allOk

const ping = await db.getSql()`SELECT current_database() AS db, version() AS version`
allOk =
  section("postgres query (pooled DATABASE_URL)", {
    ok: Array.isArray(ping) && ping.length > 0,
    database: ping?.[0]?.db,
    version: String(ping?.[0]?.version || "").split("\n")[0],
  }) && allOk

const hello = await neonFns.fetchHello()
allOk =
  section("neon function hello", {
    ok: hello.ok === true,
    ...hello,
  }) && allOk

const migrationRows = await db.getSql()`
  SELECT version FROM schema_migrations ORDER BY version
`
const versions = (migrationRows || []).map((r) => Number(r.version))
allOk =
  section("schema migrations applied", {
    ok:
      versions.includes(1) &&
      versions.includes(2) &&
      versions.includes(3) &&
      versions.includes(4) &&
      versions.includes(5),
    versions,
  }) && allOk

process.exit(allOk ? 0 : 1)