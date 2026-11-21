#!/usr/bin/env bash
# Apply a PNG as the Cinnamon desktop background (run on Mint; Notch calls this over SSH).
# Install: mkdir -p ~/bin && cp scripts/mint-apply-wallpaper.sh ~/bin/ && chmod +x ~/bin/notch-apply-wallpaper.sh
set -euo pipefail

FILE="${1:?usage: mint-apply-wallpaper.sh /path/to/wallpaper.png}"
if [[ ! -f "$FILE" ]]; then
  echo "file not found: $FILE" >&2
  exit 1
fi

URI="file://${FILE}"
UID_N="$(id -u)"
export XDG_RUNTIME_DIR="/run/user/${UID_N}"
if [[ -S "${XDG_RUNTIME_DIR}/bus" ]]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"
fi
export DISPLAY="${DISPLAY:-:0}"

gsettings set org.cinnamon.desktop.background picture-uri "$URI"
gsettings set org.cinnamon.desktop.background picture-uri-dark "$URI"
gsettings set org.cinnamon.desktop.background picture-options zoom
gsettings set org.gnome.desktop.background picture-uri "$URI" 2>/dev/null || true

if command -v dconf >/dev/null; then
  dconf write /org/cinnamon/desktop/background/picture-uri "'${URI}'" 2>/dev/null || true
  dconf write /org/cinnamon/desktop/background/picture-uri-dark "'${URI}'" 2>/dev/null || true
fi