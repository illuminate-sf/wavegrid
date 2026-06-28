@echo off
rem ============================================================
rem  Pride receiver — CLOUD (connects to droplet)
rem  Connects to remote server, sends OSC directly to BEYOND.
rem
rem  Prerequisites:
rem    - Server running on droplet (CLOUD_IP)
rem    - BEYOND running on this machine (port 8000)
rem    - Internet / network access to droplet
rem
rem  No routing config — sends all 14 cannons to one BEYOND instance.
rem  Replace DROPLET_IP with your server's actual IP address.
rem ============================================================
cd /d %~dp0..

set SIMULATOR_URL=ws://DROPLET_IP:3001
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
echo  Pride Receiver (CLOUD - no routing config)
echo  Server:  ws://DROPLET_IP:3001
echo  BEYOND:  127.0.0.1:8000
echo  Grid:    7x2 (14 cannons)
echo.

pnpm dev:receiver
