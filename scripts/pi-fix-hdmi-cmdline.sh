#!/bin/bash
# Pi firmware appends snd_bcm2835.enable_hdmi=0; kernel uses the last value — override at end of cmdline.txt.
set -euo pipefail
CMD=/boot/firmware/cmdline.txt
[ -f "$CMD" ] || CMD=/boot/cmdline.txt
if grep -q 'snd_bcm2835.enable_hdmi=1' "$CMD" 2>/dev/null; then
  exit 0
fi
cp -a "$CMD" "${CMD}.bak.$(date +%Y%m%d)"
printf ' snd_bcm2835.enable_hdmi=1' | tee -a "$CMD" >/dev/null
echo "Appended snd_bcm2835.enable_hdmi=1 to $CMD (reboot required)."
