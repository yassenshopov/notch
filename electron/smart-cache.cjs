/**
 * TTL cache with stale-while-revalidate and in-flight deduplication.
 * @template T
 */
function createSmartCache() {
  /** @type {Map<string, { at: number, value: unknown }>} */
  const entries = new Map()
  /** @type {Map<string, Promise<unknown>>} */
  const inflight = new Map()

  /**
   * @param {string} key
   * @param {{ ttlMs: number, staleMs: number, force?: boolean, fetcher: () => Promise<T> }} opts
   * @returns {Promise<T>}
   */
  async function get(key, { ttlMs, staleMs, force = false, fetcher }) {
    const now = Date.now()
    const entry = entries.get(key)

    if (!force && entry) {
      const age = now - entry.at
      if (age < ttlMs) return entry.value
      if (age < staleMs) {
        if (!inflight.has(key)) {
          const bg = fetcher()
            .then((value) => {
              entries.set(key, { at: Date.now(), value })
              inflight.delete(key)
              return value
            })
            .catch(() => {
              inflight.delete(key)
            })
          inflight.set(key, bg)
        }
        return entry.value
      }
    }

    if (inflight.has(key)) return inflight.get(key)

    const pending = fetcher()
      .then((value) => {
        entries.set(key, { at: Date.now(), value })
        inflight.delete(key)
        return value
      })
      .catch((err) => {
        inflight.delete(key)
        if (entry) return entry.value
        throw err
      })

    inflight.set(key, pending)
    return pending
  }

  function invalidate(key) {
    entries.delete(key)
    inflight.delete(key)
  }

  function invalidatePrefix(prefix) {
    for (const key of [...entries.keys()]) {
      if (key.startsWith(prefix)) entries.delete(key)
    }
    for (const key of [...inflight.keys()]) {
      if (key.startsWith(prefix)) inflight.delete(key)
    }
  }

  return { get, invalidate, invalidatePrefix }
}

module.exports = { createSmartCache }
