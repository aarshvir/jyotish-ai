<#
.SYNOPSIS
  Register / unregister the VedicHour marketing-agent loops as Windows Scheduled Tasks.
  Windows-native replacement for the macOS launchd plists in the original plan.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\register-tasks.ps1
  powershell -ExecutionPolicy Bypass -File scripts\register-tasks.ps1 -IntervalMinutes 720 -RunNow
  powershell -ExecutionPolicy Bypass -File scripts\register-tasks.ps1 -Unregister

.NOTES
  Registers:
    VedicHour-Marketing-Cycle    npm run cycle          every -IntervalMinutes (default daily)
    VedicHour-Loop-Creative      npm run loop:creative  every 2h
    VedicHour-Loop-Render        npm run loop:render    every 2h, offset 1h
    VedicHour-Loop-Sync          npm run loop:sync      every 30min
    VedicHour-Loop-Stats         npm run loop:stats     hourly
    VedicHour-Loop-Insights      npm run loop:insights  every 2h
    VedicHour-Loop-Sense         npm run loop:sense     every 6h  (free trend sensing, $0)
  Every loop is kill-aware (data/KILL halts it) and no-ops gracefully when its
  inputs/creds are missing. Tasks run only while you are logged in (no stored
  password). For 24/7 operation keep the laptop awake or use an always-on box.
#>
[CmdletBinding()]
param(
  [int]$IntervalMinutes = 1440,
  [switch]$Unregister,
  [switch]$RunNow
)
$ErrorActionPreference = 'Stop'
$AgentDir = Split-Path -Parent $PSScriptRoot

# name / npm script / repeat interval (min) / first-run offset from now (min)
$Tasks = @(
  @{ Name = 'VedicHour-Marketing-Cycle'; Script = 'cycle';         Interval = $IntervalMinutes; Offset = 0;  Limit = 30 },
  @{ Name = 'VedicHour-Loop-ContentOps'; Script = 'loop:content-ops'; Interval = 120;              Offset = 0;  Limit = 55 },
  @{ Name = 'VedicHour-Loop-Creative';   Script = 'loop:creative'; Interval = 120;              Offset = 5;  Limit = 45 },
  @{ Name = 'VedicHour-Loop-Render';     Script = 'loop:render';   Interval = 120;              Offset = 60; Limit = 55 },
  @{ Name = 'VedicHour-Loop-Package';    Script = 'loop:package';  Interval = 120;              Offset = 90; Limit = 20 },
  @{ Name = 'VedicHour-Loop-Sync';       Script = 'loop:sync';     Interval = 30;               Offset = 5;  Limit = 15 },
  @{ Name = 'VedicHour-Loop-Stats';      Script = 'loop:stats';    Interval = 60;               Offset = 10; Limit = 15 },
  @{ Name = 'VedicHour-Loop-Insights';   Script = 'loop:insights'; Interval = 120;              Offset = 20; Limit = 25 },
  @{ Name = 'VedicHour-Loop-Sense';      Script = 'loop:sense';    Interval = 360;              Offset = 15; Limit = 10 }
)

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

  $inner  = "Set-Location -LiteralPath '" + $AgentDir + "'; npm run " + $t.Script + " *>> '" + $logFile + "'"
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
  Start-ScheduledTask -TaskName 'VedicHour-Marketing-Cycle'
  Write-Host 'Triggered VedicHour-Marketing-Cycle once now.'
}
