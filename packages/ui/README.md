<p align="center">
  <a href="https://constructive.io">
    <img src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" width="400" alt="Constructive" />
  </a>
</p>

# @wavegrid/ui

Next.js 15 frontend for the Wavegrid laser grid controller. Built with React 19 and Tailwind CSS v4.

## Features

| Tab | Description |
|-----|-------------|
| **Paint** | Tap or drag to color individual cannons with HSB color picker |
| **Scenes** | Preset color palettes — civic, pride, gold, ocean, sunset, etc. |
| **Animations** | Continuous patterns — wave, breathe, rainbow, pac-man, spiral, rain, heartbeat |
| **Audio** | Drag-and-drop an audio file for music-reactive lighting via Web Audio API FFT |

### Audio Reactive Modes

- **Spectrum** — frequency bands map to grid columns, amplitude controls row brightness (graphic equalizer style)
- **Energy** — overall audio energy drives brightness, bass frequencies shift hue
- **Beat** — onset detection flashes the grid on transients with frequency-based coloring

### Controls

- **Brightness** — global master brightness
- **Smooth** — how quickly lights converge to target colors (release/glide)
- **Attack** — how aggressively new inputs take hold

## Running

```bash
pnpm dev:ui        # → http://localhost:3003
```

Requires the Simulator running on `:3000`:
```bash
pnpm dev:sim       # start the simulator first
pnpm dev:ui        # then the UI
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_NUM_CANNONS` | `49` | Total number of cannons in the grid |
| `NEXT_PUBLIC_GRID_COLUMNS` | `7` | Number of columns in the grid layout |
| `NEXT_PUBLIC_SIMULATOR_URL` | `ws://localhost:3000` | WebSocket URL of the Simulator |

## Tech Stack

- Next.js 15 (App Router, standalone output)
- React 19
- Tailwind CSS v4 (CSS-first config)
- Web Audio API (FFT analysis, BPM detection)
- TypeScript 5
