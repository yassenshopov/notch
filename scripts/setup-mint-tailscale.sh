#!/usr/bin/env bash
# Run on the Mint box (with sudo) so Notch can reach it via Tailscale when you're off home Wi‑Fi.
set -euo pipefail

if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi

sudo systemctl enable --now tailscaled

sudo tailscale up --accept-routes --ssh --hostname=yassenshopov-x540na

echo ""
echo "Complete Tailscale login in the browser if prompted."
echo "Then on your laptop, disable node-key expiry (servers should not rotate off):"
echo "  node scripts/tailscale-disable-key-expiry.mjs"
echo "(set TAILSCALE_API_KEY in .env — Tailscale admin → Settings → API access tokens)"
