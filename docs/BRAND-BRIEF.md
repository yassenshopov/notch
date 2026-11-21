# Notch — Brand & Product Overview

Brief for brand book design. Describes what the product is, who it’s for, how it behaves, and the design language already in the app.

---

## One-line pitch

**Notch** is a Windows desktop app that puts an always-on-top, click-through **Dynamic Island–style** pill at the top (or side) of the screen—weather, music, work tools, fitness, markets, and system controls in one place, with a fuller **desktop dashboard** when you need depth.

---

## Elevator pitch

Notch lives on your monitor like a small black pill: it rotates through glanceable “faces” (weather, time, GitHub, Strava, markets, and more) and expands when you click. It connects the services developers and power users already use—Spotify, GitHub, Strava, Google Calendar, Cursor IDE—and adds Windows-native controls (volume, brightness, Bluetooth, playback device) without opening a dozen apps. A separate **full-scale desktop window** offers bento-style dashboards for the same panels, so the product scales from “glance” to “dashboard.”

---

## Problem it solves

- **Fragmented desktop info** — Weather in one app, music in another, GitHub notifications in the browser, server stats in SSH tabs.
- **No native “status island” on Windows** — macOS/iPhone users get Dynamic Island; Windows users get taskbar clutter or nothing.
- **Context switching cost** — Checking “what’s playing,” “rain in an hour,” or “Cursor usage this cycle” shouldn’t mean alt-tabbing.
- **Personal ops dashboard** — Homelab (Linux Mint server, Raspberry Pi), fitness, markets, and calendar in one cohesive shell—not another generic widget pack.

---

## Value proposition

| Pillar | What it means |
|--------|----------------|
| **Always there, never in the way** | Frameless, transparent overlay; click-through outside the pill; no taskbar button (system tray only). |
| **One shell, many integrations** | OAuth/API bridges for Spotify, GitHub, Strava, Google Calendar; local reads for Cursor usage; weather without API keys. |
| **Glance → expand → full desktop** | Collapsed island → expanded panel (~380×580) → optional full window with sidebar navigation. |
| **Lifestyle + work in one brand** | Same app covers coding (GitHub, Cursor), health (Strava, air quality), media (Spotify, browser SMTC), home (3D apartment map, servers), and playful Easter eggs (Pac-Man). |
| **Opinionated polish** | Spring motion, album-tinted Spotify UI, year-long GitHub-style wallpaper, privacy mode for screenshots. |

---

## Target audience

### Primary

- Windows power users, especially **developers** and **makers** who live in Cursor/VS Code, GitHub, and Spotify.
- People who like **Apple Dynamic Island / iOS Live Activities** aesthetics and want something similar on desktop.
- Users comfortable connecting OAuth (Spotify, Strava, Google) or configuring a GitHub token.

### Secondary

- Fitness-aware desk workers (Strava panel, activity calendars, route heatmaps).
- Self-hosters / homelab enthusiasts (SSH stats for Mint Linux and Raspberry Pi, Wi‑Fi sensing agent).
- Users who want a **personal dashboard** more than a generic “widget store” app.

### Not the main audience (today)

- macOS/Linux as primary OS (Windows is the main target; some features are Windows-only).
- Enterprise IT deployments (personal/small-team tool; MIT license, author-led).

---

## Competitive positioning

| Alternative | How Notch differs |
|-------------|-------------------|
| Rainmeter / widgets | Single cohesive UI, deep API integrations, island metaphor—not scattered skins. |
| Menu bar / tray apps | Visible island + expandable UI + full desktop mode; tray is secondary. |
| Browser dashboards | Native overlay, system media (SMTC), volume/brightness/Bluetooth on Windows. |
| Apple Dynamic Island | **Inspired by** the metaphor (pill, ears, rotation, live activities)—built for **Windows** with a broader integration set. |

**Positioning statement (draft):**  
*Notch is your desktop’s nervous system—a quiet black pill that knows your weather, your track, your commits, and your miles, and opens up when you care.*

---

## Product architecture (three modes)

```text
┌─────────────────────────────────────────────────────────┐
│  COLLAPSED ISLAND (always-on-top, top/side of display)  │
│  Rotating faces · live activities · music EQ · timers    │
└───────────────────────┬─────────────────────────────────┘
                        │ click
                        ▼
┌─────────────────────────────────────────────────────────┐
│  EXPANDED PANEL (same overlay, larger shell)            │
│  One active module: Weather, Spotify, GitHub, …         │
└───────────────────────┬─────────────────────────────────┘
                        │ open full scale / tray
                        ▼
┌─────────────────────────────────────────────────────────┐
│  DESKTOP WINDOW (full app: sidebar + bento dashboards)  │
│  Groups: Today · Media · Work · Life · Servers · System │
└─────────────────────────────────────────────────────────┘
```

