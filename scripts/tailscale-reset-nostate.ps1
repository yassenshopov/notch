# Hard reset when tailscale status shows NoState but DNS/netcheck are fine.
# Run: PowerShell as Administrator -> .\scripts\tailscale-reset-nostate.ps1
#Requires -RunAsAdministrator
$ErrorActionPreference = "Continue"
$ts = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
if (-not (Test-Path $ts)) {
  Write-Host "Tailscale not installed." -ForegroundColor Red
  exit 1
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
  Write-Host "Re-open PowerShell with Run as administrator, then run this script again." -ForegroundColor Red
  exit 1
}

function Stop-TailscaleStack {
  Write-Host "Quit Tailscale from the system tray first if you can (then any key to continue)..." -ForegroundColor Yellow
  if ($Host.Name -eq "ConsoleHost") {
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
  } else {
    Start-Sleep -Seconds 5
  }
  $names = @("tailscale-ipn", "tailscaled")
  foreach ($n in $names) {
    Stop-Process -Name $n -Force -ErrorAction SilentlyContinue
  }
  & sc.exe stop Tailscale 2>&1 | Out-Null
  Start-Sleep -Seconds 2
  Stop-Process -Name tailscaled -Force -ErrorAction SilentlyContinue
  $svc = Get-Service Tailscale -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -ne "Stopped") {
    Write-Host "Service did not stop; using taskkill..." -ForegroundColor Yellow
    & taskkill.exe /F /IM tailscaled.exe 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    & sc.exe stop Tailscale 2>&1 | Out-Null
  }
}

function Start-TailscaleStack {
  & sc.exe start Tailscale 2>&1 | Out-Null
  Start-Sleep -Seconds 5
  $svc = Get-Service Tailscale -ErrorAction SilentlyContinue
  if ($svc.Status -ne "Running") {
    Start-Service Tailscale -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
  }
}

Write-Host "Stopping Tailscale service and tailscaled..." -ForegroundColor Cyan
Stop-TailscaleStack
Start-TailscaleStack
Start-Sleep -Seconds 3

$statusOut = & $ts status 2>&1 | Out-String
if ($statusOut -notmatch "NoState") {
  & $ts status
  Write-Host "Tailscale is healthy after service restart." -ForegroundColor Green
  exit 0
}

Write-Host "Still NoState - logging out this node key (you will re-auth once)." -ForegroundColor Yellow
& $ts logout 2>&1 | Out-Host
Stop-TailscaleStack
Start-TailscaleStack
Start-Sleep -Seconds 3

Write-Host "Starting login (browser should open; waiting up to 3 minutes)..." -ForegroundColor Cyan
& $ts set --accept-dns=false 2>$null
& $ts login --accept-dns=false --timeout 3m 2>&1 | Out-Host

Start-Sleep -Seconds 3
& $ts up 2>&1 | Out-Host
Start-Sleep -Seconds 10
& $ts status 2>&1 | Out-Host
& $ts ip 2>&1 | Out-Host