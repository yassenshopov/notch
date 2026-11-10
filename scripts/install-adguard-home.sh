#!/usr/bin/env bash
# AdGuard Home on Linux (Pi or Mint). Requires root.
set -euo pipefail

[[ "${EUID:-$(id -u)}" -eq 0 ]] || { echo "Run: sudo bash $0"; exit 1; }

AGH_DIR="/opt/AdGuardHome"
if [[ ! -x "$AGH_DIR/AdGuardHome" ]]; then
  curl -fsSL https://raw.githubusercontent.com/AdguardTeam/AdGuardHome/master/scripts/install.sh | sh -s -- -v
fi

# First-run wizard: open http://<lan-ip>:3000 or use /control/install/configure after the service is listening.
systemctl enable --now AdGuardHome 2>/dev/null || systemctl enable --now AdGuardHome.service
systemctl restart AdGuardHome 2>/dev/null || systemctl restart AdGuardHome.service || true

LAN_IP="$(hostname -I | awk '{print $1}')"
echo "AdGuard Home: http://${LAN_IP}:3000"
echo "DNS for LAN DHCP: ${LAN_IP} (secondary 1.1.1.1)"
