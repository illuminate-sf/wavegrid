@echo off
rem ============================================================
rem  Pride show — ONE-SHOT local launcher (no internet needed)
rem
rem  Starts everything in one terminal:
rem    1. Pride server (port 3001, 7x2 grid)
rem    2. Pride UI (port 3004)
rem    3. Pride receiver (→ BEYOND on localhost:8000)
rem
rem  Usage:
rem    deploy\pride-local-full.bat               (build + start)
rem    deploy\pride-local-full.bat --skip-build  (reuse last build)
rem
rem  Before going offline, run once with internet:
rem    pnpm install && pnpm build
rem
rem  Then open http://localhost:3004 for the Pride control UI.
rem ============================================================
setlocal enabledelayedexpansion

set "REPO_DIR=%~dp0.."
cd /d "%REPO_DIR%"

rem ── Pride-specific config ──
set "SIM_PORT=3001"
set "PORT=3001"
set "UI_PORT=3004"
set "GRID=7x2"
set "NUM_CANNONS=14"
set "GRID_COLUMNS=7"
set "SIMULATOR_URL=ws://localhost:3001"
set "NEXT_PUBLIC_SIMULATOR_URL=ws://localhost:3001"
set "NEXT_PUBLIC_NUM_CANNONS=14"
set "NEXT_PUBLIC_GRID_COLUMNS=7"

rem ── Receiver OSC output ──
set "BEYOND_HOST=127.0.0.1"
set "BEYOND_PORT=8000"
set "BEYOND_COLOR_MODE=rgb"
set "SHARD_START=0"
set "SHARD_END=13"
set "DEBUG_OSC=1"

rem ── Check for --skip-build ──
set "SKIP_BUILD=0"
if "%~1"=="--skip-build" set "SKIP_BUILD=1"

if "%SKIP_BUILD%"=="0" (
  echo.
  echo  Building Pride UI...
  echo  NEXT_PUBLIC_SIMULATOR_URL=ws://localhost:3001
  echo.
  call pnpm build
  if errorlevel 1 (
    echo  ERROR: Build failed.
    exit /b 1
  )
)

echo.
echo  =============================================
echo   WaveGrid Pride Show (Local)
echo  =============================================
echo   Server:    http://localhost:3001  (7x2 grid)
echo   UI:        http://localhost:3004
echo   Receiver:  ws://localhost:3001 -^> BEYOND 127.0.0.1:8000
echo  =============================================
echo.
echo  Starting all processes...
echo.

rem ── Start server (port 3001, 7x2 grid) ──
start "pride-server" /B cmd /c "set PORT=3001&& set GRID=7x2&& set NUM_CANNONS=14&& set GRID_COLUMNS=7&& pnpm dev:server"

rem ── Wait a moment for server to bind ──
timeout /t 3 /nobreak >nul

rem ── Start UI (port 3004, pointing at server 3001) ──
start "pride-ui" /B cmd /c "set PORT=3004&& set NEXT_PUBLIC_SIMULATOR_URL=ws://localhost:3001&& pnpm start:ui"

rem ── Start receiver ──
start "pride-receiver" /B cmd /c "set SIMULATOR_URL=ws://localhost:3001&& set NUM_CANNONS=14&& set GRID_COLUMNS=7&& set BEYOND_HOST=127.0.0.1&& set BEYOND_PORT=8000&& set BEYOND_COLOR_MODE=rgb&& set SHARD_START=0&& set SHARD_END=13&& set DEBUG_OSC=1&& pnpm dev:receiver"

echo.
echo  All processes launched!
echo  Open http://localhost:3004 in your browser.
echo.
echo  Press any key to stop everything...
pause >nul

echo  Shutting down...
taskkill /FI "WINDOWTITLE eq pride-server" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq pride-ui" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq pride-receiver" /F >nul 2>&1

endlocal
