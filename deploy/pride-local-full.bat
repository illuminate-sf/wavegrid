@echo off
cd /d %~dp0..

set PORT=3001
set GRID=7x2
set NUM_CANNONS=14
set GRID_COLUMNS=7
set SIMULATOR_URL=ws://localhost:3001
set NEXT_PUBLIC_SIMULATOR_URL=ws://localhost:3001
set NEXT_PUBLIC_NUM_CANNONS=14
set NEXT_PUBLIC_GRID_COLUMNS=7
set BEYOND_HOST=127.0.0.1
set BEYOND_PORT=8000
set BEYOND_COLOR_MODE=rgb
set SHARD_START=0
set SHARD_END=13
set DEBUG_OSC=1

start "" /B cmd /c "set PORT=3001&& set GRID=7x2&& set NUM_CANNONS=14&& set GRID_COLUMNS=7&& pnpm dev:server"
timeout /t 3 /nobreak >nul
start "" /B cmd /c "set PORT=3004&& set NEXT_PUBLIC_SIMULATOR_URL=ws://localhost:3001&& pnpm start:ui"
start "" /B cmd /c "set SIMULATOR_URL=ws://localhost:3001&& set NUM_CANNONS=14&& set GRID_COLUMNS=7&& set BEYOND_HOST=127.0.0.1&& set BEYOND_PORT=8000&& set BEYOND_COLOR_MODE=rgb&& set SHARD_START=0&& set SHARD_END=13&& set DEBUG_OSC=1&& pnpm dev:receiver"
