# Notch

A tiny always-on-top desktop notch for Windows — weather, music, GitHub, Strava, markets, and quick controls in a frameless Electron overlay. Click-through outside the pill; expand from the top center when you need more.

## Features

### Collapsed island

Rotating **faces** (toggle each in Settings → Island): weather, battery, clock, markets, GitHub, Strava, air quality, calendar.

- **Weather** — temperature, condition icon, metrics from [Open-Meteo](https://open-meteo.com/) (no API key)
- **Spotify** — equalizer in the pill while playing; expands to full now playing (album tint, LRCLIB lyrics, transport)
- **Browser media** — YouTube / Chromium system media when Spotify is idle (title, thumbnail via SMTC)
- **GitHub** — notifications, today’s activity, contribution heatmap
- **Strava** — recent activities, route map, activity calendar, route heatmap
- **Markets** — crypto + stocks watchlist with charts
- **Live activities** — rain soon, Cursor usage alerts on the pill with priority over rotation

### Expanded panels

Settings, weather detail, Spotify, GitHub, Strava, calendar, air quality, markets, Cursor usage, and **system controls** (volume, brightness, playback device, Bluetooth on Windows via bundled `svcl`).

### Year wallpaper

**Settings → Wallpaper** generates a white desktop background with a GitHub-style **week column** heatmap for the current year (Mon→Sun): dark = days passed, light = upcoming, orange = today. Customize colors, cell size, gap, shape, and save folder; optionally apply as the Windows desktop after each regen. PNG is written to your chosen folder (default `Pictures/Notch/year-{year}-wallpaper.png`).

### Other

- **Theme** — light / dark / system
- **Location** — IP geolocation or manual lat/lon
- **Click-outside dismiss** — transparent fullscreen shell when expanded
- **Tray** — no taskbar button; Show / Quit from tray; Start Menu shortcut on launch
- **Launch at login** — on by default (Settings → App)

## Stack

- Electron (frameless, transparent, always-on-top)
- React 19 + TypeScript + Vite
- Tailwind CSS v4, Motion
- Open-Meteo, ipapi.co
- Spotify Web API (OAuth loopback `127.0.0.1:43110`)
- GitHub REST (classic PAT)
- Strava API (OAuth loopback `127.0.0.1:43111`)
- Year wallpaper PNG generation (`pngjs` in the main process)

## Prerequisites

- Node.js 20+
- Windows (primary target)
- Optional: Spotify, GitHub, and Strava credentials (see below)

## Setup

```bash
git clone https://github.com/yassenshopov/notch.git
cd notch
npm install
```

Copy `.env.example` → `.env` and fill in what you use. Restart Notch after changing `.env`.

### Spotify (optional)

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) app
2. Redirect URI: `http://127.0.0.1:43110/callback`
3. In `.env`: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`

Connect from **Settings → Spotify**.

### GitHub (optional)

Classic PAT with **notifications** scope:

```env
GITHUB_TOKEN=ghp_...
```

Restart Notch. Notifications and heatmaps use the GitHub panel / island face.

### Strava (optional)

1. [Strava API settings](https://www.strava.com/settings/api) — create an application
2. Authorization callback: `http://127.0.0.1:43111/callback`
3. In `.env`: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`

Connect from **Settings → Strava**. Optional token overrides are documented in `.env.example`.

### Calendar (optional)

In **Settings → Calendar**, paste a secret ICS URL (e.g. Google Calendar → Integrate calendar).

### Cursor usage

Reads dashboard-style usage from your **Cursor IDE login** on this machine (`state.vscdb`). `CURSOR_API_KEY` is for Cloud Agents only, not plan usage. See `.env.example` for optional `CURSOR_SESSION_TOKEN` / `CURSOR_ACCESS_TOKEN`.

## Develop

```bash
npm run dev
```

Starts Vite and Electron against `http://localhost:5173`. The main process restarts when files under `electron/` change (`nodemon`).

```bash
npm run dev:web   # renderer only (no IPC / wallpaper / Spotify)
npm run build     # typecheck + Vite production build
npm start         # Electron against dist/ (run build first)
npm run lint
```

Use **`npm run dev`** or **`npm start`** for wallpaper regen and OAuth — not the browser tab alone.

## Project layout

```
electron/          Main process, preload, OAuth bridges, year wallpaper, settings store
src/
  components/      Notch shell, panels (weather, Spotify, GitHub, Strava, …)
  hooks/           Data polling and bridge hooks
  lib/             API types, panel routing, year wallpaper settings helpers
  config/          Settings types, defaults, persisted store
```

## Notes

- `.env` is gitignored — never commit tokens or client secrets
- **Launch at login** runs the last `npm run build` output (`dist/`), not the Vite dev server — run `npm run build` after UI changes if you rely on auto-start
- Weather icons use a trimmed Fluent Emoji Flat JSON set in the repo

## License

MIT
