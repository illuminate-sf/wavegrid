#!/usr/bin/env bash
# Build the UI with env vars auto-derived from deploy/.env (if present).
# NEXT_PUBLIC_SIMULATOR_URL is derived from CLOUD_IP so you don't have to
# pass it manually. If deploy/.env doesn't exist or CLOUD_IP isn't set,
# the UI falls back to ws://localhost:3000 (normal local dev behavior).
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

# Source load-env.sh to pick up CLOUD_IP → NEXT_PUBLIC_SIMULATOR_URL.
# Suppress the informational output.
# shellcheck disable=SC1091
. "$DEPLOY_DIR/load-env.sh" >/dev/null 2>&1 || true

exec pnpm --filter @wavegrid/ui build
