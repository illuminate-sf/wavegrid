#!/usr/bin/env node
// Cross-platform full build script.
// Builds all packages except UI first, then builds UI with env vars.
// Replaces: pnpm -r --filter '!@wavegrid/ui' run build && pnpm run build:ui
// (single quotes in the filter break on Windows CMD)

const { execSync } = require('child_process');

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

// Build everything except the UI package
run('pnpm -r --filter !@wavegrid/ui run build');

// Build UI with env var derivation (delegates to build-ui.js)
run('node deploy/build-ui.js');
