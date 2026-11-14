# Home network baseline (before optimization)

Captured: 2026-11-08

## PC (Yassen_HP, 192.168.1.5)

- SSID: `23_5G`, 5 GHz ch 52, 802.11ac WPA2, RSSI −37 dBm
- Rates: RX 866.7 / TX 780 Mbps
- Ping GW 192.168.1.1: min 0ms, avg 2ms, max 13ms (n=20)
- Ping 1.1.1.1: min 2ms, avg 3ms, max 15ms (n=20)

## Mint (192.168.1.12)

- SSID: `23_2_4GHz`, 2.4 GHz, RSSI −37 dBm, TX 300 Mbps
- Ping GW: min 1.6ms, avg 14.2ms, max 57.1ms (n=20) — high jitter
- Ping 1.1.1.1: min 3.4ms, avg 25.3ms, max 72.7ms (n=20)

## Pi (192.168.1.18)

- Ping GW: min 1.0ms, avg 3.9ms, max 5.4ms (n=20)
- Ping 1.1.1.1: min 2.0ms, avg 5.6ms, max 8.8ms (n=20)

## Notes

- Vivacom DNS: 213.226.0.180/181 via DHCP
- Gateway: 192.168.1.1 (50:A9:DE)

---

## After automation (2026-11-08 evening)

| Item | Status |
|------|--------|
| Tailscale on Windows | `tailscale set --accept-dns=false` if stuck **NoState** (AdGuard DNS + MagicDNS clash); logon task: `register-tailscale-keepalive-task.ps1` |
| SSH `pi-home` / `pi-ts` | Fixed (`192.168.1.18` / tailnet IP) |
| Mint 5 GHz | **Done** — `23_5G` (5260 MHz) |
| AdGuard DNS | **Mint** `192.168.1.12:53` configured; Pi `.18` can stay as fallback until router DHCP updated |
| Pi subnet route | Advertised `192.168.1.0/24` — [approve in Tailscale admin](https://login.tailscale.com/admin/machines) |
| Router tuning | Checklist opened via `scripts\open-router-admin.ps1` |
| Notch trend | `pingGwMs` + `wifiRssiDbm` in `notch-server-stats-trend.py`; timers on Mint/Pi |

### Validation (after)

- PC ping GW avg **3 ms**; 1.1.1.1 avg **5 ms**
- Mint still on `23_2_4GHz` (avg WAN ping **10 ms** with spikes to **45 ms** — fix with 5 GHz script)
- `nslookup cloudflare.com 192.168.1.18` works from PC after UFW DNS rules
