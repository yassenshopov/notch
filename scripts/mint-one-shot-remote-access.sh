#!/usr/bin/env bash
# Run ONCE on the Mint laptop (keyboard). After this, SSH from Windows via Pi or Tailscale
# without touching Mint again.
set -euo pipefail

PI=pi@192.168.1.18
TUN_PORT=2222

echo "== Tailscale: use normal sshd (not Tailscale SSH) =="
tailscale set --ssh=false 2>/dev/null || true
tailscale set --shields-up=false 2>/dev/null || true

echo "== Wi-Fi: reduce dropouts (optional) =="
sudo iw dev wlp1s0 set power_save off 2>/dev/null || true

echo "== SSH key to Pi (for reverse tunnel) =="
if [[ ! -f ~/.ssh/id_ed25519.pub ]]; then
  ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
fi
ssh-copy-id -o StrictHostKeyChecking=accept-new "$PI" || true

UNIT_DIR="$HOME/.config/systemd/user"
mkdir -p "$UNIT_DIR"
cat > "$UNIT_DIR/mint-reverse-ssh.service" <<EOF
[Unit]
Description=Reverse SSH to Pi (LAN access to Mint sshd)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/ssh -N \\
  -o ServerAliveInterval=30 \\
  -o ServerAliveCountMax=3 \\
  -o ExitOnForwardFailure=yes \\
  -R 127.0.0.1:${TUN_PORT}:127.0.0.1:22 \\
  ${PI}
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now mint-reverse-ssh.service

echo ""
echo "On the Pi (once): sudo ufw allow 2222/tcp"
echo "Done. On Windows use:"
echo "  ssh -p ${TUN_PORT} yassenshopov@192.168.1.18   # direct (after pi-enable-mint-reverse-tunnel.ps1)"
echo "  ssh mint-via-pi   # or ProxyJump (see fix-windows-tailscale.ps1)"
echo ""
echo "Also fix Tailscale on Windows, then: ssh mint-ts"
