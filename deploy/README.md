# deploy

Run config for the WaveGrid machines. **The cloud server IP is the only
secret** — it lives in `deploy/.env` (gitignored). Everything else here is
committed. Copy the example and fill it in once per machine:

```bash
cp deploy/.env.example deploy/.env   # set CLOUD_IP=…
```

`CLOUD_IP` is the single source of truth — `NEXT_PUBLIC_SIMULATOR_URL` (ui) and
`SIMULATOR_URL` (receiver) are auto-derived as `ws://CLOUD_IP:SIM_PORT`.

## Machine 1 — cloud server (Linux, at CLOUD_IP)

Runs the **server** + **ui** under PM2 so they stay up unattended.

```bash
deploy/cloud.sh setup     # install pm2 if needed, start both, enable boot persistence
deploy/cloud.sh logs      # tail both
deploy/cloud.sh restart   # after code/.env changes
deploy/cloud.sh status
deploy/cloud.sh stop
```

Processes: `wavegrid-server` (`pnpm dev:server`, binds `0.0.0.0:SIM_PORT`) and
`wavegrid-ui` (`pnpm dev:ui`, serves `:3003`). Both auto-restart on crash. See
`ecosystem.config.js`.

### Quick deploy (after `git pull`)

```bash
pnpm build:ui   # auto-reads deploy/.env → bakes NEXT_PUBLIC_SIMULATOR_URL
pm2 restart all
```

`build:ui` sources `deploy/load-env.sh` under the hood, so
`NEXT_PUBLIC_SIMULATOR_URL` is derived from `CLOUD_IP` automatically. No need to
pass it on the command line.

### Manual (mac/linux dev, two terminals)

```bash
source deploy/load-env.sh && pnpm dev:server # shell one
source deploy/load-env.sh && pnpm dev:ui    # shell two
```

## Machine 2 — pangolin / receiver (Windows)

Runs the **receiver**, which connects upstream to `ws://CLOUD_IP:SIM_PORT` and
emits OSC to BEYOND. Double-click or run from a terminal:

```bat
deploy\receiver.cmd
```

It loads `deploy\.env`, runs `set` for every `KEY=VALUE`, derives
`SIMULATOR_URL` from `CLOUD_IP`, then starts `pnpm dev:receiver`. To use an
alternate config file: `deploy\receiver.cmd path\to\other.env`.

Configure OSC output in `deploy\.env` — either a single BEYOND target
(`BEYOND_HOST`/`BEYOND_PORT`/`BEYOND_GRID_ORDER`) or a JSON routing file
(`ROUTING_CONFIG=deploy/routing.json`, path relative to repo root).

## Env vars

| var                         | machine | default          | notes                              |
| --------------------------- | ------- | ---------------- | ---------------------------------- |
| `CLOUD_IP`                  | both    | —                | **secret**; server address          |
| `SIM_PORT`                  | both    | `3000`           | server WebSocket port               |
| `NUM_CANNONS` / `GRID_COLUMNS` | both | `49` / `7`       | must match across server + receiver |
| `AUTH_PASSWORD`             | cloud   | —                | server auth                         |
| `NEXT_PUBLIC_SIMULATOR_URL` | cloud   | `ws://CLOUD_IP:SIM_PORT` | ui → server (derived)       |
| `SIMULATOR_URL`             | pangolin| `ws://CLOUD_IP:SIM_PORT` | receiver → server (derived) |
| `RECEIVER_ALPHA`            | pangolin| `0.06`           | smoothing                           |
| `FALLBACK_DELAY`            | pangolin| `3000`           | ms before sine fallback             |
| `BEYOND_HOST`/`BEYOND_PORT` | pangolin| — / `7001`       | single BEYOND OSC target            |
| `BEYOND_GRID_ORDER`         | pangolin| `row`            | `row` or `column`                   |
| `ROUTING_CONFIG`            | pangolin| —                | JSON routing file (multi-target)    |
| `DEBUG_OSC`                 | pangolin| —                | set to `1` to log all OSC           |
