<#
.SYNOPSIS
  Register / unregister the VedicHour marketing-agent loops as Windows Scheduled Tasks.
  Windows-native replacement for the macOS launchd plists in the original plan.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\register-tasks.ps1
  powershell -ExecutionPolicy Bypass -File scripts\register-tasks.ps1 -IntervalMinutes 720 -RunNow
  powershell -ExecutionPolicy Bypass -File scripts\register-tasks.ps1 -Unregister

.NOTES
  Registers (all $0 - no paid rendering unless -AutoRender):
    VedicHour-Loop-ContentOps    npm run loop:content-ops -- --count 1   every 4h
    VedicHour-Loop-Blog          npm run loop:blog                       daily (stages only; promote is manual)
    VedicHour-Loop-Sync          npm run loop:sync                       every 30min
    VedicHour-Loop-Stats         npm run loop:stats                      hourly
    VedicHour-Loop-Insights      npm run loop:insights                   every 2h
    VedicHour-Loop-Sense         npm run loop:sense                      every 6h
    VedicHour-Loop-Render        npm run loop:render                     every 2h - ONLY with -AutoRender
  Every loop is kill-aware (data/KILL halts it) and no-ops gracefully when its
  inputs/creds are missing. Tasks run only while you are logged in (no stored
  password). For 24/7 operation keep the laptop awake or use an always-on box.
#>
[CmdletBinding()]
param(
  [int]$IntervalMinutes = 1440,
  [switch]$Unregister,
  [switch]$RunNow,
  [switch]$AutoRender
)
$ErrorActionPreference = 'Stop'
$AgentDir = Split-Path -Parent $PSScriptRoot

# name / npm script / repeat interval (min) / first-run offset from now (min)
$Tasks = @(
  @{ Name = 'VedicHour-Loop-ContentOps'; Script = 'loop:content-ops'; Args = '-- --count 1'; Interval = 240;  Offset = 2;  Limit = 40 },
  @{ Name = 'VedicHour-Loop-Blog';       Script = 'loop:blog';        Args = '';             Interval = 1440; Offset = 30; Limit = 30 },
  @{ Name = 'VedicHour-Loop-Sync';       Script = 'loop:sync';        Args = '';             Interval = 30;   Offset = 5;  Limit = 15 },
  @{ Name = 'VedicHour-Loop-Stats';      Script = 'loop:stats';       Args = '';             Interval = 60;   Offset = 10; Limit = 15 },
  @{ Name = 'VedicHour-Loop-Insights';   Script = 'loop:insights';    Args = '';             Interval = 120;  Offset = 20; Limit = 25 },
  @{ Name = 'VedicHour-Loop-Sense';      Script = 'loop:sense';       Args = '';             Interval = 360;  Offset = 15; Limit = 10 }
)
# Spending loops are NOT scheduled by default. CLAUDE.md §5: nothing renders or publishes without
# the owner's explicit approval, and an unattended 2-hourly render once burned credit on reels he
# then rejected. Opt in deliberately with -AutoRender once a format has passed his bar.
if ($AutoRender) {
  $Tasks += @{ Name = 'VedicHour-Loop-Render'; Script = 'loop:render'; Args = ''; Interval = 120; Offset = 60; Limit = 55 }
}


if ($Unregister) {
  foreach ($t in $Tasks) {
    try { Unregister-ScheduledTask -TaskName $t.Name -Confirm:$false; Write-Host ('Removed scheduled task ' + $t.Name + '.') }
    catch { Write-Host ('Task ' + $t.Name + ' was not registered.') }
  }
  return
}

$LogDir = Join-Path $AgentDir 'logs'
New-Item -ItemType Directory -Force $LogDir | Out-Null

foreach ($t in $Tasks) {
  $logName = ($t.Script -replace ':', '-') + '.log'
  $logFile = Join-Path $LogDir $logName

  $inner  = "Set-Location -LiteralPath '" + $AgentDir + "'; npm run " + $t.Script + ' ' + $t.Args + " *>> '" + $logFile + "'"
  $argStr = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "' + $inner + '"'
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argStr

  $startAt  = (Get-Date).AddMinutes($t.Offset)
  $trigger  = New-ScheduledTaskTrigger -Once -At $startAt -RepetitionInterval (New-TimeSpan -Minutes $t.Interval)
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes $t.Limit)
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

  $desc = 'VedicHour marketing agent - npm run ' + $t.Script + ' every ' + $t.Interval + ' min.'
  Register-ScheduledTask -TaskName $t.Name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $desc -Force | Out-Null
  Write-Host ('Registered ' + $t.Name + ' - npm run ' + $t.Script + ' every ' + $t.Interval + ' min (first run ' + $startAt.ToString('HH:mm') + '). Log: ' + $logFile)
}

Write-Host 'Remove all with: powershell -ExecutionPolicy Bypass -File scripts\register-tasks.ps1 -Unregister'

if ($RunNow) {
  Start-ScheduledTask -TaskName 'VedicHour-Loop-ContentOps'
  Write-Host 'Triggered VedicHour-Loop-ContentOps once now.'
}
