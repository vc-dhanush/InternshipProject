@echo off
setlocal
cd /d "%~dp0"

echo.
echo Sky-blue Attendance Dashboard
echo   Create up to 10 of your own classes (no Class 1-10 list)
echo   Compact charts  ^|  6-month vault after you close the browser
echo.
echo This folder:
echo   %CD%
echo.
echo Open in the browser:  http://localhost:5500/
echo Leave this window open while you use the app.
echo.

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Using Windows Python launcher
  start "" http://localhost:5500/
  py -m http.server 5500 --bind 127.0.0.1
  goto :eof
)

where python >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Using python
  start "" http://localhost:5500/
  python -m http.server 5500 --bind 127.0.0.1
  goto :eof
)

echo Python not required. Starting with PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-attendance.ps1" 5500
