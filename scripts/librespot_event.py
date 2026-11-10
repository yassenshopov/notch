#!/usr/bin/env python3
"""Handle librespot --onevent by POSTing to spotify-display inject API."""
import json
import os
import sys
import urllib.request

API = "http://127.0.0.1:8/api/now-playing/inject"
EVENT = os.environ.get("PLAYER_EVENT", "")


def post(payload: dict) -> None:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        API,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception as err:
        print(f"librespot_event: inject failed: {err}", file=sys.stderr)


def main() -> None:
    if EVENT in ("track_changed", "playing"):
        name = os.environ.get("NAME", "").strip()
        if not name:
            return
        artists = (os.environ.get("ARTISTS") or "").split("\n")
        covers = (os.environ.get("COVERS") or "").split("\n")
        post(
            {
                "playing": True,
                "track": name,
                "artist": artists[0] if artists else "",
                "album": os.environ.get("ALBUM") or "",
                "duration_ms": int(os.environ.get("DURATION_MS") or 0),
                "progress_ms": int(os.environ.get("POSITION_MS") or 0),
                "artUrl": covers[0] if covers and covers[0] else None,
            }
        )
        return

    if EVENT == "paused":
        post({"playing": False, "track": os.environ.get("NAME") or ""})
        return

    if EVENT in ("stopped", "end_of_track"):
        post({"playing": False, "track": ""})


if __name__ == "__main__":
    main()
