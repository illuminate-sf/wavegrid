@echo off
rem ============================================================
rem  WaveGrid local launcher (Windows) — runs the full stack on
rem  localhost without any internet connection.
rem
rem  Starts: server (port 3000) + UI (port 3003) + receiver
rem  All pointing at ws://localhost:3000
rem
rem  Usage:
rem    deploy\local.bat               build UI, then start everything
rem    deploy\local.bat --skip-build  skip UI build (reuse last one)
rem
rem  Before going offline, run once with internet:
rem    pnpm install && pnpm build
rem
rem  Then open http://localhost:3003 in your browser.
rem ============================================================
setlocal enabledelayedexpansion

set "REPO_DIR=%~dp0.."
cd /d "%REPO_DIR%"

rem ── localhost-pinned config ──
set "SIM_PORT=3000"
set "PORT=3000"
set "NUM_CANNONS=49"
set "GRID_COLUMNS=7"
set "SIMULATOR_URL=ws://localhost:3000"
set "NEXT_PUBLIC_SIMULATOR_URL=ws://localhost:3000"
set "NEXT_PUBLIC_NUM_CANNONS=49"
set "NEXT_PUBLIC_GRID_COLUMNS=7"

rem ── OSC output (receiver → BEYOND on same machine) ──
rem Uncomment / adjust if BEYOND is running on this machine:
rem set "BEYOND_HOST=127.0.0.1"
rem set "BEYOND_PORT=8000"
rem Or use a routing config:
rem set "ROUTING_CONFIG=examples\routing-production-hardware.json"

rem ── Debug UI (optional) ──
rem set "DEBUG_UI_PORT=9999"

rem ── Check for --skip-build ──
set "SKIP_BUILD=0"
if "%~1"=="--skip-build" set "SKIP_BUILD=1"

if "%SKIP_BUILD%"=="0" (
  echo.
  echo  Building UI with NEXT_PUBLIC_SIMULATOR_URL=ws://localhost:3000 ...
  echo.
  call pnpm build
  if errorlevel 1 (
    echo  ERROR: Build failed. Fix errors and try again.
    exit /b 1
  )
)

echo.
echo  =============================================
echo   WaveGrid Local Stack
echo  =============================================
echo   Server:   http://localhost:3000
echo   UI:       http://localhost:3003
echo   Receiver: ws://localhost:3000
echo  =============================================
echo.
echo  Starting all processes... Press Ctrl+C to stop.
echo.

rem ── Start server, UI, and receiver in parallel ──
rem Using START /B to run in same window (output interleaved)
start "wavegrid-server" /B cmd /c "pnpm dev:server"
start "wavegrid-ui" /B cmd /c "pnpm start:ui"
start "wavegrid-receiver" /B cmd /c "pnpm dev:receiver"

echo  All processes launched.
echo  Open http://localhost:3003 in your browser.
echo.
echo  Press any key to stop all processes...
pause >nul

rem ── Cleanup ──
echo  Shutting down...
taskkill /FI "WINDOWTITLE eq wavegrid-server" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq wavegrid-ui" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq wavegrid-receiver" /F >nul 2>&1
rem Also kill any node processes from our scripts
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /fo list ^| findstr "PID:"') do (
  taskkill /PID %%a /F >nul 2>&1
)

echo  Done.
endlocal
