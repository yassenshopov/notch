#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-mint-home}"
REMOTE_DIR="${2:-/home/yassenshopov/wifi-sense-agent}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Syncing agent to ${REMOTE}:${REMOTE_DIR}"
ssh -o BatchMode=yes "$REMOTE" "mkdir -p '$REMOTE_DIR'"
rsync -av --delete \
  --exclude .venv \
  --exclude __pycache__ \
  --exclude '*.pyc' \
  "$ROOT/" "$REMOTE:$REMOTE_DIR/"

echo "Creating venv and installing deps…"
if ssh -o BatchMode=yes "$REMOTE" "cd '$REMOTE_DIR' && python3 -m venv .venv 2>/dev/null"; then
  ssh -o BatchMode=yes "$REMOTE" "cd '$REMOTE_DIR' && .venv/bin/pip install -U pip && .venv/bin/pip install -r requirements.txt"
else
  echo "python3-venv missing — using pip --user (install python3.10-venv for systemd venv)"
  ssh -o BatchMode=yes "$REMOTE" "cd '$REMOTE_DIR' && pip3 install --user -r requirements.txt"
fi

ENV_FILE="$REMOTE_DIR/.env"
if ! ssh -o BatchMode=yes "$REMOTE" "test -f '$ENV_FILE'"; then
  TS_IP="$(ssh -o BatchMode=yes "$REMOTE" 'tailscale ip -4 2>/dev/null | head -1' || true)"
  BIND="${TS_IP:-127.0.0.1}"
  ssh -o BatchMode=yes "$REMOTE" "cat > '$ENV_FILE'" <<EOF
WIFI_SENSE_BIND=${BIND}
WIFI_SENSE_PORT=8765
WIFI_SENSE_IFACE=wlp1s0
WIFI_SENSE_POLL_HZ=8
# WIFI_SENSE_TOKEN=
# WIFI_SENSE_DEMO=0
EOF
  echo "Wrote default $ENV_FILE (bind ${BIND})"
fi

echo "Install systemd unit (requires sudo on Mint):"
echo "  sudo cp $REMOTE_DIR/deploy/wifi-sense-agent.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload && sudo systemctl enable --now wifi-sense-agent"
