# =====================================================================
#  VedicHour — Launch: build-gate, backup tag, commit, push to GitHub
#  Run on YOUR machine (PowerShell). It cd's to the repo for you.
#      Right-click > Run with PowerShell   — or —
#      powershell -ExecutionPolicy Bypass -File launch-vedichour.ps1
# =====================================================================
$ErrorActionPreference = "Stop"
$repo = "C:\Users\aarsh\Downloads\jyotish-ai"
Set-Location $repo

Write-Host "== VedicHour launch ==" -ForegroundColor Cyan

# 0) Clear any stale git lock left by the cloud session, and stop phantom CRLF diffs
if (Test-Path ".git\index.lock") { Remove-Item ".git\index.lock" -Force; Write-Host "Cleared stale .git\index.lock" }
git config core.autocrlf true

# 1) BUILD GATE — never deploy a broken build. This is the real validation step.
Write-Host "`n[1/5] Building (this is the launch gate)..." -ForegroundColor Cyan
npm install
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nBUILD FAILED. Nothing was committed or pushed. Fix the errors above, then re-run." -ForegroundColor Red
  exit 1
}
Write-Host "Build OK." -ForegroundColor Green

# 2) BACKUP TAG — your one-command rollback point (pre-launch state)
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$tag   = "prelaunch-backup-$stamp"
git tag -f $tag
"$tag" | Out-File -FilePath ".launch-backup-tag" -Encoding ascii
Write-Host "`n[2/5] Backup tag created: $tag" -ForegroundColor Green

# 3) STAGE the three-products surface only (avoids the unrelated line-ending churn)
Write-Host "`n[3/5] Staging launch files..." -ForegroundColor Cyan
git add src/lib/kundli/ src/app/kundali/ src/app/api/kundali/ `
        src/app/synastry/ src/lib/synastry/ src/app/api/synastry/ `
        src/lib/ziina/server.ts src/app/api/ziina/ `
        supabase/migrations/ vercel.json src/components/shared/Navbar.tsx
git status --short

# 4) COMMIT
Write-Host "`n[4/5] Commit + push? Review the staged list above." -ForegroundColor Yellow
$go = Read-Host "Type YES to commit and push to GitHub"
if ($go -ne "YES") { Write-Host "Stopped. Nothing pushed. Backup tag $tag is kept." -ForegroundColor Yellow; exit 0 }
git commit -m "launch: deep Kundali report + matchmaking reprice + payment-recovery cron"

# 5) PUSH
Write-Host "`n[5/5] Pushing to origin/main..." -ForegroundColor Cyan
git push origin main

Write-Host "`nDONE. Pushed to GitHub." -ForegroundColor Green
Write-Host "If Vercel is connected to the repo it auto-deploys now; otherwise run:  vercel --prod" -ForegroundColor Green
Write-Host "ROLLBACK anytime:  powershell -ExecutionPolicy Bypass -File rollback-vedichour.ps1" -ForegroundColor Green
Write-Host "   (restores tag $tag)" -ForegroundColor Green
