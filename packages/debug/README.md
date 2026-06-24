# @wavegrid/debug

Interactive 7×7 grid debugger for the Wavegrid laser cannon array.

## Features

- Visual grid layout showing all 49 cannons (A1–G7)
- Click to toggle individual cannons on/off
- Per-cell dropdown to assign BEYOND zone indices (0–48)
- Orientation controls (origin corner + traversal order)
- Auto-assign identity mapping based on orientation
- Flash sequence for calibration
- JSON export/import of zone mappings
- WebSocket connection to simulator for live control

## Usage

```sh
pnpm dev:debug
# → http://localhost:3005
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG_PORT` | `3005` | HTTP server port |
