import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState, type ReactNode } from "react"
import { DEFAULT_WEATHER_LOCATION } from "../config/default-location"
import type { ChartStyle, ClockFormat, MarketWatchItem, ThemeMode } from "../config/settings"
import { resetSettings, updateSettings, useSettings } from "../config/settings-store"
import { ISLAND_EASE } from "../lib/island-motion"
import { CRYPTO_IDS } from "../lib/market-assets"
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
  const [manualCountry, setManualCountry] = useState(
    s.location.mode === "manual"
      ? s.location.countryCode ?? DEFAULT_WEATHER_LOCATION.countryCode
      : DEFAULT_WEATHER_LOCATION.countryCode,
  )

  const saveManual = (
    label = manualLabel,
    lat = manualLat,
    lon = manualLon,
    countryCode = manualCountry,
  ) => {
    void updateSettings({
      location: {
        mode: "manual",
        latitude: Number(lat) || DEFAULT_WEATHER_LOCATION.latitude,
        longitude: Number(lon) || DEFAULT_WEATHER_LOCATION.longitude,
        label: label || DEFAULT_WEATHER_LOCATION.label,
        countryCode: countryCode.trim().toUpperCase().slice(0, 2) || DEFAULT_WEATHER_LOCATION.countryCode,
      },
    })
  }

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-5">
        <p className="text-[15px] font-semibold tracking-tight">Settings</p>
        <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
          Island faces, weather, Spotify & feel.
        </p>
      </header>

      <Section title="Island">
        <Row label="Rotate">
          <Segmented
            value={String(s.island.rotateIntervalMs)}
            options={[
              { value: "3000", label: "3s" },
              { value: "5000", label: "5s" },
              { value: "8000", label: "8s" },
            ]}
            onChange={(v) =>
              void updateSettings({
                island: { ...s.island, rotateIntervalMs: Number(v) },
              })
            }
          />
        </Row>
        <Row label="Weather">
          <Segmented
            value={s.island.faces.weather ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                island: {
                  ...s.island,
                  faces: { ...s.island.faces, weather: v === "on" },
                },
              })
            }
          />
        </Row>
        <Row label="Battery">
          <Segmented
            value={s.island.faces.battery ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                island: {
                  ...s.island,
                  faces: { ...s.island.faces, battery: v === "on" },
                },
              })
            }
          />
        </Row>
        <Row label="Clock">
          <Segmented
            value={s.island.faces.clock ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                island: {
                  ...s.island,
                  faces: { ...s.island.faces, clock: v === "on" },
                },
              })
            }
          />
        </Row>
        <Row label="Markets">
          <Segmented
            value={s.island.faces.markets ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                island: {
                  ...s.island,
                  faces: { ...s.island.faces, markets: v === "on" },
                },
              })
            }
          />
        </Row>
        <Row label="GitHub">
          <Segmented
            value={s.island.faces.github ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                island: {
                  ...s.island,
                  faces: { ...s.island.faces, github: v === "on" },
                },
              })
            }
          />
        </Row>
        <Row label="Air quality">
          <Segmented
            value={(s.island.faces.air ?? true) ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                island: {
                  ...s.island,
                  faces: { ...s.island.faces, air: v === "on" },
                },
              })
            }
          />
        </Row>
        <Row label="Calendar">
          <Segmented
            value={(s.island.faces.calendar ?? true) ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                island: {
                  ...s.island,
                  faces: { ...s.island.faces, calendar: v === "on" },
                },
              })
            }
          />
        </Row>
      </Section>

      <Section title="Calendar">
        <Row label="ICS URL">
          <input
            type="url"
            value={s.calendar?.icsUrl ?? ""}
            placeholder="https://calendar.google.com/…/basic.ics"
            onChange={(e) =>
              void updateSettings({
                calendar: { ...(s.calendar ?? { pollIntervalMs: 300_000 }), icsUrl: e.target.value },
              })
            }
            className="w-full max-w-[200px] rounded-lg border border-black/10 bg-white/80 px-2 py-1 text-[11px] outline-none focus:border-black/25 dark:border-white/15 dark:bg-black/30"
          />
        </Row>
      </Section>

      <Section title="Browser media">
        <Row label="YouTube / web">
          <Segmented
            value={(s.media?.enabled ?? true) ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                media: { ...(s.media ?? { pollIntervalMs: 2000 }), enabled: v === "on" },
              })
            }
          />
        </Row>
      </Section>

      <Section title="Live activities">
        <Row label="Alerts">
          <Segmented
            value={s.liveActivities.enabled ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                liveActivities: { ...s.liveActivities, enabled: v === "on" },
              })
            }
          />
        </Row>
        <Row label="Rotate">
          <Segmented
            value={String(s.liveActivities.dwellMs)}
            options={[
              { value: "6000", label: "6s" },
              { value: "8000", label: "8s" },
              { value: "12000", label: "12s" },
            ]}
            onChange={(v) =>
              void updateSettings({
                liveActivities: { ...s.liveActivities, dwellMs: Number(v) },
              })
            }
          />
        </Row>
        <Row label="Rain soon">
          <Segmented
            value={s.liveActivities.weather.enabled ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                liveActivities: {
                  ...s.liveActivities,
                  weather: {
                    ...s.liveActivities.weather,
                    enabled: v === "on",
                  },
                },
              })
            }
          />
        </Row>
        <Row label="Cursor usage">
          <Segmented
            value={s.liveActivities.cursor.enabled ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                liveActivities: {
                  ...s.liveActivities,
                  cursor: { ...s.liveActivities.cursor, enabled: v === "on" },
                },
              })
            }
          />
        </Row>
      </Section>

      <Section title="Charts">
        <Row label="Style">
          <Segmented
            value={s.charts.style}
            options={[
              { value: "bar", label: "Bars" },
              { value: "line", label: "Line" },
            ]}
            onChange={(style) =>
              void updateSettings({ charts: { style: style as ChartStyle } })
            }
          />
        </Row>
      </Section>

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
                const { label, latitude, longitude, countryCode } = DEFAULT_WEATHER_LOCATION
                setManualLabel(label)
                setManualLat(String(latitude))
                setManualLon(String(longitude))
                setManualCountry(countryCode)
                saveManual(label, String(latitude), String(longitude), countryCode)
              }
            }}
          />
        </Row>
        <AnimatePresence initial={false}>
          {s.location.mode === "manual" ? (
            <motion.div
              key="manual-location"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.32, ease: ISLAND_EASE }}
              className="overflow-hidden"
            >
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
                <Field
                  label="Country"
                  value={manualCountry}
                  onChange={(v) => setManualCountry(v.toUpperCase().slice(0, 2))}
                  onBlur={() => saveManual()}
                  className="col-span-2"
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Section>

      <Section title="App">
        <Row label="Launch at login">
          <Segmented
            value={s.launchAtLogin ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) => void updateSettings({ launchAtLogin: v === "on" })}
          />
        </Row>
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
        <Row label="Time">
          <Segmented
            value={s.clock.format}
            options={[
              { value: "24h", label: "24h" },
              { value: "12h", label: "12h" },
            ]}
            onChange={(format) =>
              void updateSettings({ clock: { format: format as ClockFormat } })
            }
          />
        </Row>
        <Row label="Motion">
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

      <Section title="Markets">
        <WatchlistField
          value={s.markets.watchlist.map((w) => w.symbol).join(", ")}
          onSave={(raw) => {
            const items = parseWatchlist(raw)
            void updateSettings({ markets: { ...s.markets, watchlist: items } })
          }}
        />
        <Row label="Refresh">
          <Segmented
            value={String(s.markets.pollIntervalMs)}
            options={[
              { value: "60000", label: "1m" },
              { value: "90000", label: "1.5m" },
              { value: "180000", label: "3m" },
            ]}
            onChange={(v) =>
              void updateSettings({ markets: { ...s.markets, pollIntervalMs: Number(v) } })
            }
          />
        </Row>
      </Section>

      <Section title="GitHub">
        <p className="text-[12px] leading-snug text-black/45 dark:text-white/45">
          Set <span className="font-medium">GITHUB_TOKEN</span> in{" "}
          <span className="font-medium">.env</span> (classic PAT with{" "}
          <span className="font-medium">notifications</span> scope) and restart Notch.
        </p>
        <Row label="Refresh">
          <Segmented
            value={String(s.github.pollIntervalMs)}
            options={[
              { value: "60000", label: "1m" },
              { value: "120000", label: "2m" },
              { value: "300000", label: "5m" },
            ]}
            onChange={(v) =>
              void updateSettings({ github: { ...s.github, pollIntervalMs: Number(v) } })
            }
          />
        </Row>
      </Section>

      <Section title="Spotify">
        <Row label="Lyrics">
          <Segmented
            value={(s.spotify.showLyrics ?? true) ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                spotify: { ...s.spotify, showLyrics: v === "on" },
              })
            }
          />
        </Row>
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
          <AnimatePresence mode="wait" initial={false}>
            {!spotifyConfigured ? (
              <motion.p
                key="spotify-unconfigured"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: ISLAND_EASE }}
                className="text-[12px] text-black/45 dark:text-white/45"
              >
                Add Spotify keys to <span className="font-medium">.env</span> first.
              </motion.p>
            ) : spotifyConnected ? (
              <motion.button
                key="spotify-disconnect"
                type="button"
                onClick={onDisconnectSpotify}
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.22, ease: ISLAND_EASE }}
                whileTap={{ scale: 0.97 }}
                className="rounded-full bg-black/5 px-4 py-2 text-[12px] font-semibold dark:bg-white/10"
              >
                Disconnect Spotify
              </motion.button>
            ) : (
              <motion.button
                key="spotify-connect"
                type="button"
                onClick={onConnectSpotify}
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.22, ease: ISLAND_EASE }}
                whileTap={{ scale: 0.97 }}
                className="rounded-full bg-[#111] px-4 py-2 text-[12px] font-semibold text-white dark:bg-white dark:text-[#111]"
              >
                {connecting ? "Waiting…" : "Connect Spotify"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
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
    <div className="relative flex rounded-full bg-black/5 p-0.5 dark:bg-white/10">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <motion.button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 520, damping: 28, mass: 0.55 }}
            className={cn(
              "relative rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200",
              selected
                ? "bg-[#111] text-white dark:bg-white dark:text-[#111]"
                : "text-black/45 dark:text-white/45",
            )}
          >
            {opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}

function parseWatchlist(raw: string): MarketWatchItem[] {
  const parts = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
  const out: MarketWatchItem[] = []
  for (const symbol of parts) {
    const cryptoKey = symbol.replace(/-USD$/i, "")
    const coinId = CRYPTO_IDS[cryptoKey] ?? CRYPTO_IDS[symbol]
    if (coinId) {
      out.push({ id: coinId, symbol, type: "crypto" })
    } else {
      out.push({
        id: symbol.toLowerCase(),
        symbol,
        type: "stock",
      })
    }
  }
  return out
}

function WatchlistField({ value, onSave }: { value: string; onSave: (raw: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    setDraft(value)
  }, [value])
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] font-medium">Watchlist</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur()
          }
        }}
        placeholder="BTC, ETH, AAPL"
        className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-[13px] outline-none focus:border-black/30 dark:border-white/15"
      />
      <span className="text-[11px] text-black/40 dark:text-white/40">
        Comma-separated tickers. Known crypto symbols use CoinGecko.
      </span>
    </label>
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
