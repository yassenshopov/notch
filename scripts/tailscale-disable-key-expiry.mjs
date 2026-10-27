#!/usr/bin/env node
/**
 * Disable Tailscale node-key expiry for home servers (run on your laptop).
 *
 * 1. Create an API access token: https://login.tailscale.com/admin/settings/keys
 * 2. Add to .env: TAILSCALE_API_KEY=tskey-api-...
 * 3. node scripts/tailscale-disable-key-expiry.mjs
 */
import { readFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const envPath = resolve(root, ".env")

function loadEnv() {
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    const val = m[2].replace(/^["']|["']$/g, "").trim()
    if (!process.env[m[1]]) process.env[m[1]] = val
  }
}

loadEnv()

const apiKey = process.env.TAILSCALE_API_KEY?.trim()
const tailnet = (process.env.TAILSCALE_TAILNET || "yassenshopov00.github").trim()
const hostnames = (process.env.TAILSCALE_NO_EXPIRY_HOSTS || "raspberrypi,yassenshopov-x540na")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean)

if (!apiKey) {
  console.error("Missing TAILSCALE_API_KEY in .env (create at login.tailscale.com → Settings → Keys)")
  process.exit(1)
}

const auth = Buffer.from(`${apiKey}:`).toString("base64")

async function api(path, options = {}) {
  const res = await fetch(`https://api.tailscale.com/api/v2${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${options.method || "GET"} ${path} → ${res.status}: ${body}`)
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") return {}
  const text = await res.text()
  return text ? JSON.parse(text) : {}
}

const list = await api(`/tailnet/${encodeURIComponent(tailnet)}/devices`)
const devices = list.devices || []

for (const device of devices) {
  const name = String(device.name || device.hostname || "").toLowerCase()
  const short = name.split(".")[0]
  if (!hostnames.some((h) => short === h || name.includes(h))) continue
  const id = device.id || device.nodeId
  if (!id) continue
  await api(`/device/${encodeURIComponent(id)}/key`, {
    method: "POST",
    body: JSON.stringify({ keyExpiryDisabled: true }),
  })
  console.log(`Disabled key expiry: ${device.name || short} (${id})`)
}

if (!devices.length) {
  console.warn("No devices returned — check TAILSCALE_TAILNET (e.g. yassenshopov00.github)")
}
