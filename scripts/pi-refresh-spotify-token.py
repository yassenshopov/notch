#!/usr/bin/env python3
import json
import os
import time
from pathlib import Path

import requests

TOKEN_FILE = Path("/home/pi/spotify-display/.tokens.json")
CACHE_TOKEN = Path("/home/pi/spotify-display/__pycache__/.tokens.json")

cid = os.environ["SPOTIFY_CLIENT_ID"]
secret = os.environ["SPOTIFY_CLIENT_SECRET"]
saved = json.loads(TOKEN_FILE.read_text())
ts = saved["spotify"]
r = requests.post(
    "https://accounts.spotify.com/api/token",
    data={"grant_type": "refresh_token", "refresh_token": ts["refresh_token"]},
    auth=(cid, secret),
    timeout=20,
)
print("refresh", r.status_code)
r.raise_for_status()
data = r.json()
ts["access_token"] = data["access_token"]
ts["expires_at"] = time.time() + data.get("expires_in", 3600)
if data.get("refresh_token"):
    ts["refresh_token"] = data["refresh_token"]
saved["spotify"] = ts
blob = json.dumps(saved)
TOKEN_FILE.write_text(blob)
CACHE_TOKEN.write_text(blob)
print("saved_tokens")
