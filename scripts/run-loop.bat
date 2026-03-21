@echo off
echo Starting Jyotish AI autonomous loop...
echo This will run for up to 20 iterations.
echo Do not close this window.
echo.
cd /d %~dp0..
powershell -ExecutionPolicy Bypass -File scripts\run-loop.ps1
pause
