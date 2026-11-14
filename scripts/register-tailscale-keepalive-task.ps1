# Register logon task (Admin once).
#Requires -RunAsAdministrator
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument `
  "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSScriptRoot\tailscale-windows-keepalive.ps1`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Notch-Tailscale-Keepalive" -Action $action -Trigger $trigger `
  -Settings $settings -Description "Recover Tailscale when stuck in NoState (accept-dns=false)" -Force
Write-Host "Registered Notch-Tailscale-Keepalive (runs at logon)"
