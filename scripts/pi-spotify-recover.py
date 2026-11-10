#!/usr/bin/env python3
"""After quota cool-down: probe Spotify, transfer to TV (Raspotify), start a short track."""
import json
import sys
import time
from pathlib import Path

import requests

API = "https://api.spotify.com/v1"
TOKEN_FILE = Path("/home/pi/spotify-display/.tokens.json")

# Short track for smoke test (Spotify URI).
TEST_URI = "spotify:track:4cOdK2wGLETKBW3PvgPWqT"  # Mr. Brightside


def load_tokens():
    saved = json.loads(TOKEN_FILE.read_text())
    return saved["spotify"]


def refresh_if_needed(ts):
    if time.time() < (ts.get("expires_at") or 0) - 60:
        return ts["access_token"]
    # minimal refresh via spotify-display env
    import os

    cid = os.environ.get("SPOTIFY_CLIENT_ID")
    secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    if not cid or not secret or not ts.get("refresh_token"):
        return ts["access_token"]
    r = requests.post(
        "https://accounts.spotify.com/api/token",
        data={"grant_type": "refresh_token", "refresh_token": ts["refresh_token"]},
        auth=(cid, secret),
        timeout=15,
    )
    if not r.ok:
        return ts["access_token"]
    data = r.json()
    ts["access_token"] = data["access_token"]
    ts["expires_at"] = time.time() + data.get("expires_in", 3600)
    saved = json.loads(TOKEN_FILE.read_text())
    saved["spotify"] = ts
    TOKEN_FILE.write_text(json.dumps(saved))
    return ts["access_token"]


def main() -> int:
    ts = load_tokens()
    token = refresh_if_needed(ts)
    h = {"Authorization": f"Bearer {token}"}

    r = requests.get(f"{API}/me/player/currently-playing", headers=h, timeout=15)
    print("probe_status", r.status_code)
    if r.status_code == 429:
        print(r.text[:200])
        return 1
    if r.status_code == 200 and r.content:
        print("already_playing", r.json().get("item", {}).get("name"))
        return 0

    dev = requests.get(f"{API}/me/player/devices", headers=h, timeout=15)
    print("devices_status", dev.status_code)
    if not dev.ok:
        print(dev.text[:300])
        return 1
    devices = dev.json().get("devices", [])
    tv = next(
        (d for d in devices if "tv" in (d.get("name") or "").lower() or "raspotify" in (d.get("name") or "").lower()),
        None,
    )
    if not tv:
        print("no_tv_device", [d.get("name") for d in devices])
        return 1
    print("tv_device", tv.get("name"), tv.get("id"))

    tr = requests.put(
        f"{API}/me/player",
        headers=h,
        json={"device_ids": [tv["id"]], "play": True},
        timeout=15,
    )
    print("transfer", tr.status_code)

    time.sleep(1)
    pl = requests.put(
        f"{API}/me/player/play?device_id={tv['id']}",
        headers=h,
        json={"uris": [TEST_URI]},
        timeout=15,
    )
    print("play", pl.status_code)

    time.sleep(2)
    r2 = requests.get(f"{API}/me/player/currently-playing", headers=h, timeout=15)
    print("after_status", r2.status_code, r2.text[:400] if r2.content else "")
    return 0 if r2.status_code == 200 else 1


if __name__ == "__main__":
    sys.exit(main())
