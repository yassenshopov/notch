#!/usr/bin/env bash
# Run on the Mint server (needs sudo once): bash mint-join-5g.sh
set -euo pipefail
IFACE="${1:-wlp1s0}"
SSID="${2:-23_5G}"

read -r -s -p "Wi‑Fi password for ${SSID}: " PSK
echo

sudo nmcli dev wifi connect "${SSID}" password "${PSK}" ifname "${IFACE}"
sudo nmcli connection modify "Auto 23_2_4GHz" connection.autoconnect no 2>/dev/null || true
sudo nmcli connection up "${SSID}" 2>/dev/null || true

iw dev "${IFACE}" link || true
ping -c 3 192.168.1.1
