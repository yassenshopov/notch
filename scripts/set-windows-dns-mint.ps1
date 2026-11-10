# Point this PC at Mint AdGuard (use when A1 locks the router web UI).
# Must run elevated (Administrator).
param(
  [switch]$Elevate
)

$dns = "192.168.1.12"
$fallback = "1.1.1.1"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
  if ($Elevate) {
    $arg = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process powershell.exe -Verb RunAs -ArgumentList $arg
    exit 0
  }
  Write-Host "This script must run as Administrator." -ForegroundColor Yellow
  Write-Host "Re-run:  .\scripts\set-windows-dns-mint.ps1 -Elevate" -ForegroundColor Cyan
  Write-Host "Or: Right-click PowerShell -> Run as administrator, then run this script again."
  exit 1
}

$iface = (Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.Name -match "Wi-?Fi" } | Select-Object -First 1 -ExpandProperty Name)
if (-not $iface) {
  Write-Error "No active Wi-Fi adapter found."
  exit 1
}

Set-DnsClientServerAddress -InterfaceAlias $iface -ServerAddresses @($dns, $fallback) -Validate
netsh interface ipv4 set dnsservers name="$iface" source=static address=$dns register=primary validate=no | Out-Null
netsh interface ipv4 add dnsservers name="$iface" address=$fallback index=2 validate=no | Out-Null
Clear-DnsClientCache

$current = (Get-DnsClientServerAddress -InterfaceAlias $iface -AddressFamily IPv4).ServerAddresses
Write-Host "DNS for '$iface': $($current -join ', ')"
if ($current -notcontains $dns) {
  Write-Error "DNS was not updated. Try Settings -> Network -> Wi-Fi -> DNS server assignment -> Manual -> $dns"
  exit 1
}
Write-Host "OK - this PC now uses Mint AdGuard at $dns"
