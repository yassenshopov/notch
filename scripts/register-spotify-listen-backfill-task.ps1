# Register 24/7 Spotify listen backfill (every 15 min while logged in).
#Requires -RunAsAdministrator

$taskName = "Notch-Spotify-Listen-Backfill"
$script = Join-Path $PSScriptRoot "spotify-listen-backfill.ps1"

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""

$logon = New-ScheduledTaskTrigger -AtLogOn

# PS 5.1: -Daily does not take -RepetitionInterval; copy Repetition from a Once trigger.
$repetitionTemplate = New-ScheduledTaskTrigger `
  -Once `
  -At "3:00AM" `
  -RepetitionInterval (New-TimeSpan -Minutes 15) `
  -RepetitionDuration (New-TimeSpan -Hours 24)

$daily = New-ScheduledTaskTrigger -Daily -At "3:00AM"
$daily.Repetition = $repetitionTemplate.Repetition

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

try {
  Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger @($logon, $daily) `
    -Settings $settings `
    -User $env:USERNAME `
    -Description "Sync Spotify recently played into Neon (notch spotify_streams)" `
    -Force | Out-Null
} catch {
  Write-Error "Failed to register $taskName : $_"
  exit 1
}

$state = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if (-not $state) {
  Write-Error "Task $taskName was not created."
  exit 1
}

Write-Host "Registered $taskName — every 15 min (repeats all day) + at logon."
Write-Host "Logs: $env:LOCALAPPDATA\Notch\logs\spotify-backfill.log"
Write-Host "Run once now: Start-ScheduledTask -TaskName '$taskName'"