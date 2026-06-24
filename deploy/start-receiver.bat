@echo off
REM Start the wavegrid receiver with dual-PC routing.
REM Run this on the Windows PC (PC1) where BEYOND is installed.
REM
REM Update SIMULATOR_URL to point to your cloud droplet running the simulator.

set SIMULATOR_URL=ws://YOUR_DROPLET_IP:3000
set ROUTING_CONFIG=examples\routing-production.json

pnpm dev:receiver
