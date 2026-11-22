# Headless Spotify recently-played → Neon (for Task Scheduler, every 15 min).
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$logDir = Join-Path $env:LOCALAPPDATA "Notch\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir "spotify-backfill.log"

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"`n=== $stamp ===" | Out-File -FilePath $logFile -Append -Encoding utf8

try {
  & npm run sync:spotify-neon 2>&1 | Tee-Object -FilePath $logFile -Append
  exit $LASTEXITCODE
} catch {
  $_ | Out-File -FilePath $logFile -Append -Encoding utf8
  exit 1
}