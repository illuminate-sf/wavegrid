@echo off
rem ============================================================
rem  Pride receiver — LOCAL + ROUTING CONFIG (no internet)
rem  Connects to server on localhost, uses routing config for OSC.
rem
rem  Prerequisites:
rem    - Server running locally (deploy\local.bat or pnpm dev:server)
rem    - BEYOND running on this machine (port 8000)
rem
rem  Uses routing config for per-cannon projector mapping.
rem ============================================================
cd /d %~dp0..

set SIMULATOR_URL=ws://localhost:3001
set GRID=7x2
set NUM_CANNONS=14
set GRID_COLUMNS=7
set ROUTING_CONFIG=examples\routing-pride-7x2.json
set SHARD_START=0
set SHARD_END=13
set DEBUG_OSC=1

echo.
echo  Pride Receiver (LOCAL - with routing config)
echo  Server:  ws://localhost:3001
echo  Config:  examples\routing-pride-7x2.json
echo  Grid:    7x2 (14 cannons)
echo.

pnpm dev:receiver
