#!/bin/bash
set -euo pipefail
APP=/home/pi/spotify-display/app.py
sed -i 's/POLL_INTERVAL = 3/POLL_INTERVAL = 8/' "$APP"
sed -i 's/STALE_GRACE = 30/STALE_GRACE = 120/' "$APP"
sed -i 's/if cached and cached.get("playing") and age < STALE_GRACE:/if cached and age < STALE_GRACE and (cached.get("playing") or cached.get("track")):/' "$APP"
sed -i 's/setInterval(poll, 1000)/setInterval(poll, 4000)/g' /home/pi/spotify-display/mode*.html /home/pi/spotify-display/index.html 2>/dev/null || true
systemctl restart spotify-display
sleep 2
curl -s http://127.0.0.1:8/api/now-playing
echo
