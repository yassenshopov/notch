# Opens AdGuard via Tailscale. If mint-home SSH works, applies UFW LAN rules.
$repo = Split-Path $PSScriptRoot -Parent
$script = Join-Path $PSScriptRoot "mint-ufw-lan-adguard.sh"
$mintUrl = "http://100.109.229.109:3000/"

Write-Host "AdGuard (Tailscale): $mintUrl"
Start-Process $mintUrl

$ssh = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $ssh) { exit 0 }

$ok = Test-NetConnection -ComputerName 192.168.1.12 -Port 22 -WarningAction SilentlyContinue
if (-not $ok.TcpTestSucceeded) {
  Write-Host ""
  Write-Host "SSH to 192.168.1.12 failed - run on the Mint laptop (keyboard):" -ForegroundColor Yellow
  Write-Host @'
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 53 proto udp
sudo ufw allow from 192.168.1.0/24 to any port 53 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp
'@
  exit 1
}

Get-Content $script -Raw -ErrorAction Stop | ssh mint-home "sudo bash -s"
Write-Host "Done. Try http://192.168.1.12:3000/"
