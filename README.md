# Wavegrid

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/Illuminate/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/Illuminate/actions/workflows/ci.yml/badge.svg" />
  </a>
</p>

## Overview

**Wavegrid** is a modular laser grid controller for arrays of Laser Space Cannons on Global Truss F34 structures. Patterns are written as JavaScript snippets that run inside a QuickJS sandbox on the agent, producing an RGB framebuffer rendered by the local viewer and/or sent to laser hardware via OSC.

Grid size defaults to 7x7 (49 cannons) but is fully configurable for any layout.

## Getting Started

```sh
pnpm install
pnpm test
pnpm build
```

### Prerequisites

- Node.js 18+
- pnpm

## Packages

| Package | Name | Description |
|---------|------|-------------|
| `packages/patterns` | `@wavegrid/patterns` | QuickJS sandbox engine — ctx API, safety limiter, CPU + memory deadlines |
| `packages/programs` | `@wavegrid/programs` | 58 animation programs + host ABI runtime |
| `packages/agent` | `@wavegrid/agent` | Agent runtime — connects to relay, runs patterns, dispatches to sinks |
| `packages/cloud-relay` | `@wavegrid/cloud-relay` | Cloud relay — auth, pattern gallery, token-gated WSS agent relay |
| `packages/mapper` | `@wavegrid/mapper` | Zone-to-grid calibration tool (flash-to-identify) |
| `packages/ui` | `@wavegrid/ui` | Next.js artist UI — Paint, Gradient, Drops, Motion, Scenes, Animations, Flags, Brightness, Audio |
| `packages/osc` | `@wavegrid/osc` | OSC output adapters for BEYOND and FB4 laser hardware |
| `packages/webgl` | `@wavegrid/webgl` | Three.js 3D Civic Center viewer — volumetric laser beams, bloom, camera presets |

### Legacy (deprecated)

| Package | Name | Description |
|---------|------|-------------|
| `packages/simulator` | `@wavegrid/simulator` | Replaced by cloud-relay + agent |
| `packages/receiver` | `wavegrid` | Replaced by agent |
| `packages/relay` | `@wavegrid/relay` | Replaced by cloud-relay |

## Architecture

```
┌──────────────┐  HTTP commands  ┌──────────────┐   WSS    ┌──────────────┐
│   UI         │ ──────────────▶ │ Cloud Relay  │ ───────▶ │    Agent     │
│  (React)     │                 │  :3000       │          │  (QuickJS)   │
│  :3003       │                 │  auth + cmds │          │  sandbox     │
└──────────────┘                 └──────────────┘          │  safety lim  │
       │                                                   └──────┬───────┘
       │  WS binary (RGB framebuffer)                             │
       └──────────────────────────────────────────────────────────┘
              ▲                                                   │
              │                                            ┌──────┴───────┐
         Local Viewer                                      │ @wavegrid/   │
           :8090                                           │  osc         │
                                                           │  → BEYOND    │
                                                           └──────────────┘
```

- **Cloud Relay** — command router with cookie-session auth. Accepts HTTP commands from the UI, forwards them to the agent over WSS.
- **Agent** — runs pattern JavaScript in a QuickJS sandbox with CPU deadlines and memory limits. Produces an RGB framebuffer each frame. Output goes to a local canvas viewer (`:8090`) and/or BEYOND via OSC.
- **UI** — Next.js artist-facing creative instrument. Sends `loadPattern`, `setZone`, `solid`, `stopPattern` commands to the relay via HTTP POST. Receives the live RGB framebuffer from the agent viewer via WebSocket binary frames.
- **Patterns** — JavaScript snippets with a `render(ctx)` function. The `ctx` API provides `setHSV`, `setRGB`, `fill`, `fade`, `noise`, `xy`, `uv`, `polar`, timing, and more.
- **OSC** — output adapters for Pangolin BEYOND and FB4 laser hardware. Zero-dep raw UDP, per-channel diff, burst guard, arm/disarm gate.

## Running Locally

Start three terminals — **relay**, **agent**, and **UI**:

```sh
# Terminal 1 — Cloud Relay (command server)
pnpm dev:relay
# → http://localhost:3000 (login password: set RELAY_PASSWORD env, default "demo")

# Terminal 2 — Agent (pattern engine + local viewer)
pnpm dev:agent
# → Connects to ws://localhost:3000/agent?token=changeme
# → Local canvas viewer at http://localhost:8090

# Terminal 3 — React UI (artist tool)
pnpm dev:ui
# → http://localhost:3003
```

Open **http://localhost:3003** in your browser. Log in, then pick a scene or animation — you'll see the pattern rendered live on the grid.

