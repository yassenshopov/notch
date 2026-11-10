#!/bin/bash
set -euo pipefail
DEST=/home/pi/spotify-display/librespot-event.sh
install -m 755 /tmp/librespot-event.sh "$DEST"
chown pi:pi "$DEST"

OVERRIDE=/etc/systemd/system/raspotify.service.d/override.conf
mkdir -p /etc/systemd/system/raspotify.service.d
cat >"$OVERRIDE" <<'EOF'
[Service]
User=pi
Group=pi
ProtectHome=no
PrivateUsers=no
ExecStartPre=/bin/sleep 8
Restart=on-failure
RestartSec=10
Environment=
Environment="LIBRESPOT_NAME=TV"
Environment="LIBRESPOT_BACKEND=pulseaudio"
Environment="LIBRESPOT_CACHE=/var/cache/raspotify"
Environment="LIBRESPOT_SYSTEM_CACHE=/var/lib/raspotify"
Environment="TMPDIR=/tmp"
Environment="DBUS_SYSTEM_BUS_ADDRESS=unix:path=/run/dbus/system_bus_socket"
Environment="PULSE_SERVER=unix:/run/user/1000/pulse/native"
Environment="XDG_RUNTIME_DIR=/run/user/1000"
Environment="LIBRESPOT_ZEROCONF_BACKEND=avahi"
EnvironmentFile=/etc/raspotify/conf
ExecStart=
ExecStart=/usr/bin/librespot --zeroconf-backend avahi --onevent /home/pi/spotify-display/librespot-event.sh
EOF

systemctl daemon-reload
systemctl restart raspotify
systemctl start spotify-display
sleep 2
systemctl is-active raspotify spotify-display
