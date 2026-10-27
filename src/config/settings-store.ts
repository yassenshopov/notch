import { useSyncExternalStore } from "react"
import { defaultSettings, type AppSettings } from "./settings"

type Listener = () => void

let current: AppSettings = structuredClone(defaultSettings)
let hydrated = false
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener()
}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base }
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const value = patch[key]
    if (value === undefined || value === null) continue
    const existing = base[key]
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMerge(
        existing as Record<string, unknown>,
        value as Record<string, unknown>,
      ) as T[keyof T]
    } else {
      out[key] = value as T[keyof T]
    }
  }
  return out
}

export function getSettings() {
  return current
}

export function subscribeSettings(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function hydrateSettings() {
  if (hydrated) return current
  hydrated = true
  try {
    const saved = (await window.notch?.settings?.get()) ?? {}
    current = deepMerge(structuredClone(defaultSettings), saved as Partial<AppSettings>)
    if (current.pi?.sshHost === "pi-home") {
      current.pi = { ...current.pi, sshHost: "pi" }
    }
    current.expanded.width = Math.max(380, current.expanded.width)
    current.expanded.height = Math.max(580, current.expanded.height)
    emit()
  } catch {
    current = structuredClone(defaultSettings)
  }
  return current
}

export async function updateSettings(patch: Partial<AppSettings>) {
  current = deepMerge(current, patch)
  emit()
  try {
    const saved = (await window.notch?.settings?.set(patch)) ?? {}
    current = deepMerge(current, saved as Partial<AppSettings>)
    emit()
  } catch {
    // keep in-memory even if persist fails
  }
  return current
}

export async function resetSettings() {
  current = structuredClone(defaultSettings)
  emit()
  try {
    await window.notch?.settings?.reset()
  } catch {
    // ignore
  }
  return current
}

export function useSettings(): AppSettings {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings)
}
