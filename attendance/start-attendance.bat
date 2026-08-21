@echo off
setlocal
cd /d "%~dp0"
echo Starting SkyVault Attendance on http://127.0.0.1:5500
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-attendance.ps1" 5500
if errorlevel 1 (
  echo.
  echo PowerShell server failed. If Python is installed you can run:
  echo   python -m http.server 5500 --bind 127.0.0.1
  pause
)
