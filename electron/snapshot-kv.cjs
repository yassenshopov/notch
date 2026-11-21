const fs = require("fs")
const path = require("path")
const { app } = require("electron")
const db = require("./db.cjs")

function mirrorPath(namespace, kind) {
  const safe = `${namespace}--${kind}`.replace(/[^a-zA-Z0-9._-]+/g, "_")
  return path.join(app.getPath("userData"), "kv-mirror", `${safe}.json`)
}

function readMirror(namespace, kind) {
  try {
    const raw = JSON.parse(fs.readFileSync(mirrorPath(namespace, kind), "utf8"))
    return {
      payload: raw?.payload ?? null,
      syncedAt: raw?.syncedAt ?? null,
    }
  } catch {
    return null
  }
}

function writeMirror(namespace, kind, payload, syncedAt) {
  const dir = path.dirname(mirrorPath(namespace, kind))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(
    mirrorPath(namespace, kind),
    JSON.stringify({ payload, syncedAt }, null, 0),
    "utf8",
  )
}

function syncedAtNum(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value)
  return null
}

async function readWithMeta(namespace, kind = "default") {
  if (db.isConfigured() && (await db.ensureReady())) {
    const sql = db.getSql()
    if (sql) {
      try {
        const rows = await sql`
          SELECT payload, synced_at
          FROM app_kv_snapshots
          WHERE namespace = ${namespace} AND kind = ${kind}
          LIMIT 1
        `
        const row = rows?.[0]
        if (row?.payload) {
          return {
            payload: row.payload,
            syncedAt: syncedAtNum(row.synced_at),
          }
        }
      } catch (err) {
        console.warn(`[notch] kv read ${namespace}/${kind}:`, err?.message || err)
      }
    }
  }
  return readMirror(namespace, kind)
}

async function read(namespace, kind = "default") {
  const row = await readWithMeta(namespace, kind)
  return row?.payload ?? null
}

async function write(namespace, kind, payload) {
  if (payload == null) return
  const syncedAt = Date.now()
  writeMirror(namespace, kind, payload, syncedAt)

  if (!db.isConfigured() || !(await db.ensureReady())) return
  const sql = db.getSql()
  if (!sql) return

  try {
    await sql`
      INSERT INTO app_kv_snapshots (namespace, kind, payload, synced_at)
      VALUES (
        ${namespace},
        ${kind},
        ${JSON.stringify(payload)}::jsonb,
        ${syncedAt}
      )
      ON CONFLICT (namespace, kind) DO UPDATE SET
        payload = EXCLUDED.payload,
        synced_at = EXCLUDED.synced_at,
        updated_at = now()
    `
  } catch (err) {
    console.warn(`[notch] kv write ${namespace}/${kind}:`, err?.message || err)
  }
}

async function remove(namespace, kind = "default") {
  try {
    fs.unlinkSync(mirrorPath(namespace, kind))
  } catch {
    // ignore
  }
  if (!db.isConfigured() || !(await db.ensureReady())) return
  const sql = db.getSql()
  if (!sql) return
  try {
    await sql`
      DELETE FROM app_kv_snapshots
      WHERE namespace = ${namespace} AND kind = ${kind}
    `
  } catch {
    // ignore
  }
}

module.exports = {
  read,
  readWithMeta,
  write,
  remove,
}