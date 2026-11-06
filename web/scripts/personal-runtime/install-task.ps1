$ErrorActionPreference = 'Stop'
$runtimeRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$taskName = 'CareerOps-Mikey360-PrivateRuntime'
$nodeExe = (Get-Command node).Source
$launchPath = Join-Path $PSScriptRoot 'launch.mjs'
$logPath = Join-Path $runtimeRoot 'local/runtime/launcher.log'
$quote = { param($value) "'" + $value.Replace("'", "''") + "'" }
$runCode = '& ' + (& $quote $nodeExe) + ' ' + (& $quote $launchPath) + ' *> ' + (& $quote $logPath) + '; exit $LASTEXITCODE'
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -Command "' + $runCode + '"'
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and -not ($existing.Actions.Arguments -like '*personal-runtime*launch.mjs*')) { throw 'A different task already uses this name; nothing changed.' }
$action = New-ScheduledTaskAction -Execute (Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe') -Argument $arguments -WorkingDirectory $runtimeRoot
$owner = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $owner -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
# On demand only: keep the existing manual-start choice after a PC restart.
Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Settings $settings -Description 'Private Career Ops PC runtime, started on demand by its owner.' -Force | Out-Null
Write-Output "Installed owner-only on-demand runtime task: $taskName"
