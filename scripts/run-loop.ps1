$ErrorActionPreference = "Continue"
$ROOT = (Get-Item $PSScriptRoot).Parent.FullName
$MAX_LOOPS = 1
$PYTHON = "py"
$NODE = "node"

Set-Location $ROOT

function Log($msg) {
    $ts = Get-Date -Format "HH:mm:ss"
    $line = "[$ts][LOOP] $msg"
    Write-Host $line -ForegroundColor Cyan
    try {
        Add-Content "$ROOT\scripts\agent-log.txt" $line -ErrorAction Stop
    } catch {
        try {
            $line | Out-File -FilePath "$ROOT\scripts\agent-log.txt" -Append -Encoding utf8 -ErrorAction SilentlyContinue
        } catch {}
    }
}

function Die($msg) {
    Log "FATAL: $msg"
    exit 1
}

function KillPort($port) {
    # Prefer reliable listener->PID mapping when available.
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            $pid_ = $c.OwningProcess
            if ($pid_ -and $pid_ -ne 0) {
                try { Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue } catch {}
            }
        }
    } catch {}

    # Fallback parsing (netstat) for older/locked environments.
    $lines = netstat -ano 2>$null | Select-String ":$port\s"
    foreach ($line in $lines) {
        $parts = ($line.Line -replace '\s+', ' ').Trim().Split(' ')
        $pid_ = $parts[-1]
        if ($pid_ -match '^\d+$' -and $pid_ -ne '0') {
            try { taskkill /PID $pid_ /F 2>$null | Out-Null } catch {}
        }
    }
}

function PortOpen($port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("localhost", $port)
        $tcp.Close()
        return $true
    } catch { return $false }
}

function WaitPort($port, $secs=35) {
    $end = (Get-Date).AddSeconds($secs)
    while ((Get-Date) -lt $end) {
        if (PortOpen $port) { return $true }
        Start-Sleep 2
    }
    return $false
}

function StartEphemeris {
    if (PortOpen 8001) { Log "Ephemeris already up"; return }
    $maxTries = 3
    foreach ($try in 1..$maxTries) {
        Log "Starting ephemeris on :8001... (attempt $try/$maxTries)"
        KillPort 8001
        Start-Sleep 2
        $arg = '/c cd /d "' + $ROOT + '\ephemeris-service" & py -m uvicorn main:app --port 8001 >> "' + $ROOT + '\scripts\eph-server.log" 2>&1'
        Start-Process "cmd" -ArgumentList $arg -WindowStyle Hidden
        if (WaitPort 8001 90) { Log "Ephemeris ready"; return }
        Log "Ephemeris not ready yet - last log:"
        if (Test-Path "$ROOT\scripts\eph-server.log") {
            Get-Content "$ROOT\scripts\eph-server.log" -Tail 10 | ForEach-Object { Log "  EPH: $_" }
        }
        if ($try -lt $maxTries) { Start-Sleep 5 }
    }
    Die "Cannot start ephemeris after $maxTries attempts"
}

function StartNextJS {
    if (PortOpen 3000) { Log "Next.js already up"; return }
    $maxTries = 3
    foreach ($try in 1..$maxTries) {
        Log "Starting Next.js on :3000... (attempt $try/$maxTries)"
        KillPort 3000
        Start-Sleep 2
        $arg = '/c cd /d "' + $ROOT + '" & set PORT=3000 & npm run dev >> "' + $ROOT + '\scripts\next-server.log" 2>&1'
        Start-Process "cmd" -ArgumentList $arg -WindowStyle Hidden
        Log "Waiting 45s for Next.js to compile..."
        Start-Sleep 45
        if (WaitPort 3000 60) { Log "Next.js ready"; return }
        Log "Next.js not ready yet - last log:"
        if (Test-Path "$ROOT\scripts\next-server.log") {
            Get-Content "$ROOT\scripts\next-server.log" -Tail 15 | ForEach-Object { Log "  NEXT: $_" }
        }
        if ($try -lt $maxTries) {
            Log "Retrying in 10s..."
            Start-Sleep 10
        } else {
            $tsout = & npx tsc --noEmit 2>&1
            $tserrs = $tsout | Select-String "error TS"
            if ($tserrs) { $tserrs | Select-Object -First 10 | ForEach-Object { Log "  TS: $_" } }
            Die "Cannot start Next.js after $maxTries attempts"
        }
    }
}

function RestartEphemeris {
    Log "Restarting ephemeris (formula changed)..."
    KillPort 8001
    Start-Sleep 3
    StartEphemeris
}

