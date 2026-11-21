function branchId() {
  return String(process.env.NEON_BRANCH_ID || "").trim()
}

function hostSuffix() {
  return String(process.env.NEON_FUNCTION_HOST_SUFFIX || "").trim()
}

function isConfigured() {
  return Boolean(branchId() && hostSuffix())
}

/** @param {string} functionName deployed function slug from neon.ts */
function functionUrl(functionName) {
  const slug = String(functionName || "").trim()
  if (!slug || !isConfigured()) return null
  const suffix = hostSuffix().startsWith(".") ? hostSuffix() : `.${hostSuffix()}`
  return `https://${branchId()}-${slug}${suffix}/`
}

async function fetchHello() {
  const url = functionUrl("hello")
  if (!url) {
    return { configured: false, ok: false, reason: "missing_neon_function_env" }
  }
  try {
    const res = await fetch(url)
    const body = await res.text()
    return {
      configured: true,
      ok: res.ok,
      status: res.status,
      url,
      body: body.slice(0, 500),
    }
  } catch (err) {
    return {
      configured: true,
      ok: false,
      url,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function status() {
  return {
    configured: isConfigured(),
    branch: process.env.NEON_BRANCH || null,
    branchId: branchId() || null,
    helloUrl: functionUrl("hello"),
  }
}

module.exports = {
  isConfigured,
  functionUrl,
  fetchHello,
  status,
}