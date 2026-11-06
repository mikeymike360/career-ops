@echo off
cd /d "%~dp0"
schtasks /End /TN "CareerOps-Mikey360-PrivateRuntime" >nul 2>&1
node "%~dp0web\scripts\personal-runtime\stop.mjs"
pause