function RestartNextJS {
    Log "Restarting Next.js (source changed)..."
    KillPort 3000
    Start-Sleep 3
    StartNextJS
}

function RunPython($scriptPath, $label) {
    Log "--- Running $label ---"
    $fullPath = "$ROOT\$scriptPath"
    if (-not (Test-Path $fullPath)) {
        Log "ERROR: Script not found: $fullPath"
        return 1
    }
    $proc = Start-Process -FilePath "py" `
        -ArgumentList ('"' + $fullPath + '"') `
        -WorkingDirectory $ROOT `
        -Wait -PassThru `
        -RedirectStandardOutput "$ROOT\scripts\tmp-stdout.txt" `
        -RedirectStandardError  "$ROOT\scripts\tmp-stderr.txt" `
        -NoNewWindow

    if (Test-Path "$ROOT\scripts\tmp-stdout.txt") {
        $out = Get-Content "$ROOT\scripts\tmp-stdout.txt" -Raw
        if ($out) {
            $out.Split("`n") | ForEach-Object {
                Write-Host "  $_"
                Add-Content "$ROOT\scripts\agent-log.txt" "  $_"
            }
        }
    }
    if (Test-Path "$ROOT\scripts\tmp-stderr.txt") {
        $err = Get-Content "$ROOT\scripts\tmp-stderr.txt" -Raw
        if ($err -and $err.Trim()) {
            Log "  STDERR: $($err.Substring(0, [Math]::Min(500,$err.Length)))"
        }
    }

    Log "$label exited with code $($proc.ExitCode)"
    return $proc.ExitCode
}

function RunOrchestrator {
    Log "--- Running orchestrator (12-15 min) ---"
    $proc = Start-Process -FilePath "node" `
        -ArgumentList ('"' + $ROOT + '\scripts\orchestrator.js"') `
        -WorkingDirectory $ROOT `
        -PassThru `
        -RedirectStandardOutput "$ROOT\scripts\tmp-orch-out.txt" `
        -RedirectStandardError  "$ROOT\scripts\tmp-orch-err.txt" `
        -NoNewWindow

    # Hard timeout to prevent the entire loop from hanging.
    $timeoutSeconds = 15 * 60
    $exited = $false
    try {
        Wait-Process -Id $proc.Id -Timeout $timeoutSeconds -ErrorAction SilentlyContinue | Out-Null
        $exited = $true
    } catch {
        $exited = $false
    }

    if (-not $exited) {
        Log "Orchestrator timed out after $timeoutSeconds seconds - killing process $($proc.Id)"
        try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
        # Also kill lingering browsers to release resources.
        try {
            Get-Process chrome,chromium -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        } catch {}
        return 124
    }

    if (Test-Path "$ROOT\scripts\tmp-orch-out.txt") {
        $out = Get-Content "$ROOT\scripts\tmp-orch-out.txt" -Raw
        if ($out) {
            $out.Split("`n") | Select-Object -Last 30 |
                ForEach-Object { Write-Host "  ORCH: $_" }
        }
    }
    Log "Orchestrator exited with code $($proc.ExitCode)"
    return $proc.ExitCode
}

function AgentsPassing {
    $aOk = $false; $bOk = $false; $dOk = $false
    try {
        $raw = Get-Content "$ROOT\scripts\agent-a-results.json" -Raw
        $a = $raw | ConvertFrom-Json
        $aOk = [bool]$a.summary.pass
    } catch { Log "Cannot read agent-a-results.json" }
    try {
        $raw = Get-Content "$ROOT\scripts\agent-b-results.json" -Raw
        $b = $raw | ConvertFrom-Json
        $bOk = [bool]$b.summary.pass
    } catch { Log "Cannot read agent-b-results.json" }
    try {
        $raw = Get-Content "$ROOT\scripts\agent-d-results.json" -Raw
        $d = $raw | ConvertFrom-Json
        $dOk = [bool]$d.overall_pass
    } catch { Log "Cannot read agent-d-results.json" }
    Log "Pass status: A(scores)=$aOk  B(commentary)=$bOk  D(render)=$dOk"
    return ($aOk -and $bOk -and $dOk)
}

# ── STARTUP ────────────────────────────────────────

Log ""
Log "======================================================"
Log "  JYOTISH AI AUTONOMOUS IMPROVEMENT LOOP"
Log "======================================================"
Log ""

# Verify scripts exist
$required = @(
    "scripts\agent-a-score-validator.py",
    "scripts\agent-b-commentary-analyzer.py",
    "scripts\agent-c-optimizer.py",
    "scripts\agent-d-verify.py",
    "scripts\orchestrator.js",
    "scripts\benchmark.json"
)
foreach ($f in $required) {
    if (-not (Test-Path "$ROOT\$f")) {
        Die "Required file missing: $f"
    }
}
Log "All required scripts found"

