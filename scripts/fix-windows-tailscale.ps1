# Fix Tailscale stuck in NoState on Windows (often AdGuard/Mint DNS + CorpDNS conflict).
# Run: PowerShell as Administrator -> .\scripts\fix-windows-tailscale.ps1
#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"
$ts = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
if (-not (Test-Path $ts)) {
  Write-Host "Install Tailscale from https://tailscale.com/download" -ForegroundColor Red
  exit 1
}

function Test-MintAdGuardDns {
  param([string]$MintDns = "192.168.1.12")
  try {
    $r = Resolve-DnsName -Name controlplane.tailscale.com -Server $MintDns -DnsOnly -ErrorAction Stop
    return $null -ne $r
  } catch {
    return $false
  }
}

function Set-FallbackLanDns {
  param([string]$MintDns = "192.168.1.12")
  $adapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.HardwareInterface } | Select-Object -First 1
  if (-not $adapter) {
    Write-Host "No active network adapter found." -ForegroundColor Yellow
    return $null
  }
  $alias = $adapter.InterfaceAlias
  $before = (Get-DnsClientServerAddress -InterfaceAlias $alias -AddressFamily IPv4).ServerAddresses
  Set-DnsClientServerAddress -InterfaceAlias $alias -ServerAddresses @("192.168.1.1", "1.1.1.1")
  Clear-DnsClientCache
  Write-Host "Mint AdGuard DNS ($MintDns) is not answering - switched $alias DNS:" -ForegroundColor Yellow
  Write-Host "  was: $($before -join ', ')" -ForegroundColor DarkGray
  Write-Host "  now: 192.168.1.1, 1.1.1.1" -ForegroundColor DarkGray
  Write-Host "  (After Mint is healthy again, set primary DNS back to 192.168.1.12 if you want AdGuard.)" -ForegroundColor DarkGray
  return $alias
}

$MintDns = "192.168.1.12"
if (-not (Test-MintAdGuardDns -MintDns $MintDns)) {
  $null = Set-FallbackLanDns -MintDns $MintDns
}

Restart-Service Tailscale -Force
Start-Sleep -Seconds 4

# Keep using your LAN DNS (Mint AdGuard / router); Tailscale magic DNS often wedges startup here.
& $ts set --accept-dns=false
& $ts set --accept-routes
& $ts down 2>$null
Start-Sleep -Seconds 2
& $ts up
$healthy = $false
for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep -Seconds 5
  $statusOut = & $ts status 2>&1 | Out-String
  if ($statusOut -notmatch "NoState|Tailscale is starting") {
    $healthy = $true
    break
  }
}
if (-not $healthy) {
  Write-Host "Still NoState after wait - forcing another service cycle..." -ForegroundColor Yellow
  Restart-Service Tailscale -Force
  Start-Sleep -Seconds 5
  & $ts down 2>$null
  Start-Sleep -Seconds 2
  & $ts up
  Start-Sleep -Seconds 20
}
& $ts status

$sshConfig = Join-Path $HOME ".ssh\config"
$mintTsIp = "100.109.229.109"
$mintTsBlock = "Host mint-ts`n  HostName $mintTsIp`n  User yassenshopov`n  IdentityFile ~/.ssh/id_ed25519`n  IdentitiesOnly yes"
if (Test-Path $sshConfig) {
  $raw = Get-Content $sshConfig -Raw
  if (Select-String -Path $sshConfig -Pattern 'Host mint-ts' -Quiet) {
    $raw = $raw -replace '(?ms)Host mint-ts\r?\n  HostName \S+', "Host mint-ts`n  HostName $mintTsIp"
  } else {
    $raw += "`n$mintTsBlock"
  }
  # Notch expects "mint" = Tailscale when away; LAN-only 192.168.1.12 breaks off-network sync.
  if ($raw -match '(?ms)Host mint\r?\n  HostName 192\.168\.1\.12') {
    $raw = $raw -replace '(?ms)Host mint\r?\n  HostName 192\.168\.1\.12', "Host mint`n  HostName $mintTsIp"
    Write-Host "Updated SSH Host mint -> Tailscale $mintTsIp (mint-home stays on LAN)." -ForegroundColor Cyan
  }
  Set-Content -Path $sshConfig -Value $raw -NoNewline
}

$stillNoState = (& $ts status 2>&1 | Out-String) -match 'NoState'
if ($stillNoState) {
  Write-Host ""
  Write-Host "Tailscale still NoState (DNS is OK; tailscaled is wedged)." -ForegroundColor Red
  Write-Host "Try in this Admin window:" -ForegroundColor Yellow
  Write-Host '  & $ts login' -ForegroundColor DarkGray
  Write-Host "  Or: quit Tailscale from the tray icon, reopen it, click Connect." -ForegroundColor DarkGray
  Write-Host '  Or: & $ts bugreport' -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "If status is healthy, test:" -ForegroundColor Cyan
Write-Host "  ssh mint-ts"
Write-Host "  ssh mint-via-pi"
Write-Host ""
Write-Host "LAN ssh mint-home / pi-home still need Mint sshd and Pi powered on." -ForegroundColor DarkGray