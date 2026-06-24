#!/usr/bin/env bash
# Local prod-parity launcher — runs the full stack (simulator + ui + receiver)
# the way prod does, but entirely on localhost and without PM2.
#
# The only real "prod vs dev" difference is the UI: prod serves a Next.js
# production build (`next build` then `next start`) with NEXT_PUBLIC_* baked in
# at build time, not `next dev` with hot reload. The simulator and receiver run
# via ts-node either way. This script builds the UI, then boots all three in one
# terminal and tears them down together on Ctrl-C.
#
#   deploy/local.sh                build the UI, then start sim + ui + receiver
#   deploy/local.sh --skip-build   skip the UI build (reuse the last one)
#
# Override before the command (defaults shown):
#   SIM_PORT=3000   NUM_CANNONS=49   GRID_COLUMNS=7
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

# ── localhost-pinned config (ui + receiver point at the local simulator) ──
export SIM_PORT="${SIM_PORT:-3000}"
export PORT="$SIM_PORT"                                    # simulator bind port
export NUM_CANNONS="${NUM_CANNONS:-49}"
export GRID_COLUMNS="${GRID_COLUMNS:-7}"
export SIMULATOR_URL="${SIMULATOR_URL:-ws://localhost:${SIM_PORT}}"            # receiver → sim
export NEXT_PUBLIC_SIMULATOR_URL="${NEXT_PUBLIC_SIMULATOR_URL:-ws://localhost:${SIM_PORT}}"  # ui (baked at build)
export NEXT_PUBLIC_NUM_CANNONS="$NUM_CANNONS"
export NEXT_PUBLIC_GRID_COLUMNS="$GRID_COLUMNS"

SKIP_BUILD=0
[ "${1:-}" = "--skip-build" ] && SKIP_BUILD=1

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "▶ Building UI (prod) with NEXT_PUBLIC_SIMULATOR_URL=$NEXT_PUBLIC_SIMULATOR_URL …"
  pnpm build:ui
else
  echo "▶ Skipping UI build (--skip-build)"
fi

# ── start all three; kill them together on exit ──────────────────────────
pids=()
cleanup() {
  echo
  echo "▶ Shutting down …"
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "▶ simulator → http://localhost:${SIM_PORT}  (master controller)"
pnpm dev:sim & pids+=("$!")

echo "▶ ui        → http://localhost:3003  (prod build)"
pnpm start:ui & pids+=("$!")

echo "▶ receiver  → upstream ${SIMULATOR_URL}  (no OSC unless BEYOND_HOST/ROUTING_CONFIG set)"
pnpm dev:receiver & pids+=("$!")

echo
echo "All up. Open http://localhost:3003 — Ctrl-C stops everything."
wait