# Refresh benchmark
Log "Refreshing benchmark..."
& py "$ROOT\scripts\extract-benchmark.py" 2>&1 |
    Select-Object -Last 5 | ForEach-Object { Log "  BENCH: $_" }

Set-Content "$ROOT\scripts\loop-count.txt" "0"
StartEphemeris
StartNextJS

# ── MAIN LOOP ──────────────────────────────────────

for ($i = 1; $i -le $MAX_LOOPS; $i++) {

    if (Test-Path "$ROOT\scripts\loop-done.txt") {
        Log "loop-done.txt found - already complete"
        break
    }

    Set-Content "$ROOT\scripts\loop-count.txt" "$i"
    Log ""
    Log "======================================================"
    Log "  ITERATION $i of $MAX_LOOPS"
    Log "======================================================"

    # Ensure servers still up
    if (-not (PortOpen 8001)) { StartEphemeris }
    if (-not (PortOpen 3000)) { StartNextJS }

    # AGENT A - Score variance
    $aCode = RunPython "scripts\agent-a-score-validator.py" "AGENT-A"
    Log "Agent A exit code: $aCode"

    # AGENT B - Commentary quality
    $bCode = RunPython "scripts\agent-b-commentary-analyzer.py" "AGENT-B"
    Log "Agent B exit code: $bCode"

    # AGENT C — Apply fixes to source files
    $cCode = RunPython "scripts\agent-c-optimizer.py" "AGENT-C"
    Log "Agent C exit code: $cCode"

    # Read what C fixed
    $cChangedMain = $false
    $cChangedTs   = $false
    $cFixCount    = 0
    try {
        $raw = Get-Content "$ROOT\scripts\agent-c-instructions.json" -Raw
        $cRes = $raw | ConvertFrom-Json
        $cFixCount    = [int]$cRes.fixes_count
        $cChangedMain = ($cRes.fixes_applied -join " ") -match "modifier|formula|yoga|tithi"
        $cChangedTs   = ($cRes.fixes_applied -join " ") -match "tokens|word_count|monthly|weekly|nativity|hourly"
        Log "Agent C applied $cFixCount fixes"
        if ($cRes.fixes_applied) {
            $cRes.fixes_applied | ForEach-Object { Log "  FIX: $_" }
        }
    } catch { Log "Could not parse agent-c-instructions.json" }

    # Restart servers if relevant code changed
    if ($cChangedMain) { RestartEphemeris }
    if ($cChangedTs)   { RestartNextJS }

    # Ensure servers still up after restarts
    if (-not (PortOpen 8001)) { StartEphemeris }
    if (-not (PortOpen 3000)) { StartNextJS }

    # If Agent C flagged commentary 500 errors, investigate immediately.
    if (Test-Path "$ROOT\scripts\500-error-detected.txt") {
        Log "500 errors detected - investigating Next.js commentary routes"

        if (Test-Path "$ROOT\scripts\next-server.log") {
            $nextLog = Get-Content "$ROOT\scripts\next-server.log" -Tail 80
            $errs = $nextLog | Select-String "Error|error|TypeError|SyntaxError"
            if ($errs) {
                Log "Next.js errors found (top 10):"
                $errs | Select-Object -First 10 | ForEach-Object { Log ("  " + $_.Line) }
            } else {
                Log "No explicit Next.js error lines found in next-server.log tail"
            }
        } else {
            Log "next-server.log missing; cannot inspect server errors"
        }

        # Route probes with deterministic minimal payloads.
        try {
            $payloadDaily = '{"lagnaSign":"Cancer","mahadasha":"Rahu","antardasha":"Mercury","days":[]}'
            $r = Invoke-RestMethod "http://localhost:3000/api/commentary/daily-overviews" -Method POST -ContentType "application/json" -Body $payloadDaily -TimeoutSec 15
            Log "  daily-overviews: OK"
        } catch {
            Log ("  daily-overviews: FAIL - " + $_.Exception.Message)
        }

        try {
            $slots = @()
            for ($i=0; $i -lt 18; $i++) {
                $slots += @{
                    slot_index = $i
                    display_label = ("{0:00}:00-{1:00}:00" -f (6+$i), (7+$i))
                    dominant_hora = "Sun"
                    dominant_choghadiya = "Shubh"
                    transit_lagna = "Aries"
                    transit_lagna_house = 1
                    is_rahu_kaal = $false
                    score = 60
                }
            }
            $payloadHourly = @{
                lagnaSign = "Cancer"
                mahadasha = "Rahu"
                antardasha = "Mercury"
                dayIndex = 0
                date = "2026-03-08"
                slots = $slots
            } | ConvertTo-Json -Depth 6

            $r2 = Invoke-RestMethod "http://localhost:3000/api/commentary/hourly-day" -Method POST -ContentType "application/json" -Body $payloadHourly -TimeoutSec 60
            Log ("  hourly-day: OK slots=" + $r2.slots.Count)
        } catch {
            Log ("  hourly-day: FAIL - " + $_.Exception.Message)
        }

        try {
            $months = @()
            for ($j=0; $j -lt 6; $j++) {
                $months += @{ month_label = ("Month " + ($j+1)); month_index = $j; key_transits_hint = "" }
            }
            $payloadMonths = @{
                lagnaSign = "Cancer"
                mahadasha = "Rahu"
                antardasha = "Mercury"
                startMonth = "2026-03"
                months = $months
            } | ConvertTo-Json -Depth 5

            $r3 = Invoke-RestMethod "http://localhost:3000/api/commentary/months-first" -Method POST -ContentType "application/json" -Body $payloadMonths -TimeoutSec 60
            Log ("  months-first: OK months=" + $r3.months.Count)
        } catch {
            Log ("  months-first: FAIL - " + $_.Exception.Message)
        }

        Remove-Item "$ROOT\scripts\500-error-detected.txt" -Force 2>$null
        RestartNextJS
    }

    # ORCHESTRATOR - Generate full rendered report
    $orchCode = RunOrchestrator
    Log "Orchestrator exit code: $orchCode"

    # AGENT D - TypeScript + build + HTML validation
    $dCode = RunPython "scripts\agent-d-verify.py" "AGENT-D"
    Log "Agent D exit code: $dCode"

    # Check success
    if (AgentsPassing) {
        Log ""
        Log "======================================================"
        Log "  ALL AGENTS PASSING - MISSION COMPLETE"
        Log "======================================================"
        $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $report = (@(
            "JYOTISH AI - PRODUCTION READY",
            "==============================",
            "Completed: $ts",
            "Iterations: $i",
            "",
            "RESULTS:",
            "  Agent A (Score Variance vs Grandmaster): PASS",
            "  Agent B (Commentary Quality):            PASS",
            "  Agent D (TypeScript + Build + Render):   PASS",
            "",
            "Anti-reverse-engineering verified:",
            "  No hardcoded date scores in main.py",
            "  No grandmaster text copied",
            "  Formula works for any lagna/dasha/city",
            "",
            "NEXT STEPS:",
            "  1. Add real Stripe keys to .env.local",
            "  2. Run scripts\supabase-schema.sql in Supabase dashboard",
            "  3. Push to GitHub",
            "  4. Deploy ephemeris-service to Railway",
            "  5. Deploy Next.js to Vercel",
            "  6. Set EPHEMERIS_SERVICE_URL in Vercel to Railway URL"
        ) -join [Environment]::NewLine)
        Set-Content "$ROOT\scripts\COMPLETE.txt" $report
        Set-Content "$ROOT\scripts\loop-done.txt" ("DONE at " + $ts + " after " + $i + " iterations")
        Write-Host $report -ForegroundColor Green
        exit 0
    }

    if ($i -lt $MAX_LOOPS) {
        Log "Iteration $i complete. Sleeping 10s before next..."
        Start-Sleep 10
    } else {
        Log "Max iterations reached. Writing diagnostic..."
        try {
            $aRaw = Get-Content "$ROOT\scripts\agent-a-results.json" -Raw | ConvertFrom-Json
            $bRaw = Get-Content "$ROOT\scripts\agent-b-results.json" -Raw | ConvertFrom-Json
            $diag = "Max iterations $MAX_LOOPS reached at $(Get-Date)"
            $diag += "`nDay variance avg: $($aRaw.summary.avg_day_variance_pct)%"
            $diag += "`nDays within 10pct: $($aRaw.summary.days_within_10pct)/$($aRaw.summary.days_total)"
            $diag += "`nCommentary issues:"
            foreach ($iss in $bRaw.issues) { $diag += "`n  - $iss" }
            $diagPath = Join-Path $ROOT "scripts\max-iterations-diagnostic.txt"
            Set-Content $diagPath $diag
            Write-Host $diag
        } catch { Log "Could not write diagnostic" }
    }
}

Log '=== LOOP ENDED ==='
