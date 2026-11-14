# From Windows (pi-home must work). Enables direct: ssh -p 2222 yassenshopov@192.168.1.18
$pi = "pi@192.168.1.18"
$snippet = @'
# mint reverse SSH relay
Match User pi
    GatewayPorts clientspecified
'@
ssh pi-home @"
grep -q 'GatewayPorts clientspecified' /etc/sudoers.d/mint-relay 2>/dev/null || echo 'pi ALL=(ALL) NOPASSWD: /usr/bin/sed' | sudo tee /etc/sudoers.d/mint-relay >/dev/null
sudo sed -i '/^#GatewayPorts/c\GatewayPorts clientspecified' /etc/ssh/sshd_config
grep -q '^GatewayPorts' /etc/ssh/sshd_config || echo 'GatewayPorts clientspecified' | sudo tee -a /etc/ssh/sshd_config
sudo systemctl reload ssh
sudo ufw allow 2222/tcp comment 'Mint reverse SSH' 2>/dev/null || true
echo Pi sshd + UFW 2222 ready for mint reverse tunnel
"@
