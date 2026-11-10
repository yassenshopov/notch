#!/bin/bash
# /etc/raspotify/conf is loaded after override Environment= and forces ALSA + plughw — crashes HDMI playback.
set -euo pipefail
CONF=/etc/raspotify/conf
[ -f "$CONF" ] || exit 0
cp -a "$CONF" "${CONF}.bak.$(date +%Y%m%d%H%M%S)"
if grep -q '^LIBRESPOT_BACKEND=alsa' "$CONF"; then
  sed -i 's/^LIBRESPOT_BACKEND=alsa/LIBRESPOT_BACKEND=pulseaudio/' "$CONF"
fi
sed -i '/^LIBRESPOT_DEVICE=/d' "$CONF"
grep -q '^LIBRESPOT_BACKEND=pulseaudio' "$CONF" || echo 'LIBRESPOT_BACKEND=pulseaudio' >>"$CONF"
echo "Updated $CONF:"
grep -E '^LIBRESPOT_BACKEND|^LIBRESPOT_DEVICE' "$CONF" || true
