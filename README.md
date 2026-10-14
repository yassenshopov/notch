# Notch

A tiny always-on-top desktop notch for Windows — weather at a glance, Spotify when you’re playing, and a settings panel that stays out of the way until you need it.

Frameless Electron overlay, click-through outside the pill, expands from the top center of the screen.

## Features

- **Weather-first pill** — temperature, condition icon (Fluent Emoji), and quick metrics from [Open-Meteo](https://open-meteo.com/) (no API key)
- **Location** — resolved via IP geolocation; override latitude/longitude in settings
- **Spotify now playing** — equalizer in the collapsed pill while music is playing; full now-playing panel when expanded (album art tint, play/pause, skip)
- **Theme** — light / dark / system, toggled from the pill
- **Settings** — units, refresh interval, location, Spotify connect/disconnect — persisted in Electron `userData`
- **Click-outside dismiss** — expands to a transparent fullscreen shell so outside clicks collapse the notch

## Stack

- Electron (frameless, transparent, always-on-top)
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Motion (animations)
- Open-Meteo + ipapi.co
- Spotify Web API (OAuth PKCE-style loopback on `127.0.0.1:43110`)

## Prerequisites

- Node.js 20+
- Windows (primary target; overlay behavior is tuned for Win32)
- Optional: a [Spotify Developer](https://developer.spotify.com/dashboard) app for now-playing

## Setup

```bash
git clone https://github.com/yassenshopov/notch.git
cd notch
npm install
```

### Spotify (optional)

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add redirect URI: `http://127.0.0.1:43110/callback`
3. Copy `.env.example` → `.env` and fill in:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:43110/callback
```

Without Spotify credentials, weather and settings still work; the Spotify row simply won’t connect.

## Develop

```bash
npm run dev
```

Starts Vite and launches Electron against `http://localhost:5173`.

```bash
npm run dev:web   # renderer only in the browser
npm run build     # typecheck + production Vite build
npm start         # Electron against dist/ (run build first)
npm run lint
```

## Project layout

```
electron/          Main process, preload, Spotify OAuth, settings store
src/
  components/      Notch shell, weather / Spotify / settings panels
  hooks/           Weather, Spotify, theme, album palette
  lib/             API helpers, colors, utils
  config/          Settings types + defaults
```

## Notes

- `.env` is gitignored — never commit Spotify secrets
- Weather uses Open-Meteo (free, no key) and Fluent Emoji Flat icons bundled as a trimmed JSON set
- The overlay uses mouse passthrough with forwarding so only the notch UI receives clicks
- **Launch at login** is on by default (Windows startup via Electron login items); toggle it in Settings → App. Login launches the last `npm run build` output (`dist/`), not the Vite dev server — run `npm run build` after UI changes if you rely on auto-start.

## License

MIT