To also see the raw framebuffer output, open **http://localhost:8090** in a second tab.

### Environment Variables for the UI

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_RELAY_URL` | `http://localhost:3000` | Cloud relay HTTP endpoint |
| `NEXT_PUBLIC_VIEWER_URL` | `ws://localhost:8090` | Agent viewer WebSocket (RGB framebuffer) |
| `NEXT_PUBLIC_NUM_CANNONS` | `49` | Total grid cells |
| `NEXT_PUBLIC_GRID_COLUMNS` | `7` | Grid columns |

## Configurable Grid Size

Everything defaults to 7x7 (49 cannons). Override with environment variables:

```sh
# 10x10 grid (100 cannons)
NUM_CANNONS=100 GRID_COLUMNS=10 pnpm dev:sim
NUM_CANNONS=100 GRID_COLUMNS=10 pnpm dev:ui
NUM_CANNONS=100 GRID_COLUMNS=10 pnpm dev:receiver
```

## Sharding

Split the grid across multiple receivers when hardware limits apply:

```sh
# Laptop A (40 cannons)
SHARD_START=0 SHARD_END=39 pnpm dev:receiver

# Laptop B (9 cannons)
SHARD_START=40 SHARD_END=48 pnpm dev:receiver
```

Both connect to the same Simulator (or Relay). The UI stays unified.

## Data Flow

The UI never sends OSC — only the **Agent** talks to laser hardware:

```
┌──────────┐    HTTP POST     ┌──────────┐      WSS       ┌──────────┐   OSC/UDP   ┌──────────┐
│    UI    │ ───────────────► │  Relay   │ ──────────────► │  Agent   │ ──────────► │  BEYOND  │
│ (browser)│                  │  :3000   │  pattern code   │ (QuickJS)│            │  (laser) │
└──────────┘                  └──────────┘                 └──────────┘            └──────────┘
  Picks patterns              Routes commands              Runs JS in sandbox        Drives
  & paints zones              to agent                     → RGB framebuffer         hardware
```

- **UI** sends commands (loadPattern, setZone, solid, stopPattern) via HTTP POST to the relay
- **Relay** forwards commands to the connected agent over WSS
- **Agent** runs pattern JavaScript in a QuickJS sandbox, produces RGB framebuffer, optionally sends to BEYOND via OSC
- The UI receives the live RGB framebuffer from the agent's local viewer via WebSocket binary frames

## Deployment

### Local (all-in-one)

For a live event where everything runs on a single machine:

```sh
pnpm dev:relay                           # :3000 (command relay)
pnpm dev:agent                           # QuickJS sandbox + viewer at :8090
pnpm dev:ui                              # :3003 (artist UI)
```

iPads connect to `http://<machine-ip>:3003` for the UI.

### Remote (cloud relay + on-site agent)

When the UI/Relay run on a cloud server and the laser hardware is on-site:

```
┌───────────────────────────────────┐              ┌──────────────────────────────┐
│        Cloud Server               │              │       On-Site (Pangolin PC)  │
│                                   │   WSS        │                              │
│  Relay (:3000)  ◄─────────────────┼──────────────┼──  Agent                     │
│  UI (:3003)                       │              │       │                      │
│                                   │              │       ▼ OSC/UDP (localhost)  │
│  Artists connect via browser      │              │    BEYOND (:7001)            │
└───────────────────────────────────┘              └──────────────────────────────┘
```

**On the cloud server** (e.g. DigitalOcean):

```sh
# Terminal 1 — Cloud Relay
RELAY_PASSWORD=your-password pnpm dev:relay

# Terminal 2 — UI
NEXT_PUBLIC_RELAY_URL=http://203.0.113.50:3000 pnpm dev:ui
```

Replace `203.0.113.50` with your server's public IP. Ensure ports **3000** and **3003** are open.

**On the Pangolin PC** (on-site):

Bash:
```sh
RELAY_URL=ws://203.0.113.50:3000/agent?token=changeme \
BEYOND_HOST=127.0.0.1 \
BEYOND_PORT=7001 \
pnpm dev:agent
```

The agent connects outward to the cloud relay and sends OSC locally to BEYOND.

### Multi-Target Routing (multiple BEYOND machines)

When a single BEYOND PC can't handle all 49 zones, split the grid across multiple machines using a **routing config** JSON file. One receiver dispatches OSC to multiple BEYOND targets over the LAN — no extra Node.js installs needed on the other machines.

