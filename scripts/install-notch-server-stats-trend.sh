#!/usr/bin/env bash
# Install stats + on-disk trend sampling on this machine (run on Mint or Pi).
# Usage: ./install-notch-server-stats-trend.sh mint|pi
set -euo pipefail

FLAVOR="${1:-}"
if [[ "$FLAVOR" != "mint" && "$FLAVOR" != "pi" ]]; then
  echo "Usage: $0 mint|pi" >&2
  exit 1
fi

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN="${NOTCH_STATS_BIN:-$HOME/bin}"
mkdir -p "$BIN"

if [[ "$(readlink -f "$SRC")" != "$(readlink -f "$BIN")" ]]; then
  install -m 755 "$SRC/notch-server-stats-trend.py" "$BIN/notch-server-stats-trend.py"
  install -m 755 "$SRC/notch-${FLAVOR}-stats.sh" "$BIN/notch-${FLAVOR}-stats.sh"
fi

UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
mkdir -p "$UNIT_DIR"
cat >"$UNIT_DIR/notch-server-stats-sample.service" <<EOF
[Unit]
Description=Notch server stats trend sample

[Service]
Type=oneshot
ExecStart=$BIN/notch-server-stats-trend.py --sample-only $FLAVOR
EOF

cat >"$UNIT_DIR/notch-server-stats-sample.timer" <<EOF
[Unit]
Description=Sample Notch server stats every minute

[Timer]
OnBootSec=2min
OnUnitActiveSec=1min
AccuracySec=30

[Install]
WantedBy=timers.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now notch-server-stats-sample.timer
"$BIN/notch-server-stats-trend.py" --sample-only "$FLAVOR"
echo "Installed to $BIN; timer notch-server-stats-sample.timer is active."
