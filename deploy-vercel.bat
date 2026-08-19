@echo off
setlocal
cd /d "%~dp0attendance"
if not exist "index.html" (
  echo attendance\index.html not found.
  echo First run:
  echo   git checkout cursor/attendance-dashboard-ae44
  echo   git pull origin cursor/attendance-dashboard-ae44
  pause
  exit /b 1
)

where npx >nul 2>&1
if errorlevel 1 (
  echo Node.js is required for Vercel CLI.
  echo Install from https://nodejs.org then open a NEW Command Prompt.
  start "" "https://nodejs.org"
  pause
  exit /b 1
)

echo.
echo Deploying ATTENDANCE as a NEW Vercel project: attendance-dashboard
echo This will not overwrite Skill-Exchange or GitHub Pages.
echo.
echo If this is the first time, a login page / email prompt will open.
echo Stay in this window until it prints a https://*.vercel.app URL.
echo.

npx --yes vercel@latest login
if errorlevel 1 (
  echo Login failed.
  pause
  exit /b 1
)

npx --yes vercel@latest --prod --yes --name attendance-dashboard
if errorlevel 1 (
  echo Deploy failed.
  pause
  exit /b 1
)

echo.
echo Done. Copy the Production URL printed above.
echo Import CSV on that URL if you want localhost data on the live site.
pause
