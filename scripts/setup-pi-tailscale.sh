#!/usr/bin/env bash
# Run on the Raspberry Pi (with sudo) for always-on Tailscale + SSH.
set -euo pipefail

if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi

sudo systemctl enable --now tailscaled

sudo tailscale up --accept-routes --ssh --hostname=raspberrypi

echo ""
echo "Complete Tailscale login in the browser if prompted."
echo "Then on your laptop: disable key expiry for Pi + Mint —"
echo "  node scripts/tailscale-disable-key-expiry.mjs"
echo "(needs TAILSCALE_API_KEY in .env; see .env.example)"
