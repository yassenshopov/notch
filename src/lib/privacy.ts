import { useSettings } from "../config/settings-store"

export function maskEmail(email: string, privacy: boolean) {
  if (!privacy) return email
  const at = email.indexOf("@")
  if (at <= 1) return "•••@•••"
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  const maskedLocal = `${local[0]}•••${local.length > 2 ? local[local.length - 1] : ""}`
  const dot = domain.indexOf(".")
  const maskedDomain =
    dot > 0 ? `${domain[0]}•••${domain.slice(dot)}` : `${domain[0] ?? ""}•••`
  return `${maskedLocal}@${maskedDomain}`
}

export function maskHost(host: string, privacy: boolean) {
  if (!privacy || !host.trim()) return host
  if (host.includes(".")) {
    const parts = host.split(".")
    if (parts.length >= 2) {
      return `•••.${parts[parts.length - 1]}`
    }
  }
  if (host.length <= 2) return "••"
  return `${host[0]}•••${host[host.length - 1]}`
}

export function maskLogin(login: string, privacy: boolean) {
  if (!privacy || login.length <= 3) return login
  return `${login.slice(0, 2)}•••`
}

export function usePrivacyMode() {
  const { privacyMode } = useSettings()
  return privacyMode
}
