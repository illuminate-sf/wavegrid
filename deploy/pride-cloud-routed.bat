@echo off
rem ============================================================
rem  Pride receiver — CLOUD + ROUTING CONFIG (connects to droplet)
rem  Connects to remote server, uses routing config for OSC.
rem
rem  Prerequisites:
rem    - Server running on droplet (CLOUD_IP)
rem    - BEYOND running on this machine (port 8000)
rem    - Internet / network access to droplet
rem
rem  Uses routing config for per-cannon projector mapping.
rem  Replace DROPLET_IP with your server's actual IP address.
rem ============================================================
cd /d %~dp0..

set SIMULATOR_URL=ws://DROPLET_IP:3001
set GRID=7x2
set NUM_CANNONS=14
set GRID_COLUMNS=7
set ROUTING_CONFIG=examples\routing-pride-7x2.json
set SHARD_START=0
set SHARD_END=13
set DEBUG_OSC=1

echo.
echo  Pride Receiver (CLOUD - with routing config)
echo  Server:  ws://DROPLET_IP:3001
echo  Config:  examples\routing-pride-7x2.json
echo  Grid:    7x2 (14 cannons)
echo.

pnpm dev:receiver
