type Entry<T> = { at: number; value: T }

const entries = new Map<string, Entry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

export type CacheOptions = {
  ttlMs: number
  staleMs: number
  force?: boolean
}

export async function cached<T>(
  key: string,
  opts: CacheOptions,
  fetcher: () => Promise<T>,
): Promise<T> {
  const { ttlMs, staleMs, force = false } = opts
  const now = Date.now()
  const entry = entries.get(key) as Entry<T> | undefined

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

  if (inflight.has(key)) return inflight.get(key) as Promise<T>

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
  return pending as Promise<T>
}

export function invalidateCache(key: string) {
  entries.delete(key)
  inflight.delete(key)
}
