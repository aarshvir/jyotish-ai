@echo off
echo ===========================================
echo JYOTISH AI - FULL AUTO RUN
echo ===========================================
echo.
echo This script does everything:
echo  - Kills old servers
echo  - Starts ephemeris + Next.js
echo  - Opens browser, fills form
echo  - Waits for report (up to 12 min)
echo  - Saves HTML + screenshot
echo  - Runs quality tests
echo  - Auto-fixes errors and retries
echo.
echo DO NOT touch anything. Just wait.
echo.

cd /d %~dp0..

:: Install playwright if needed
call npx playwright install chromium --quiet 2>nul

:: Run the orchestrator
node scripts/dev-orchestrator.js

echo.
echo Done. Results in scripts/
pause
