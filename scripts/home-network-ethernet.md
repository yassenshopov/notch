# Ethernet rollout (recommended order)

1. **Mint** (`192.168.1.12`) — AdGuard, SSH, `wifi-sense-agent`, backups. One cable here gives the largest stability win.
2. **Windows PC** — gaming, large git transfers, video calls (Realtek GbE on `Yassen_HP`).
3. **Pi / TV** — only if 4K Wi‑Fi stutters persist after router tuning.

## After plugging in

- Set Wi‑Fi profile to **manual** or disable auto-connect so Ethernet is the default route.
- Mint: `nmcli connection modify 'Auto 23_2_4GHz' connection.autoconnect no` (and same for `23_5G` if wired full-time).
- Verify: `ip -4 route show default` should point to `eth0` / `enp*`.

## DHCP reservations

Keep the same IPs (`.5`, `.12`, `.18`) via router checklist.
