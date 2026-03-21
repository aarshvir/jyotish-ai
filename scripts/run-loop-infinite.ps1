# Run the improvement loop forever until scripts\COMPLETE.txt exists.
$ROOT = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $ROOT

$round = 0
while ($true) {
    $round++
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content "$ROOT\scripts\agent-log.txt" "[$ts][LOOP] [INFINITE] Round $round - starting run-loop.ps1"
    Write-Host "[$ts] Round $round - starting loop (stop when COMPLETE.txt exists)"
    & "$ROOT\scripts\run-loop.ps1"
    $exitCode = $LASTEXITCODE
    if (Test-Path "$ROOT\scripts\COMPLETE.txt") {
        Write-Host "COMPLETE.txt found. Exiting infinite loop."
        break
    }
    Write-Host "Loop exited (code $exitCode). Restarting in 10s..."
    Start-Sleep -Seconds 10
}
