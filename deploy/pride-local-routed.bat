@echo off
cd /d %~dp0..

set SIMULATOR_URL=ws://localhost:3001
set GRID=7x2
set NUM_CANNONS=14
set GRID_COLUMNS=7
set ROUTING_CONFIG=examples\routing-pride-7x2.json
set SHARD_START=0
set SHARD_END=13
set DEBUG_OSC=1

pnpm dev:receiver
