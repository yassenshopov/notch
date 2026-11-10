#!/usr/bin/env bash
# Run on Mint with sudo (console or ssh mint-home when LAN works).
set -euo pipefail
[[ "${EUID:-$(id -u)}" -eq 0 ]] || { echo "sudo bash $0"; exit 1; }
ufw allow from 192.168.1.0/24 to any port 22 proto tcp comment 'SSH LAN'
ufw allow from 192.168.1.0/24 to any port 53 proto udp comment 'AdGuard DNS'
ufw allow from 192.168.1.0/24 to any port 53 proto tcp comment 'AdGuard DNS'
ufw allow from 192.168.1.0/24 to any port 3000 proto tcp comment 'AdGuard UI'
ufw status numbered | head -25
