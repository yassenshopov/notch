#!/usr/bin/env bash
# One-time Mint setup (Wi‑Fi 5 GHz + AdGuard Home). Run: ssh -t mint-home 'bash -s' < scripts/mint-sudo-network-setup.sh
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Re-run as root: sudo bash $0"
  exit 1
fi

NETDEV_USER="${NETDEV_USER:-yassenshopov}"
usermod -aG netdev "$NETDEV_USER" 2>/dev/null || true

IFACE="${IFACE:-wlp1s0}"
SSID_5G="${SSID_5G:-23_5G}"
if ! nmcli -t -f NAME connection show | grep -qx "23_5G"; then
  if [[ -z "${PSK_5G:-}" ]]; then
    read -r -s -p "Password for ${SSID_5G}: " PSK_5G
    echo
  fi
  nmcli connection add type wifi con-name "23_5G" ifname "$IFACE" ssid "$SSID_5G" \
    wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$PSK_5G" \
    connection.autoconnect yes connection.autoconnect-priority 100
fi
nmcli connection modify "Auto 23_2_4GHz" connection.autoconnect no 2>/dev/null || true
nmcli connection up "23_5G" || nmcli device wifi connect "$SSID_5G" ifname "$IFACE"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -x "$SCRIPT_DIR/install-adguard-home.sh" ]]; then
  bash "$SCRIPT_DIR/install-adguard-home.sh"
else
  curl -fsSL https://raw.githubusercontent.com/AdguardTeam/AdGuardHome/master/scripts/install.sh | sh -s -- -v
fi

LAN_IP="$(hostname -I | awk '{print $1}')"
echo "---"
echo "Mint 5 GHz: $(iw dev "$IFACE" link 2>/dev/null | sed -n 's/^[[:space:]]*SSID: //p' | head -1)"
echo "AdGuard: configure at http://${LAN_IP}:3000 if first run"
echo "Router DHCP DNS primary: ${LAN_IP}, secondary 1.1.1.1"
