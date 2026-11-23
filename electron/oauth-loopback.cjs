const crypto = require("crypto")
const http = require("http")
const { shell } = require("electron")

/**
 * Shared loopback OAuth with CSRF `state` and single in-flight guard.
 *
 * @param {{
 *   port: number,
 *   timeoutMs?: number,
 *   getInFlight?: () => boolean,
 *   setInFlight?: (value: boolean) => void,
 *   buildAuthorizeUrl: (state: string) => string,
 *   onCallback: (code: string) => Promise<void>,
 *   successHtml?: string,
 *   failHtml?: string,
 * }} options
 */
function runLoopbackOAuth(options) {
  const {
    port,
    timeoutMs = 5 * 60 * 1000,
    getInFlight = () => false,
    setInFlight = () => {},
    buildAuthorizeUrl,
    onCallback,
    successHtml = "<h1>Connected</h1><p>You can close this window and return to Notch.</p>",
    failHtml = "<h1>Auth failed</h1><p>You can close this window.</p>",
  } = options

  if (getInFlight()) {
    return Promise.reject(new Error("auth_in_progress"))
  }
  setInFlight(true)

  const state = crypto.randomBytes(24).toString("base64url")

  return new Promise((resolve, reject) => {
    let settled = false
    /** @type {import("http").Server | null} */
    let server = null
    /** @type {ReturnType<typeof setTimeout> | null} */
    let timer = null

    const cleanup = () => {
      setInFlight(false)
      if (timer) clearTimeout(timer)
      if (server) {
        try {
          server.close()
        } catch {
          // ignore
        }
        server = null
      }
    }

    const finish = (err, result) => {
      if (settled) return
      settled = true
      cleanup()
      if (err) reject(err)
      else resolve(result)
    }

    server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://127.0.0.1:${port}`)
        if (url.pathname !== "/callback") {
          res.writeHead(404)
          res.end()
          return
        }

        const error = url.searchParams.get("error")
        const code = url.searchParams.get("code")
        const returnedState = url.searchParams.get("state")

        if (returnedState !== state) {
          res.writeHead(400, { "Content-Type": "text/html" })
          res.end(failHtml)
          finish(new Error("invalid_state"))
          return
        }

        if (error || !code) {
          res.writeHead(400, { "Content-Type": "text/html" })
          res.end(failHtml)
          finish(new Error(error || "missing_code"))
          return
        }

        await onCallback(code)

        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(successHtml)
        finish(null, true)
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" })
        res.end("<h1>Auth error</h1><p>You can close this window.</p>")
        finish(err instanceof Error ? err : new Error("auth_error"))
      }
    })

    server.on("error", (err) => finish(err))

    server.listen(port, "127.0.0.1", () => {
      void shell.openExternal(buildAuthorizeUrl(state))
    })

    timer = setTimeout(() => finish(new Error("Auth timed out")), timeoutMs)
  })
}

module.exports = { runLoopbackOAuth }