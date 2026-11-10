#!/bin/bash
set -euo pipefail
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/1000}"
export PULSE_SERVER="${PULSE_SERVER:-unix:${XDG_RUNTIME_DIR}/pulse/native}"

# HDMI is often profile "off" until enabled (Pi 4 + PipeWire). Prefer stereo HDMI, not pro-audio.
pactl set-card-profile alsa_card.platform-fef00700.hdmi output:hdmi-stereo 2>/dev/null || \
  pactl set-card-profile alsa_card.platform-fef00700.hdmi pro-audio 2>/dev/null || true
pactl set-card-profile alsa_card.platform-fef05700.hdmi off 2>/dev/null || true

sleep 1
mapfile -t SINKS < <(pactl list sinks short | awk '{print $2}')
HDMI_SINK=""
for s in "${SINKS[@]}"; do
  case "$s" in
    *hdmi*|*HDMI*|*vc4*)
      HDMI_SINK="$s"
      break
      ;;
  esac
done
if [ -z "$HDMI_SINK" ] && [ "${#SINKS[@]}" -ge 2 ]; then
  HDMI_SINK="${SINKS[1]}"
fi
if [ -z "$HDMI_SINK" ]; then
  echo "No HDMI sink; sinks:" >&2
  pactl list sinks short >&2
  exit 0
fi

pactl set-default-sink "$HDMI_SINK"
pactl set-sink-volume "$HDMI_SINK" 100%
pactl set-sink-mute "$HDMI_SINK" 0

echo "default_sink=$(pactl get-default-sink)"
