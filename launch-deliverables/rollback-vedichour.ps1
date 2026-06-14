# =====================================================================
#  VedicHour — ROLLBACK to the pre-launch version (not permanent)
#  Usage:
#      powershell -ExecutionPolicy Bypass -File rollback-vedichour.ps1
#  or pin a specific tag:
#      powershell -ExecutionPolicy Bypass -File rollback-vedichour.ps1 prelaunch-backup-20260613-1400
# =====================================================================
$ErrorActionPreference = "Stop"
$repo = "C:\Users\aarsh\Downloads\jyotish-ai"
Set-Location $repo
if (Test-Path ".git\index.lock") { Remove-Item ".git\index.lock" -Force }

# Resolve the backup tag: arg wins, else the one the launch script saved
$tag = $args[0]
if (-not $tag -and (Test-Path ".launch-backup-tag")) { $tag = (Get-Content ".launch-backup-tag").Trim() }
if (-not $tag) {
  Write-Host "No backup tag found." -ForegroundColor Red
  Write-Host "Available backup tags:" -ForegroundColor Yellow
  git tag --list "prelaunch-backup-*"
  Write-Host "Re-run:  rollback-vedichour.ps1 <tag-name>" -ForegroundColor Yellow
  exit 1
}

Write-Host "This will reset the code to '$tag' and force-push to GitHub." -ForegroundColor Yellow
$go = Read-Host "Type ROLLBACK to confirm"
if ($go -ne "ROLLBACK") { Write-Host "Cancelled. Nothing changed." -ForegroundColor Yellow; exit 0 }

git reset --hard $tag
git push --force origin main

Write-Host "`nCode rolled back to $tag and force-pushed to GitHub." -ForegroundColor Green
Write-Host "FASTEST live-site rollback (no rebuild): Vercel dashboard -> Deployments ->" -ForegroundColor Cyan
Write-Host "pick the last good deployment -> '...' -> Instant Rollback." -ForegroundColor Cyan
