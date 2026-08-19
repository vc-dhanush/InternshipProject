@echo off
setlocal
cd /d "%~dp0"

echo.
echo Attendance app folder:
echo   %CD%
echo.
echo Do NOT run "cd attendance" from C:\Users\... unless that folder exists there.
echo Clone or download the GitHub repo first, then double-click THIS file
echo from the attendance folder.
echo.

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Using Windows Python launcher on http://localhost:5500
  start "" http://localhost:5500/
  py -m http.server 5500 --bind 127.0.0.1
  goto :eof
)

where python >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Using python on http://localhost:5500
  start "" http://localhost:5500/
  python -m http.server 5500 --bind 127.0.0.1
  goto :eof
)

echo Python not required. Starting with PowerShell on http://localhost:5500
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-attendance.ps1" 5500
