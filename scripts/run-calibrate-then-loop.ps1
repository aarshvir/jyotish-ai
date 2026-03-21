$ROOT = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $ROOT

function Log($msg) {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $msg" -ForegroundColor Cyan
    Add-Content "scripts\agent-log.txt" "[$ts][CAL] $msg"
}

function PortOpen($port) {
    try {
        $t = New-Object System.Net.Sockets.TcpClient
        $t.Connect("localhost",$port); $t.Close(); return $true
    } catch { return $false }
}

function WaitPort($port,$secs=35) {
    $end=(Get-Date).AddSeconds($secs)
    while((Get-Date)-lt $end){
        if(PortOpen $port){return $true}
        Start-Sleep 2
    }
    return $false
}

Log "=== CALIBRATE THEN LOOP ==="

# Ensure servers running
if (-not (PortOpen 8001)) {
    Log "Starting ephemeris..."
    Start-Process "cmd" -ArgumentList "/c cd /d `"$ROOT\ephemeris-service`" && py -m uvicorn main:app --port 8001 >> `"$ROOT\scripts\eph-server.log`" 2>&1" -WindowStyle Hidden
    WaitPort 8001 35 | Out-Null
    Log "Ephemeris ready"
}
if (-not (PortOpen 3000)) {
    Log "Starting Next.js..."
    Start-Process "cmd" -ArgumentList "/c cd /d `"$ROOT`" && npm run dev >> `"$ROOT\scripts\next-server.log`" 2>&1" -WindowStyle Hidden
    Start-Sleep 30
    Log "Next.js ready"
}

# Run calibration
Log "Running auto-calibration..."
$cal = Start-Process "py" -ArgumentList "`"$ROOT\scripts\auto-calibrate.py`"" `
    -WorkingDirectory $ROOT -Wait -PassThru `
    -RedirectStandardOutput "$ROOT\scripts\cal-out.txt" `
    -RedirectStandardError "$ROOT\scripts\cal-err.txt" `
    -NoNewWindow

Get-Content "$ROOT\scripts\cal-out.txt" | ForEach-Object { Write-Host "  $_" }

if ($cal.ExitCode -eq 0) {
    Log "Calibration passed 5/7 - starting main loop"
    # Set MAX_LOOPS to 10 for overnight run
    (Get-Content "$ROOT\scripts\run-loop.ps1") `
        -replace '\$MAX_LOOPS\s*=\s*\d+', '$MAX_LOOPS = 10' | `
        Set-Content "$ROOT\scripts\run-loop.ps1"
    & "$ROOT\scripts\run-loop.ps1"
} else {
    Log "Calibration did not reach 5/7"
    Log "Check scripts/calibration-needed.txt for diagnosis"
    Log "Check scripts/cal-out.txt for full output"

    # Show what best result was
    if (Test-Path "$ROOT\scripts\calibration-needed.txt") {
        $d = Get-Content "$ROOT\scripts\calibration-needed.txt" | ConvertFrom-Json
        Log "Best achieved: $($d.best_ok)/7"
    }
}
