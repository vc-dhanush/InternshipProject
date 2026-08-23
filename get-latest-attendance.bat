@echo off
cd /d "%USERPROFILE%"
if not exist InternshipProject (
  git clone https://github.com/vc-dhanush/InternshipProject.git
)
cd InternshipProject
git fetch origin
git checkout cursor/attendance-project-redo-e6dc
git pull origin cursor/attendance-project-redo-e6dc
cd attendance
call start-attendance.bat
