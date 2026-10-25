@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\tsx\dist\cli.mjs" (
  echo Project dependencies are missing. Follow the install steps in README.md.
  exit /b 1
)
if exist "%ProgramFiles%\nodejs\node.exe" (
  "%ProgramFiles%\nodejs\node.exe" --import tsx apps/server/src/index.ts
) else (
  node --import tsx apps/server/src/index.ts
)
