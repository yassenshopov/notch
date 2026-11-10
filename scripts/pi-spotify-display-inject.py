#!/usr/bin/env python3
"""Append inject endpoint + file-backed backoff to spotify-display app.py."""
from pathlib import Path

APP = Path("/home/pi/spotify-display/app.py")
BACKOFF_FILE = Path("/home/pi/spotify-display/.spotify_backoff")

INJECT_ROUTE = '''

@app.route("/api/now-playing/inject", methods=["POST"])
def now_playing_inject():
    """Localhost-only: update now-playing cache without calling Spotify."""
    if request.remote_addr not in ("127.0.0.1", "::1"):
        return jsonify({"error": "forbidden"}), 403
    payload = request.get_json(silent=True) or {}
    m = current_mode["mode"]
    track = payload.get("track")
    if not track:
        return jsonify({"error": "missing_track"}), 400
    result = {
        "playing": bool(payload.get("playing", True)),
        "track": str(track),
        "artist": str(payload.get("artist") or ""),
        "album": str(payload.get("album") or ""),
        "art": payload.get("artUrl") or payload.get("art"),
        "progress_ms": int(payload.get("progress_ms") or payload.get("progressMs") or 0),
        "duration_ms": int(payload.get("duration_ms") or payload.get("durationMs") or 0),
        "mode": m,
    }
    now_playing_cache["data"] = result
    now_playing_cache["fetched_at"] = time.time()
    return jsonify(result)
'''

BACKOFF_IO = '''
SPOTIFY_BACKOFF_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".spotify_backoff")


def _read_persisted_backoff():
    global spotify_api_backoff_until
    try:
        with open(SPOTIFY_BACKOFF_FILE) as f:
            spotify_api_backoff_until = max(spotify_api_backoff_until, float(f.read().strip()))
    except Exception:
        pass


def _persist_backoff(until_ts):
    try:
        with open(SPOTIFY_BACKOFF_FILE, "w") as f:
            f.write(str(until_ts))
    except Exception:
        pass
'''


def patch_spotify_rate_limited(fn_block: str) -> str:
    if "_persist_backoff" in fn_block:
        return fn_block
    return fn_block.replace(
        "spotify_api_backoff_until = time.time() + retry",
        "spotify_api_backoff_until = time.time() + retry\n    _persist_backoff(spotify_api_backoff_until)",
    )


def main() -> None:
    text = APP.read_text()
    if "def _read_persisted_backoff" not in text:
        text = text.replace(
            "def _spotify_api_blocked():",
            BACKOFF_IO + "\n_read_persisted_backoff()\n\n\ndef _spotify_api_blocked():",
            1,
        )
        # fix _spotify_rate_limited body if present
        start = text.find("def _spotify_rate_limited")
        end = text.find("def _spotify_api_blocked()")
        if start != -1 and end != -1:
            block = text[start:end]
            text = text[:start] + patch_spotify_rate_limited(block) + text[end:]

    if "/api/now-playing/inject" not in text:
        anchor = '@app.route("/api/now-playing")'
        text = text.replace(anchor, INJECT_ROUTE + "\n\n" + anchor, 1)

    APP.write_text(text)
    # honor cooldown for next 15 minutes
    import time

    BACKOFF_FILE.write_text(str(time.time() + 900))
    print("inject_backoff_ok")


if __name__ == "__main__":
    main()
