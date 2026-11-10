#!/bin/bash
# Usage: ./pi-set-tv-mode.sh 9   (or ssh pi@192.168.1.18 'bash -s' < pi-set-tv-mode.sh -- 9)
set -euo pipefail
MODE="${1:-9}"
ROOT=/home/pi/spotify-display
printf '%s\n' "$MODE" | sudo tee "$ROOT/.mode" >/dev/null
sudo cp "$ROOT/.mode" "$ROOT/__pycache__/.mode"
curl -sfS -X POST "http://127.0.0.1:8/api/mode?set=${MODE}" || true
curl -sfS "http://127.0.0.1:8/api/mode" || true
echo
bash "$ROOT/chromium-watchdog.sh" || true
