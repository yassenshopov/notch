/**
 * Validate Wi-Fi Sense agent HTTP targets from IPC (SSRF hardening).
 *
 * @param {unknown} agentUrl
 * @param {unknown} path
 * @param {unknown} allowedAgentUrl
 */
function parseAgentRequest(agentUrl, path, allowedAgentUrl) {
  const base = String(agentUrl || "")
    .trim()
    .replace(/\/$/, "")
  if (!base) {
    throw new Error("missing_agent_url")
  }

  let parsed
  try {
    parsed = new URL(base)
  } catch {
    throw new Error("invalid_agent_url")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("invalid_agent_protocol")
  }
  if (parsed.username || parsed.password) {
    throw new Error("agent_url_credentials_forbidden")
  }

  const allowed = String(allowedAgentUrl || "")
    .trim()
    .replace(/\/$/, "")
  if (allowed) {
    let allowedParsed
    try {
      allowedParsed = new URL(allowed)
    } catch {
      throw new Error("invalid_allowed_agent_url")
    }
    const sameOrigin =
      allowedParsed.protocol === parsed.protocol &&
      allowedParsed.hostname === parsed.hostname &&
      allowedParsed.port === parsed.port
    if (!sameOrigin) {
      throw new Error("agent_url_mismatch")
    }
  }

  const rawPath = String(path || "").trim()
  const normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`
  if (!normalized.startsWith("/") || normalized.includes("..") || /\s/.test(normalized)) {
    throw new Error("invalid_agent_path")
  }

  return { base, path: normalized }
}

module.exports = { parseAgentRequest }