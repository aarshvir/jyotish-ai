# Run every 2 min for ~4 hours: .\scripts\monitor.ps1
# Or: while ($true) { .\scripts\dashboard.ps1; Start-Sleep 120 }
$ROOT = (Get-Item $PSScriptRoot).Parent.FullName
$end = (Get-Date).AddHours(4)
while ((Get-Date) -lt $end) {
    Clear-Host
    & "$ROOT\scripts\dashboard.ps1"
    if (Test-Path "$ROOT\scripts\loop-done.txt") { Write-Host "SUCCESS - loop complete." -ForegroundColor Green; break }
    Write-Host "Next refresh in 2 min (Ctrl+C to stop)"
    Start-Sleep 120
}
