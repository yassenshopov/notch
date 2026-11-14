# Run at logon (Task Scheduler). Heals Tailscale NoState when Mint AdGuard DNS + MagicDNS fight.
$ts = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
if (-not (Test-Path $ts)) { exit 0 }

& $ts set --accept-dns=false 2>$null
$status = & $ts status 2>&1 | Out-String
if ($status -match 'NoState|Tailscale is starting|Unable to connect') {
  & $ts down 2>$null
  Start-Sleep -Seconds 2
  & $ts up 2>$null
}
