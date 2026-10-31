/** POST to Wi-Fi Sense agent from main process (avoids renderer CORS / private-network blocks). */

async function agentPost(agentUrl, path, token, body) {
  const base = String(agentUrl || "").replace(/\/$/, "")
  if (!base) {
    return { ok: false, status: 0, error: "missing_agent_url" }
  }
  const headers = { "Content-Type": "application/json" }
  if (token && String(token).trim()) {
    headers.Authorization = `Bearer ${String(token).trim()}`
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
    })
    let parsed = null
    const text = await res.text()
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = { raw: text }
      }
    }
    return {
      ok: res.ok,
      status: res.status,
      body: parsed,
      error: res.ok ? null : (parsed?.detail ?? text ?? `http_${res.status}`),
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "wifi_sense_post_failed",
    }
  }
}

module.exports = { agentPost }
