#!/usr/bin/env python3
import json
import time
from pathlib import Path

import requests

TOKEN_FILE = Path("/home/pi/spotify-display/.tokens.json")
saved = json.loads(TOKEN_FILE.read_text())
ts = saved.get("spotify", {})
h = {"Authorization": f"Bearer {ts['access_token']}"}
for path in ["/me/player/currently-playing", "/me/player/devices", "/me/player"]:
    r = requests.get(f"https://api.spotify.com/v1{path}", headers=h, timeout=12)
    print(path, r.status_code, r.text[:700] if r.content else "")
