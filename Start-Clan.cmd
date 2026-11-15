@echo off
setlocal
pushd "%~dp0" || exit /b 1

set "CLAN_NODE=node.exe"
if exist "%ProgramFiles%\nodejs\node.exe" set "CLAN_NODE=%ProgramFiles%\nodejs\node.exe"
if exist "%~dp0.local-node\node.exe" set "CLAN_NODE=%~dp0.local-node\node.exe"

"%CLAN_NODE%" -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
  echo FaZe Clan needs Node.js 24 or later.
  echo Install Node.js from https://nodejs.org/en/download, then open this file again.
  if /i not "%~1"=="--check" pause
  popd
  exit /b 1
)
if /i "%~1"=="--check" (
  "%CLAN_NODE%" --version
  popd
  exit /b 0
)

echo Starting FaZe Clan...
echo Open http://localhost:4173 after the server says it is ready.
echo Keep this window open while using the site. Press Ctrl+C to stop.
echo.
"%CLAN_NODE%" --env-file-if-exists=.env server.mjs
set "CLAN_EXIT=%errorlevel%"
if not "%CLAN_EXIT%"=="0" pause
popd
exit /b %CLAN_EXIT%
