@echo off
rem ============================================================
rem  Pride receiver — LOCAL (no internet)
rem  Connects to server on localhost, sends OSC directly to BEYOND.
rem
rem  Prerequisites:
rem    - Server running locally (deploy\local.bat or pnpm dev:server)
rem    - BEYOND running on this machine (port 8000)
rem
rem  No routing config — sends all 14 cannons to one BEYOND instance.
rem ============================================================
cd /d %~dp0..

set SIMULATOR_URL=ws://localhost:3001
set GRID=7x2
set NUM_CANNONS=14
set GRID_COLUMNS=7
set BEYOND_HOST=127.0.0.1
set BEYOND_PORT=8000
set BEYOND_COLOR_MODE=rgb
set SHARD_START=0
set SHARD_END=13
set DEBUG_OSC=1

echo.
echo  Pride Receiver (LOCAL - no routing config)
echo  Server:  ws://localhost:3001
echo  BEYOND:  127.0.0.1:8000
echo  Grid:    7x2 (14 cannons)
echo.

pnpm dev:receiver
