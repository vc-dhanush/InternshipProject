@echo off
setlocal
cd /d "%~dp0"

echo.
echo Updating to the latest attendance dashboard branch...
echo.

git fetch origin
if errorlevel 1 (
  echo Git fetch failed. Make sure Git is installed and this folder is the cloned repo.
  pause
  exit /b 1
)

git checkout cursor/attendance-dashboard-ae44
git pull origin cursor/attendance-dashboard-ae44

echo.
echo Starting app on http://localhost:5500
echo Close today and reopen later: classes, students, and 6-month attendance stay saved in this browser.
echo.

call "%~dp0run-attendance.bat"
