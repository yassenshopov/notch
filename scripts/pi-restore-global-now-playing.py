#!/usr/bin/env python3
"""Restore account-wide Spotify Web API now-playing; drop stuck local inject cache."""
from __future__ import annotations

import re
from pathlib import Path

APP = Path("/home/pi/spotify-display/app.py")
BACKOFF_FILE = Path("/home/pi/spotify-display/.spotify_backoff")
HTML_DIR = Path("/home/pi/spotify-display")

# Shorter backoff on 429 — still protects quota but recovers for any-device tracking.
BACKOFF_SNIPPET = """    retry = 120"""


def patch_app(text: str) -> str:
    text = re.sub(r"POLL_INTERVAL = \d+", "POLL_INTERVAL = 5", text)
    text = re.sub(r"STALE_GRACE = \d+", "STALE_GRACE = 45", text)

    if 'cached.get("source")' not in text:
        text = text.replace(
            """    if cached and age < STALE_GRACE and (cached.get("playing") or cached.get("track")):""",
            """    if (
        cached
        and cached.get("source") == "api"
        and age < STALE_GRACE
        and (cached.get("playing") or cached.get("track"))
    ):""",
            1,
        )

    early = """    if now_playing_cache["data"] and elapsed_since_poll < POLL_INTERVAL:
        cached = dict(now_playing_cache["data"])
        cached["mode"] = m
        if cached.get("playing") and cached.get("progress_ms") is not None:"""
    early_new = """    if (
        now_playing_cache["data"]
        and now_playing_cache["data"].get("source") == "api"
        and elapsed_since_poll < POLL_INTERVAL
    ):
        cached = dict(now_playing_cache["data"])
        cached["mode"] = m
        if cached.get("playing") and cached.get("progress_ms") is not None:"""
    if early in text:
        text = text.replace(early, early_new, 1)

    if "resp.status_code == 204" in text and "# 204: no active playback" not in text:
        text = text.replace(
            """    if resp.status_code == 204 or not resp.content:
        return _fallback_or_not_playing(m)""",
            """    # 204: no active playback on any device; do not show stale local/TV inject.
    if resp.status_code == 204 or not resp.content:
        now_playing_cache["data"] = None
        now_playing_cache["fetched_at"] = time.time()
        return jsonify({"playing": False, "mode": m})""",
            1,
        )

    marker = "    now_playing_cache[\"data\"] = result"
    if marker in text and '"source": "api"' not in text:
        text = text.replace(
            marker,
            '    result["source"] = "api"\n    now_playing_cache["data"] = result',
            1,
        )

    inject_block = re.compile(
        r'@app\.route\("/api/now-playing/inject".*?\n\n@app\.route\("/api/now-playing"\)',
        re.DOTALL,
    )
    inject_stub = '''@app.route("/api/now-playing/inject", methods=["POST"])
def now_playing_inject():
    """Disabled: display tracks Spotify Web API playback (any device)."""
    return jsonify({"error": "inject_disabled"}), 410


@app.route("/api/now-playing")'''
    if "inject_disabled" not in text:
        text, n = inject_block.subn(inject_stub, text, count=1)
        if n != 1:
            raise SystemExit("inject_block_not_found")

    text = re.sub(
        r"retry = \d+",
        "retry = 120",
        text,
        count=1,
    )

    return text


def patch_html() -> None:
    for path in list(HTML_DIR.glob("mode*.html")) + [HTML_DIR / "index.html"]:
        if not path.is_file():
            continue
        body = path.read_text()
        body = re.sub(r"setInterval\(poll,\s*\d+\)", "setInterval(poll, 3000)", body)
        path.write_text(body)


def main() -> None:
    text = APP.read_text()
    APP.write_text(patch_app(text))
    patch_html()
    now_playing_cache = {"data": None, "fetched_at": 0}  # noqa: F841
    try:
        BACKOFF_FILE.unlink()
    except FileNotFoundError:
        pass
    # Clear in-memory cache on next restart
    print("restore_global_now_playing_ok")


if __name__ == "__main__":
    main()
