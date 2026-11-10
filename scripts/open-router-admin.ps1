# Opens local router admin and the tuning checklist.
$checklist = Join-Path $PSScriptRoot "home-network-router-checklist.md"
$urls = @("https://192.168.1.1", "http://192.168.1.1")
foreach ($u in $urls) {
  Start-Process $u
}
if (Test-Path $checklist) {
  Start-Process notepad.exe $checklist
}
