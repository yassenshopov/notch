import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState, type ReactNode } from "react"
import { DEFAULT_WEATHER_LOCATION } from "../config/default-location"
import type { ChartStyle, ClockFormat, MarketWatchItem, ThemeMode } from "../config/settings"
import { resetSettings, updateSettings, useSettings } from "../config/settings-store"
import { notchUi, notchUiFast } from "../lib/island-motion"
import { CRYPTO_IDS } from "../lib/market-assets"
import {
  mergeYearWallpaper,
  wallpaperFileName,
  wallpaperOutputDirLabel,
  type YearWallpaperShape,
} from "../lib/year-wallpaper"
import { cn } from "../lib/utils"

type Props = {
  spotifyConnected: boolean
  spotifyConfigured: boolean
  onConnectSpotify: () => void
  onDisconnectSpotify: () => void
  connecting?: boolean
  stravaConnected: boolean
  stravaConfigured: boolean
  onConnectStrava: () => void
  onDisconnectStrava: () => void
  stravaConnecting?: boolean
}

export function SettingsPanel({
  spotifyConnected,
  spotifyConfigured,
  onConnectSpotify,
  onDisconnectSpotify,
  connecting,
  stravaConnected,
  stravaConfigured,
  onConnectStrava,
  onDisconnectStrava,
  stravaConnecting,
}: Props) {
  const s = useSettings()
  const year = new Date().getFullYear()
  const wallpaper = mergeYearWallpaper(s.yearWallpaper)
  const [wallpaperBusy, setWallpaperBusy] = useState(false)
  const [wallpaperNote, setWallpaperNote] = useState<string | null>(null)

  const patchWallpaper = (patch: Partial<typeof wallpaper>) => {
    void updateSettings({ yearWallpaper: { ...wallpaper, ...patch } })
  }
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
        <Row label="Strava">
          <Segmented
            value={(s.island.faces.strava ?? true) ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                island: {
                  ...s.island,
                  faces: { ...s.island.faces, strava: v === "on" },
                },
              })
            }
          />
        </Row>
        <Row label="Mint server">
          <Segmented
            value={(s.island.faces.mint ?? true) ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) =>
              void updateSettings({
                island: {
                  ...s.island,
                  faces: { ...s.island.faces, mint: v === "on" },
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
              transition={notchUi}
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

      <Section title="Wallpaper">
        <p className="text-[12px] leading-snug text-black/45 dark:text-white/45">
          {year} week heatmap (Mon→Sun). Saves{" "}
          <span className="font-medium">{wallpaperFileName(year)}</span> to your folder below.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Save folder</span>
          <p className="text-[11px] leading-snug text-black/45 dark:text-white/45">
            {wallpaperOutputDirLabel(wallpaper.outputDir)}
            {!wallpaper.outputDir.trim() ? " (default)" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <motion.button
              type="button"
              disabled={!window.notch?.wallpaper?.pickOutputFolder}
              onClick={() => {
                void (async () => {
                  const pick = window.notch?.wallpaper?.pickOutputFolder
                  if (!pick) return
                  const result = await pick()
                  if (result.ok && result.path) {
                    patchWallpaper({ outputDir: result.path })
                  }
                })()
              }}
              whileTap={{ scale: 0.97 }}
              transition={notchUiFast}
              className="rounded-full bg-black/5 px-3 py-1.5 text-[11px] font-semibold dark:bg-white/10"
            >
              Choose folder…
            </motion.button>
            {wallpaper.outputDir.trim() ? (
              <button
                type="button"
                onClick={() => patchWallpaper({ outputDir: "" })}
                className="rounded-full px-3 py-1.5 text-[11px] font-medium text-black/45 underline-offset-2 hover:underline dark:text-white/45"
              >
                Use default
              </button>
            ) : null}
          </div>
        </label>
        <Row label="Daily update">
          <Segmented
            value={wallpaper.autoUpdateDaily ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) => patchWallpaper({ autoUpdateDaily: v === "on" })}
          />
        </Row>
        <p className="text-[11px] leading-snug text-black/45 dark:text-white/45">
          When on, Notch regenerates the heatmap once per day (on launch, after sleep, and at
          midnight) so today&apos;s cell stays current.
          {wallpaper.lastAutoDate ? ` Last auto run: ${wallpaper.lastAutoDate}.` : ""}
        </p>
        <Row label="Apply">
          <Segmented
            value={wallpaper.applyAfterRegenerate ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) => patchWallpaper({ applyAfterRegenerate: v === "on" })}
          />
        </Row>
        <Row label="Shape">
          <Segmented
            value={wallpaper.shape}
            options={[
              { value: "square", label: "Square" },
              { value: "circle", label: "Circle" },
            ]}
            onChange={(v) => patchWallpaper({ shape: v as YearWallpaperShape })}
          />
        </Row>
        <Row label="Cell">
          <Segmented
            value={String(wallpaper.cellSize)}
            options={[
              { value: "10", label: "S" },
              { value: "13", label: "M" },
              { value: "16", label: "L" },
            ]}
            onChange={(v) => patchWallpaper({ cellSize: Number(v) })}
          />
        </Row>
        <Row label="Gap">
          <Segmented
            value={String(wallpaper.gap)}
            options={[
              { value: "4", label: "4" },
              { value: "6", label: "6" },
              { value: "8", label: "8" },
            ]}
            onChange={(v) => patchWallpaper({ gap: Number(v) })}
          />
        </Row>
        {wallpaper.shape === "square" ? (
          <Row label="Corners">
            <Segmented
              value={String(wallpaper.cornerRadius)}
              options={[
                { value: "0", label: "0" },
                { value: "2", label: "2" },
                { value: "4", label: "4" },
              ]}
              onChange={(v) => patchWallpaper({ cornerRadius: Number(v) })}
            />
          </Row>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <ColorField
            label="Background"
            value={wallpaper.backgroundColor}
            onChange={(v) => patchWallpaper({ backgroundColor: v })}
          />
          <ColorField
            label="Passed"
            value={wallpaper.passedColor}
            onChange={(v) => patchWallpaper({ passedColor: v })}
          />
          <ColorField
            label="Upcoming"
            value={wallpaper.futureColor}
            onChange={(v) => patchWallpaper({ futureColor: v })}
          />
          <ColorField
            label="Today"
            value={wallpaper.todayColor}
            onChange={(v) => patchWallpaper({ todayColor: v })}
          />
        </div>
        <div className="mt-1 flex flex-col gap-2">
          <motion.button
            type="button"
            disabled={wallpaperBusy || !window.notch?.wallpaper}
            onClick={() => {
              void (async () => {
                const bridge = window.notch?.wallpaper
                if (!bridge) {
                  setWallpaperNote("Run notch with npm run dev or npm start (not the browser tab).")
                  return
                }
                setWallpaperBusy(true)
                setWallpaperNote(null)
                try {
                  const result = await bridge.regenerate({
                    year,
                    apply: wallpaper.applyAfterRegenerate,
                    style: wallpaper,
                  })
                  if (!result.ok) {
                    setWallpaperNote(result.error ?? "Could not generate wallpaper")
                    return
                  }
                  let note = `${result.passed}/${result.total} days · ${result.path}`
                  if (result.applied) {
                    note += " · desktop updated"
                  } else if (wallpaper.applyAfterRegenerate && result.applyError) {
                    note += ` · apply failed: ${result.applyError}`
                  }
                  setWallpaperNote(note)
                } catch (err) {
                  const raw = err instanceof Error ? err.message : "Could not generate wallpaper"
                  const msg = /no handler registered/i.test(raw)
                    ? "Restart notch (quit from tray, then npm run dev) so the main process reloads."
                    : raw
                  setWallpaperNote(msg)
                } finally {
                  setWallpaperBusy(false)
                }
              })()
            }}
            whileTap={{ scale: 0.97 }}
            transition={notchUiFast}
            className="w-fit rounded-full bg-[#111] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-[#111]"
          >
            {wallpaperBusy ? "Generating…" : `Regenerate ${year} wallpaper`}
          </motion.button>
          {wallpaperNote ? (
            <p className="text-[11px] leading-snug text-black/45 dark:text-white/45">{wallpaperNote}</p>
          ) : null}
        </div>
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

      <Section title="Strava">
        <p className="text-[12px] leading-snug text-black/45 dark:text-white/45">
          Use your Strava API app credentials in <span className="font-medium">.env</span>{" "}
          (<span className="font-medium">STRAVA_CLIENT_ID</span> /{" "}
          <span className="font-medium">STRAVA_CLIENT_SECRET</span>). Set callback to{" "}
          <span className="font-medium">http://127.0.0.1:43111/callback</span>.
        </p>
        <Row label="Refresh">
          <Segmented
            value={String(s.strava?.pollIntervalMs ?? 180_000)}
            options={[
              { value: "120000", label: "2m" },
              { value: "180000", label: "3m" },
              { value: "300000", label: "5m" },
            ]}
            onChange={(v) =>
              void updateSettings({
                strava: { ...(s.strava ?? { pollIntervalMs: 180_000 }), pollIntervalMs: Number(v) },
              })
            }
          />
        </Row>
        <div className="mt-3">
          <AnimatePresence mode="wait" initial={false}>
            {!stravaConfigured ? (
              <motion.p
                key="strava-unconfigured"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={notchUiFast}
                className="text-[12px] text-black/45 dark:text-white/45"
              >
                Add Strava keys to <span className="font-medium">.env</span> and restart.
              </motion.p>
            ) : stravaConnected ? (
              <motion.button
                key="strava-disconnect"
                type="button"
                onClick={onDisconnectStrava}
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={notchUiFast}
                whileTap={{ scale: 0.97 }}
                className="rounded-full bg-black/5 px-4 py-2 text-[12px] font-semibold dark:bg-white/10"
              >
                Disconnect Strava
              </motion.button>
            ) : (
              <motion.button
                key="strava-connect"
                type="button"
                onClick={onConnectStrava}
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={notchUiFast}
                whileTap={{ scale: 0.97 }}
                className="rounded-full bg-[#fc4c02] px-4 py-2 text-[12px] font-semibold text-white"
              >
                {stravaConnecting ? "Waiting…" : "Connect Strava"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </Section>

      <Section title="Mint server">
        <p className="text-[12px] leading-snug text-black/45 dark:text-white/45">
          Polls your home Linux box over SSH (Tailscale host{" "}
          <span className="font-medium">mint</span> by default). Requires{" "}
          <span className="font-medium">ssh mint</span> to work from this PC.
        </p>
        <Row label="SSH host">
          <input
            type="text"
            value={s.mint?.sshHost ?? "mint"}
            onChange={(e) =>
              void updateSettings({
                mint: { ...(s.mint ?? { pollIntervalMs: 30_000, sshHost: "mint" }), sshHost: e.target.value },
              })
            }
            className="w-full max-w-[140px] rounded-lg border border-black/10 bg-black/[0.03] px-2 py-1.5 text-[12px] dark:border-white/15 dark:bg-white/[0.06]"
          />
        </Row>
        <Row label="Refresh">
          <Segmented
            value={String(s.mint?.pollIntervalMs ?? 30_000)}
            options={[
              { value: "15000", label: "15s" },
              { value: "30000", label: "30s" },
              { value: "60000", label: "1m" },
            ]}
            onChange={(v) =>
              void updateSettings({
                mint: { ...(s.mint ?? { pollIntervalMs: 30_000, sshHost: "mint" }), pollIntervalMs: Number(v) },
              })
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
                transition={notchUiFast}
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
                transition={notchUiFast}
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
                transition={notchUiFast}
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

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (hex: string) => void
}) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"
  return (
    <label className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-2 py-1.5 dark:border-white/15">
      <span className="text-[11px] font-medium">{label}</span>
      <input
        type="color"
        value={normalized}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
        aria-label={`${label} color`}
      />
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
