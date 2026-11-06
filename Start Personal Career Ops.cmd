@echo off
cd /d "%~dp0"
schtasks /Query /TN "CareerOps-Mikey360-PrivateRuntime" >nul 2>&1
if not errorlevel 1 (
  schtasks /Run /TN "CareerOps-Mikey360-PrivateRuntime"
  exit /b
)
node "%~dp0web\scripts\personal-runtime\launch.mjs"
pause
