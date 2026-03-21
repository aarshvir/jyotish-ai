# Jyotish AI Loop Dashboard - run: .\scripts\dashboard.ps1
$ROOT = (Get-Item $PSScriptRoot).Parent.FullName
$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "`n=== JYOTISH AI DASHBOARD @ $ts ===" -ForegroundColor Cyan
Write-Host ""

# Loop state
$loopCount = "?"
if (Test-Path "$ROOT\scripts\loop-count.txt") { $loopCount = Get-Content "$ROOT\scripts\loop-count.txt" -Raw }
$done = Test-Path "$ROOT\scripts\loop-done.txt"
$complete = Test-Path "$ROOT\scripts\COMPLETE.txt"
Write-Host "Loop iteration: $loopCount | loop-done: $done | COMPLETE.txt: $complete" -ForegroundColor $(if ($done) { "Green" } else { "Yellow" })

# Agent A
if (Test-Path "$ROOT\scripts\agent-a-results.json") {
    $a = Get-Content "$ROOT\scripts\agent-a-results.json" -Raw | ConvertFrom-Json
    $pass = $a.summary.pass
    $within = $a.summary.days_within_10pct
    $total = $a.summary.days_total
    $avgVar = $a.summary.avg_day_variance_pct
    Write-Host "Agent A (scores): pass=$pass | within 10%: $within/$total | avg variance: $avgVar%"
} else { Write-Host "Agent A: no results yet" }

# Agent B
if (Test-Path "$ROOT\scripts\agent-b-results.json") {
    $b = Get-Content "$ROOT\scripts\agent-b-results.json" -Raw | ConvertFrom-Json
    $pass = $b.summary.pass
    $issues = @($b.issues).Count
    Write-Host "Agent B (commentary): pass=$pass | issues: $issues"
} else { Write-Host "Agent B: no results yet" }

# Agent D
if (Test-Path "$ROOT\scripts\agent-d-results.json") {
    $d = Get-Content "$ROOT\scripts\agent-d-results.json" -Raw | ConvertFrom-Json
    $pass = $d.overall_pass
    $tsOk = $d.typescript.pass
    $buildOk = $d.build.pass
    $htmlOk = $d.html.pass
    Write-Host "Agent D (build/render): overall=$pass | TS=$tsOk build=$buildOk html=$htmlOk"
} else { Write-Host "Agent D: no results yet" }

# Agent C last fixes
if (Test-Path "$ROOT\scripts\agent-c-instructions.json") {
    $c = Get-Content "$ROOT\scripts\agent-c-instructions.json" -Raw | ConvertFrom-Json
    $n = $c.fixes_count
    Write-Host "Agent C last run: $n fixes applied"
}

# Log tail
Write-Host "`n--- Last 15 log lines ---"
if (Test-Path "$ROOT\scripts\agent-log.txt") {
    Get-Content "$ROOT\scripts\agent-log.txt" -Tail 15
}
Write-Host ""
