#!/bin/bash
set -euo pipefail

# Stop local polls briefly so Spotify quota can recover, then probe once.
systemctl stop spotify-display
pkill -u pi -f 'chromium.*127.0.0.1:8' 2>/dev/null || true
sleep 90
systemctl start spotify-display
sleep 3

cd /home/pi/spotify-display
set -a
# shellcheck disable=SC2046
eval "$(grep '^Environment=' /etc/systemd/system/spotify-display.service | sed 's/^Environment=//g' | sed 's/\"//g')"
set +a
/home/pi/spotify-display/venv/bin/python3 /tmp/pi-spotify-recover.py