```
┌──────────────────────────────┐
│     Receiver (one machine)   │
│                              │
│  reads routing.json          │
│  ┌────────┐   ┌────────┐    │
│  │ grid   │──►│ routed │    │
│  │ state  │   │ output │    │
│  └────────┘   └───┬────┘    │
│                   │         │
└───────────────────┼─────────┘
          ┌─────────┼─────────┐
          ▼                   ▼
  ┌──────────────┐    ┌──────────────┐
  │  BEYOND A    │    │  BEYOND B    │
  │  .1.68:7001  │    │  .1.69:7001  │
  │  zones 0–23  │    │  zones 0–24  │
  └──────────────┘    └──────────────┘
```

Create a `routing.json` file (see `examples/routing-two-beyond.json` for a full 49-cannon example):

```json
{
  "targets": {
    "beyond-a": { "type": "beyond", "host": "192.168.1.68", "port": 7001 },
    "beyond-b": { "type": "beyond", "host": "192.168.1.69", "port": 7001 }
  },
  "flushHz": 30,
  "cannons": [
    { "logical": 0,  "target": "beyond-a", "projectorIndex": 0,  "label": "row0 col0" },
    { "logical": 1,  "target": "beyond-a", "projectorIndex": 1,  "label": "row0 col1" },
    ...
    { "logical": 24, "target": "beyond-b", "projectorIndex": 0,  "label": "row3 col3" },
    { "logical": 25, "target": "beyond-b", "projectorIndex": 1,  "label": "row3 col4" },
    ...
  ]
}
```

Each cannon entry maps a logical grid index to a target and zone index:
- **`logical`** — grid cell index (0–48 for a 7×7 grid)
- **`target`** — name of a target defined in `targets`
- **`projectorIndex`** — the BEYOND zone index on that target (resets to 0 for each target)
- **`label`** — optional human-readable name for debugging
- **`safeDisabled`** — set `true` to disable a cannon in software

Run with:

PowerShell (Windows):
```powershell
$env:ROUTING_CONFIG = "routing.json"
$env:SIMULATOR_URL = "ws://203.0.113.50:3000"
$env:DEBUG_OSC = "1"
pnpm dev:receiver
```

Bash:
```sh
ROUTING_CONFIG=routing.json SIMULATOR_URL=ws://203.0.113.50:3000 DEBUG_OSC=1 pnpm dev:receiver
```

The startup banner will show: `Routed OSC → [beyond-a, beyond-b]`

> **Note:** When using `ROUTING_CONFIG`, do not set `BEYOND_HOST` — they are mutually exclusive.

### BEYOND Color Control

The receiver sends 5 OSC messages per changed cannon: `alpha` (255 = full override) + `red` + `green` + `blue` (0–255) + `Brightness` (0–100). This requires BEYOND's RGBA panel to be enabled: **Settings → Configuration → Live Control → Extra Controls → "Show R-G-B-A panel"**.


### User Authentication

The UI has a login screen that protects access. Create a `.users` file in the repo root with one `username:password` per line:

```sh
cp .users.example .users
# Edit .users with real credentials
```

When `.users` exists and contains entries, the UI shows a login screen. When it's missing or empty, the UI is open (no login required).

The `.users` file is gitignored — only `.users.example` (with fake credentials) is tracked.

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `RELAY_PASSWORD` | `demo` | Login password for the cloud relay |
| `RELAY_URL` | `ws://localhost:3000/agent?token=changeme` | Agent: WSS endpoint to connect to |
| `NEXT_PUBLIC_RELAY_URL` | `http://localhost:3000` | UI: cloud relay HTTP endpoint |
| `NEXT_PUBLIC_VIEWER_URL` | `ws://localhost:8090` | UI: agent viewer WebSocket (RGB framebuffer) |
| `NEXT_PUBLIC_NUM_CANNONS` | `49` | Total grid cells |
| `NEXT_PUBLIC_GRID_COLUMNS` | `7` | Grid columns |
| `USERS_FILE` | `../../.users` | Path to credentials file (UI only) |
| `BEYOND_HOST` | — | BEYOND PC IP (enables OSC output) |
| `BEYOND_PORT` | `7001` | BEYOND OSC receive port |
| `BEYOND_GRID_ORDER` | `row` | Grid-to-zone mapping: `row` or `column` |
| `NUM_CANNONS` | `49` | Total cannons in grid |
| `GRID_COLUMNS` | `7` | Number of columns |
| `DEBUG_OSC` | — | Set to `1` to log every OSC message |
| `ROUTING_CONFIG` | — | Path to JSON routing config file |

## Credits

**Built by the [Constructive](https://constructive.io) team — creators of modular Postgres tooling for secure, composable backends. If you like our work, contribute on [GitHub](https://github.com/constructive-io).**
