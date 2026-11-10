# Homelab follow-ups

## Tailscale subnet router (Pi)

Pi advertises `192.168.1.0/24`. In [Tailscale admin → Machines](https://login.tailscale.com/admin/machines), open **raspberrypi** and **approve** the subnet route.

IP forwarding is enabled (`/etc/sysctl.d/99-tailscale-forward.conf`).

## Disable key expiry (optional)

Add `TAILSCALE_API_KEY` to Notch `.env` and run:

```bash
node scripts/tailscale-disable-key-expiry.mjs
```

## AdGuard

- **Now:** `http://192.168.1.18:3000` (admin credentials set during headless install — change password in UI).
- **Target:** Mint `192.168.1.12` after `scripts\mint-one-time-sudo.ps1`.