---

## Feature catalog

### Collapsed island (“faces”)

User toggles each face in **Settings → Island**. Default rotation interval ~5 seconds.

| Face | Glance content |
|------|----------------|
| **Weather** | Temp, Fluent Emoji–style condition icon (Open-Meteo, no API key) |
| **Battery** | Laptop battery indicator |
| **Clock** | Time in 12h/24h |
| **Markets** | Watchlist crypto + stocks |
| **GitHub** | Notifications, today’s contributions, mini heatmap |
| **Strava** | Recent activity, mini activity calendar |
| **Mint / Pi** | Homelab server snapshot on island |
| **Air quality** | AQI-style panel hook |
| **Calendar** | Next event hint |

**Special collapsed states (override rotation)**

- **Spotify playing** — equalizer bars; pill widens; tap → Now Playing.
- **Browser media** (YouTube/Chromium via Windows SMTC) when Spotify idle.
- **Live activities** — e.g. rain soon, Cursor usage threshold—priority over carousel.
- **Timers** — countdown visible in pill; tap → Clock & timers.
- **Keyboard layout hint** — occasional extra width.
- **BotSmile** — minimal animated “face” (Grok-like wink)—personality moment in the chrome.

**Placement**

- Top center (default), or **left/right edge** with discrete slots; forms: **pill** or **corner** shapes; Dynamic Island–style **ears** blending into screen edge.

---

### Expanded panels (overlay)

| Panel | Highlights |
|-------|------------|
| **Settings** | Theme, island, OAuth connections, wallpaper, privacy, motion, placement |
| **Weather** | Multi-day detail, charts, location (IP or manual lat/lon) |
| **Spotify** | Now playing, album color tint, LRCLIB lyrics, transport; desktop: library hero, listen history, yearly insights |
| **Browser media** | Title, thumbnail, controls when not on Spotify |
| **GitHub** | Notifications, contribution heatmap (custom palettes), repos, weekly stack charts, today’s activity, profile |
| **Strava** | Activities, maps (Leaflet), route heatmap, calendars |
| **Markets** | Watchlist charts (line/bar style setting) |
| **Calendar** | Google Calendar OAuth |
| **Air quality** | Dedicated air panel |
| **Cursor** | Plan usage from local IDE login, cycle pace, model bars, billing context |
| **Clock & timers** | Pomodoro, countdown, stopwatch |
| **Controls** | Volume, brightness, mute, mic, output device, Bluetooth (Windows) |
| **Mint / Pi** | SSH server stats, history charts |
| **Wi‑Fi Sense** | Live agent (presence/activity sensing—calibration flow) |
| **Home** | Interactive apartment floor plan (2D sketch + 3D), room cards, ties to homelab panels |
| **Car** | 3D vehicle viewer, trips map, specs (personal vehicle dashboard) |
| **Pac-Man** | Playful in-app game panel |
| **Overview (desktop)** | “Today” bento: weather, Spotify, GitHub, Cursor, Strava, servers, calendar cards |

---

### Signature features (brand-differentiating)

1. **Year wallpaper** — Full-year, GitHub-contribution-style **week-column heatmap** (past / future / today colors); optional auto-apply on Windows desktop; can sync to Linux Mint over SSH. Default “today” accent: `#ff5f00`.
2. **Live activities** — Precipitation alerts and Cursor usage warnings on the pill; snooze/remind behavior.
3. **Privacy mode** — Masks emails, hosts, logins in UI for screenshots/sharing.
4. **Neon Postgres sync (optional)** — Cloud backup for settings snapshots and integration data; local-first with mirror fallback.
5. **Click-outside dismiss** — Transparent fullscreen shell when expanded so the rest of the desktop stays usable.

---

## Integrations & data sources

| Service | Method |
|---------|--------|
| Open-Meteo, ipapi.co | Weather & geolocation |
| Spotify Web API | OAuth loopback |
| GitHub REST | PAT (notifications, activity, repos) |
| Strava API | OAuth loopback |
| Google Calendar | OAuth loopback |
| LRCLIB | Synced lyrics |
| Cursor IDE | Local session DB |
| Windows SMTC | Browser/system media |
| SSH | Mint & Raspberry Pi stats |
| Markets | Polling quotes for user watchlist |

