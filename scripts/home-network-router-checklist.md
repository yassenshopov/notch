# Router tuning checklist (192.168.1.1)

## A1 (your ISP)

Many **A1 Tenda/Smartcom** boxes (`50:A9:DE…`) respond to **ping** but **refuse HTTP/HTTPS** — web admin is off; settings are via **Моят А1** or support (**123**).

- Wi‑Fi name/password, bands, channel (if offered): [Моят А1 → Wi‑Fi module](https://help.a1.bg/my-a1/wi-fi-module)
- **Custom DNS in DHCP** is often **not** in the app. Use per-device DNS: `scripts\set-windows-dns-mint.ps1` (Admin) on Windows; Mint/Pi already use local AdGuard.

Local browser admin **only if** your model allows it: **https://192.168.1.1** (not `192.168.0.1`).

## DHCP reservations

| Device | MAC hint | IP |
|--------|-----------|-----|
| Windows PC | F8:FE:5E:87:97:7C | 192.168.1.5 |
| Mint server | (from `ip link` on wlp1s0) | 192.168.1.12 |
| Raspberry Pi | (from `ip link` on wlan0) | 192.168.1.18 |

## DNS (AdGuard)

- **Target (Mint):** primary **192.168.1.12**, secondary **1.1.1.1** — run `scripts\mint-one-time-sudo.ps1` once to install and move Mint to 5 GHz.
- **Now (Pi, working):** primary **192.168.1.18**, secondary **1.1.1.1** until Mint is finished.
- Reboot clients or `ipconfig /flushdns` on Windows after changing DHCP DNS.

## 5 GHz (`23_5G`)

- Mode: **802.11ax** if available, else ac
- Channel width: **80 MHz**
- Channel: **36–48** or **149–161** (avoid DFS **52** if you see odd dropouts)
- Security: **WPA2/WPA3 mixed**
- **WPS: off**

## 2.4 GHz (`23_2_4GHz`)

- Width: **20 MHz** preferred
- Channel: **1**, **6**, or **11** (pick least congested)
- **Band steering: off** (you use split SSIDs)

## QoS

- If available: enable gaming/voice priority or upload cap ~**95%** of plan speed

## After changes

Reboot router once, then re-run baseline pings from [home-network-baseline.md](./home-network-baseline.md).
