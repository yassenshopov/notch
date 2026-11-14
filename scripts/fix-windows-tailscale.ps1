# Fix Tailscale stuck in NoState on Windows (often AdGuard/Mint DNS + CorpDNS conflict).
# Run: PowerShell as Administrator → .\scripts\fix-windows-tailscale.ps1
#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"
$ts = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
if (-not (Test-Path $ts)) {
  Write-Host "Install Tailscale from https://tailscale.com/download" -ForegroundColor Red
  exit 1
}

Restart-Service Tailscale -Force
Start-Sleep -Seconds 4

# Keep using your LAN DNS (Mint AdGuard / router); Tailscale magic DNS often wedges startup here.
& $ts set --accept-dns=false
& $ts set --accept-routes
& $ts down 2>$null
Start-Sleep -Seconds 2
& $ts up
Start-Sleep -Seconds 8
& $ts status

$sshConfig = Join-Path $HOME ".ssh\config"
$mintTsBlock = @"
Host mint-ts
  HostName 100.109.229.109
  User yassenshopov
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
"@
if (Test-Path $sshConfig) {
  if (Select-String -Path $sshConfig -Pattern "Host mint-ts" -Quiet) {
    (Get-Content $sshConfig -Raw) -replace '(?ms)Host mint-ts\r?\n  HostName \S+', "Host mint-ts`n  HostName 100.109.229.109" | Set-Content $sshConfig -NoNewline
  } else {
    Add-Content -Path $sshConfig -Value "`n$mintTsBlock"
  }
}

Write-Host ""
Write-Host "If status is healthy, test:" -ForegroundColor Cyan
Write-Host "  ssh mint-ts          # Tailscale (Mint needs: sudo tailscale set --ssh=false)"
Write-Host "  ssh mint-via-pi      # LAN fallback via Pi"
