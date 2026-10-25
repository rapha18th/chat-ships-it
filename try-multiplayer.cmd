@echo off
setlocal
cd /d "%~dp0"
if exist "%ProgramFiles%\nodejs\node.exe" (
  "%ProgramFiles%\nodejs\node.exe" --import tsx scripts/prepare-hive-demo.ts
) else (
  node --import tsx scripts/prepare-hive-demo.ts
)
if errorlevel 1 (
  echo Install dependencies first. See README.md.
  pause
  exit /b 1
)
set WORLD_FILE=.local/rehearsal-garden.json
set ENABLE_CODEX=false
set PORT=4312
set PUBLIC_URL=http://127.0.0.1:4312
echo Open http://127.0.0.1:4312/ for the owner desk.
echo Open http://127.0.0.1:4312/?view=play in more tabs to join as bees.
echo Reviewed examples power rehearsal. Live AI generation requires the setup in README.md.
call start.cmd
pause