---

## Platform & distribution

- **OS**: Windows (primary); Electron frameless transparent window.
- **Install**: NSIS installer; desktop + Start Menu shortcuts.
- **Runtime**: Launch at login **on by default**; lives in **system tray** (Show / Quit).
- **Repository**: <https://github.com/yassenshopov/notch>
- **Author**: Yassen Shopov
- **License**: MIT
- **Version**: 0.1.0
- **App ID**: `com.yassenshopov.notch`
- **Product name**: Notch

---

## Visual & UX language (for brand alignment)

Align the brand book with what’s already shipped unless a deliberate rebrand is planned.

### Typography

- **Primary typeface**: Outfit Variable (`@fontsource-variable/outfit`).
- **Fallbacks**: Segoe UI Variable, system UI.
- **Numbers**: Tabular figures.

### Color & theme

- **Themes**: Light / dark / system.
- **Desktop canvas**: Light `#f7f7f5`, dark `#111111`.
- **Island fill**: Near-black pill (`#111`); high contrast text on collapsed chrome.
- **UI neutrals**: Secondary copy at ~45% black/white opacity; subtle borders.
- **Accent examples**: Spotify album-derived tints; GitHub heatmap palettes; year wallpaper today `#ff5f00`; semantic status colors (green/amber/red pills).

### Motion

- Custom easing: `cubic-bezier(0.32, 0.72, 0, 1)`.
- Spring expansion (user-configurable feel).
- Collapsed proportions reference **~126×36** (Apple compact Dynamic Island scale).

### Shape language

- **Pill** with **concave ears** at top—signature silhouette.
- Rounded-2xl cards; bento tiles on desktop.
- Icons: Lucide + Iconify; weather uses Fluent Emoji Flat (trimmed set).

### Layout patterns

- Bento grid on desktop overview and many full panels.
- Hidden scrollbars, smooth panel scrolling.
- Compact 11–13px meta labels with wide letter-spacing for section headers.

### Personality

- **Calm, dense, premium-utility**—not gamified (except intentional Pac-Man).
- **BotSmile**: minimal line-drawn face; occasional wink.
- **Copy tone**: Short, instructional subtitles (e.g. “Essentials from your integrations — open any card for detail.”).

### Name

- **Notch** — screen notch / island metaphor; default in-app name is lowercase `notch`; marketing may use title case **Notch**.

---

## Brand attributes (mood board keywords)

| Lean into | Avoid |
|-----------|--------|
| Precision, glanceability, night/desk aesthetic | Cluttered widget-board look |
| Black pill, soft motion, album colors | Loud gradients, generic enterprise blue |
| Developer credibility (GitHub heatmaps, Cursor) | Generic “AI assistant” positioning |
| Personal life (Strava, home, car) | Purely B2B SaaS tone |
| Windows-native craft (tray, click-through, SMTC) | iOS clone without differentiation |

---

## Messaging angles (tagline candidates—not final copy)

- *Everything worth glancing at, in one notch.*
- *Your Windows desk, with an island.*
- *Glance. Expand. Live.*

---

## Desktop navigation structure

| Group | Modules |
|-------|---------|
| **Today** | Overview, Weather, Air, Calendar, Clock |
| **Media** | Spotify, Browser media |
| **Work** | Cursor, GitHub, Markets |
| **Life** | Strava, Car, Home, Pac-Man |
| **Servers** | Mint, Wi‑Fi Sense, Pi |
| **System** | Controls, Settings |

---

## What Notch is not (brand guardrails)

- Not affiliated with Apple, Spotify, GitHub, Strava, Google, or Cursor.
- Not a general-purpose AI chat product (Cursor panel is **usage analytics**, not the IDE itself).
- Car and apartment views include personal/mock data layers—do not imply OEM or telematics partnerships unless the product changes.

---

## Suggested brand book deliverables

1. Logo mark that works at **~16px tray** and on a **black pill**
2. Color system extending light/dark neutrals + **today orange** + integration accents
3. Typography scale matching **Outfit** hierarchy (26px page titles → 11px uppercase labels)
4. Island silhouette guidelines (pill, ears, corner forms)
5. Photography/illustration style for marketing (desk, night, developer lifestyle)
6. Voice & tone (microcopy examples from Settings sections)
7. Icon style (line icons, Lucide-adjacent)
8. Motion principles mirroring product easing and spring expansions

---

## Product owner

- **Author**: Yassen Shopov
- **GitHub**: <https://github.com/yassenshopov/notch>