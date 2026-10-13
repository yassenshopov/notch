import { useState, type ReactNode } from "react"
import type { ThemeMode } from "../config/settings"
import { resetSettings, updateSettings, useSettings } from "../config/settings-store"
import { cn } from "../lib/utils"

type Props = {
  spotifyConnected: boolean
  spotifyConfigured: boolean
  onConnectSpotify: () => void
  onDisconnectSpotify: () => void
  connecting?: boolean
}

export function SettingsPanel({
  spotifyConnected,
  spotifyConfigured,
  onConnectSpotify,
  onDisconnectSpotify,
  connecting,
}: Props) {
  const s = useSettings()
  const [manualLabel, setManualLabel] = useState(
    s.location.mode === "manual" ? s.location.label : "",
  )
  const [manualLat, setManualLat] = useState(
    s.location.mode === "manual" ? String(s.location.latitude) : "",
  )
  const [manualLon, setManualLon] = useState(
    s.location.mode === "manual" ? String(s.location.longitude) : "",
  )

  const saveManual = (label = manualLabel, lat = manualLat, lon = manualLon) => {
    void updateSettings({
      location: {
        mode: "manual",
        latitude: Number(lat) || 0,
        longitude: Number(lon) || 0,
        label: label || "Custom",
      },
    })
  }

  return (
    <div
      className="flex h-full flex-col overflow-y-auto overflow-x-hidden pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-5">
        <p className="text-[15px] font-semibold tracking-tight">Settings</p>
        <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
          Knobs for weather, Spotify, look & feel.
        </p>
      </header>

      <Section title="Weather">
        <Row label="Temperature">
          <Segmented
            value={s.temperatureUnit}
            options={[
              { value: "celsius", label: "°C" },
              { value: "fahrenheit", label: "°F" },
            ]}
            onChange={(temperatureUnit) => void updateSettings({ temperatureUnit })}
          />
        </Row>
        <Row label="Wind">
          <Segmented
            value={s.windSpeedUnit}
            options={[
              { value: "kmh", label: "km/h" },
              { value: "mph", label: "mph" },
              { value: "ms", label: "m/s" },
            ]}
            onChange={(windSpeedUnit) => void updateSettings({ windSpeedUnit })}
          />
        </Row>
        <Row label="Refresh">
          <Segmented
            value={String(s.refreshIntervalMs)}
            options={[
              { value: String(5 * 60 * 1000), label: "5m" },
              { value: String(10 * 60 * 1000), label: "10m" },
              { value: String(30 * 60 * 1000), label: "30m" },
            ]}
            onChange={(v) => void updateSettings({ refreshIntervalMs: Number(v) })}
          />
        </Row>
        <Row label="Location">
          <Segmented
            value={s.location.mode}
            options={[
              { value: "auto", label: "Auto" },
              { value: "manual", label: "Manual" },
            ]}
            onChange={(mode) => {
              if (mode === "auto") {
                void updateSettings({ location: { mode: "auto" } })
              } else {
                saveManual()
              }
            }}
          />
        </Row>
        {s.location.mode === "manual" ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Field
              label="Label"
              value={manualLabel}
              onChange={setManualLabel}
              onBlur={() => saveManual()}
              className="col-span-2"
            />
            <Field
              label="Lat"
              value={manualLat}
              onChange={setManualLat}
              onBlur={() => saveManual()}
            />
            <Field
              label="Lon"
              value={manualLon}
              onChange={setManualLon}
              onBlur={() => saveManual()}
            />
          </div>
        ) : null}
      </Section>

      <Section title="Appearance">
        <Row label="Theme">
          <Segmented
            value={s.theme}
            options={[
              { value: "system", label: "Auto" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            onChange={(theme) => void updateSettings({ theme: theme as ThemeMode })}
          />
        </Row>
      </Section>

      <Section title="Spotify">
        <Row label="Poll">
          <Segmented
            value={String(s.spotify.pollIntervalMs)}
            options={[
              { value: "2000", label: "2s" },
              { value: "4000", label: "4s" },
              { value: "8000", label: "8s" },
            ]}
            onChange={(v) =>
              void updateSettings({ spotify: { ...s.spotify, pollIntervalMs: Number(v) } })
            }
          />
        </Row>
        <div className="mt-3">
          {!spotifyConfigured ? (
            <p className="text-[12px] text-black/45 dark:text-white/45">
              Add Spotify keys to <span className="font-medium">.env</span> first.
            </p>
          ) : spotifyConnected ? (
            <button
              type="button"
              onClick={onDisconnectSpotify}
              className="rounded-full bg-black/5 px-4 py-2 text-[12px] font-semibold dark:bg-white/10"
            >
              Disconnect Spotify
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnectSpotify}
              className="rounded-full bg-[#111] px-4 py-2 text-[12px] font-semibold text-white dark:bg-white dark:text-[#111]"
            >
              {connecting ? "Waiting…" : "Connect Spotify"}
            </button>
          )}
        </div>
      </Section>

      <Section title="Motion">
        <Row label="Feel">
          <Segmented
            value={
              s.motion.stiffness >= 420 ? "snappy" : s.motion.stiffness <= 280 ? "soft" : "balanced"
            }
            options={[
              { value: "soft", label: "Soft" },
              { value: "balanced", label: "Balanced" },
              { value: "snappy", label: "Snappy" },
            ]}
            onChange={(feel) => {
              const presets = {
                soft: { stiffness: 260, damping: 28, mass: 1 },
                balanced: { stiffness: 380, damping: 32, mass: 0.85 },
                snappy: { stiffness: 480, damping: 34, mass: 0.7 },
              } as const
              void updateSettings({ motion: { type: "spring", ...presets[feel] } })
            }}
          />
        </Row>
      </Section>

      <div className="mt-auto pt-4 pb-1">
        <button
          type="button"
          onClick={() => void resetSettings()}
          className="text-[12px] font-medium text-black/40 underline-offset-2 hover:underline dark:text-white/40"
        >
          Reset all knobs
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5 border-b border-black/8 pb-5 last:mb-0 last:border-b-0 dark:border-white/10">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
        {title}
      </p>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-[13px] font-medium">{label}</span>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex rounded-full bg-black/5 p-0.5 dark:bg-white/10">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
            value === opt.value
              ? "bg-[#111] text-white dark:bg-white dark:text-[#111]"
              : "text-black/45 dark:text-white/45",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  className?: string
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10px] text-black/40 dark:text-white/40">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-[13px] outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
      />
    </label>
  )
}
