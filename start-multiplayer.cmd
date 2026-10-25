@echo off
setlocal
cd /d "%~dp0"
if not exist ".local\world-multiplayer.json" (
  if exist ".local\world.json" copy ".local\world.json" ".local\world-multiplayer.json" >nul
)
set PORT=4311
set PUBLIC_URL=http://127.0.0.1:4311
set WORLD_FILE=.local/world-multiplayer.json
echo Multiplayer studio: http://127.0.0.1:4311/
echo Player invite: http://127.0.0.1:4311/?view=play
call start.cmd
if errorlevel 1 pause
