@echo off
rem ============================================================
rem  WaveGrid receiver launcher (machine #2: pangolin / Windows).
rem
rem  Loads an env file (deploy\.env by default), runs `set` for
rem  every KEY=VALUE in it, derives SIMULATOR_URL from CLOUD_IP,
rem  then starts the receiver: pnpm dev:receiver
rem
rem  Usage:
rem    deploy\receiver.cmd                 (uses deploy\.env)
rem    deploy\receiver.cmd path\to\my.env  (uses a custom config file)
rem ============================================================
setlocal enabledelayedexpansion

set "DEPLOY_DIR=%~dp0"
set "REPO_DIR=%DEPLOY_DIR%.."

rem --- choose config file: arg1 > deploy\.env > deploy\.env.example ---
if not "%~1"=="" (
  set "ENVFILE=%~1"
) else if exist "%DEPLOY_DIR%.env" (
  set "ENVFILE=%DEPLOY_DIR%.env"
) else (
  set "ENVFILE=%DEPLOY_DIR%.env.example"
)

if not exist "%ENVFILE%" (
  echo ERROR: config file not found: %ENVFILE%
  echo Copy deploy\.env.example to deploy\.env and set CLOUD_IP.
  exit /b 1
)

echo Loading config from: %ENVFILE%
rem eol=# skips comment lines; blank lines are skipped automatically.
for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%ENVFILE%") do (
  set "%%a=%%b"
)

if not defined SIM_PORT set "SIM_PORT=3000"
if not defined CLOUD_IP (
  echo ERROR: CLOUD_IP is not set in %ENVFILE%
  exit /b 1
)
if not defined SIMULATOR_URL set "SIMULATOR_URL=ws://%CLOUD_IP%:%SIM_PORT%"

echo.
echo   CLOUD_IP       = %CLOUD_IP%
echo   SIMULATOR_URL  = %SIMULATOR_URL%
echo   BEYOND_HOST    = %BEYOND_HOST%
echo   ROUTING_CONFIG = %ROUTING_CONFIG%
echo.

cd /d "%REPO_DIR%"
call pnpm dev:receiver

endlocal
