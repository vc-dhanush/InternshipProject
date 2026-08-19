@echo off
setlocal
cd /d "%~dp0attendance"
if not exist "index.html" (
  echo Could not find attendance\index.html
  echo Run this from the InternshipProject folder after checking out branch:
  echo   cursor/attendance-dashboard-ae44
  pause
  exit /b 1
)
call start-attendance.bat
