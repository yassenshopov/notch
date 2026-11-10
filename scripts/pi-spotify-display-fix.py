#!/usr/bin/env python3
"""Patch spotify-display on the Pi: Spotify 429 backoff + slower polling."""
from __future__ import annotations

import re
from pathlib import Path

APP = Path("/home/pi/spotify-display/app.py")
HTML_GLOB = Path("/home/pi/spotify-display")

BACKOFF_BLOCK = '''
spotify_api_backoff_until = 0.0


def _spotify_rate_limited(resp):
    global spotify_api_backoff_until
    retry = 900
    try:
        if resp is not None and getattr(resp, "status_code", None) == 429:
            ra = resp.headers.get("Retry-After")
            if ra and str(ra).strip().isdigit():
                retry = max(int(ra), 120)
    except Exception:
        pass
    spotify_api_backoff_until = time.time() + retry


def _spotify_api_blocked():
    return time.time() < spotify_api_backoff_until
'''


def patch_app(text: str) -> str:
    if "_spotify_api_blocked" not in text:
        anchor = "now_playing_cache = "
        if anchor not in text:
            raise SystemExit("app.py: cannot find now_playing_cache anchor")
        text = text.replace(
            anchor,
            BACKOFF_BLOCK + "\n" + anchor,
            1,
        )

    text = re.sub(r"POLL_INTERVAL = \d+", "POLL_INTERVAL = 20", text)
    text = re.sub(r"STALE_GRACE = \d+", "STALE_GRACE = 300", text)

    needle = "    try:\n        resp = requests.get(\n            f\"{SPOTIFY_API_URL}/me/player/currently-playing\""
    if needle in text and "if _spotify_api_blocked():" not in text:
        text = text.replace(
            needle,
            "    if _spotify_api_blocked():\n        return _fallback_or_not_playing(m)\n\n" + needle,
            1,
        )

    old = "    if resp.status_code != 200:\n        return _fallback_or_not_playing(m)"
    new = (
        "    if resp.status_code == 429:\n"
        "        _spotify_rate_limited(resp)\n"
        "        return _fallback_or_not_playing(m)\n\n"
        "    if resp.status_code != 200:\n"
        "        return _fallback_or_not_playing(m)"
    )
    if old in text and "resp.status_code == 429" not in text:
        text = text.replace(old, new, 1)

    return text


def patch_html_files() -> int:
    n = 0
    for path in list(HTML_GLOB.glob("mode*.html")) + [HTML_GLOB / "index.html"]:
        if not path.is_file():
            continue
        body = path.read_text()
        new_body = re.sub(
            r"setInterval\(poll,\s*\d+\)",
            "setInterval(poll, 10000)",
            body,
        )
        if new_body != body:
            path.write_text(new_body)
            n += 1
    return n


def main() -> None:
    text = APP.read_text()
    APP.write_text(patch_app(text))
    count = patch_html_files()
    print("patched_app", str(APP))
    print("patched_html", count)


if __name__ == "__main__":
    main()
