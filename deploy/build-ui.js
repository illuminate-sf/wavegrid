#!/usr/bin/env node
// Cross-platform UI build script (replaces build-ui.sh).
// Reads CLOUD_IP from deploy/.env to derive NEXT_PUBLIC_SIMULATOR_URL,
// then runs `pnpm --filter @wavegrid/ui build`.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const deployDir = __dirname;
const envFile = fs.existsSync(path.join(deployDir, '.env'))
  ? path.join(deployDir, '.env')
  : fs.existsSync(path.join(deployDir, '.env.example'))
    ? path.join(deployDir, '.env.example')
    : null;

const env = { ...process.env };

if (envFile) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in env)) env[key] = val;
  }
}

const simPort = env.SIM_PORT || '3000';
if (env.CLOUD_IP && !env.NEXT_PUBLIC_SIMULATOR_URL) {
  env.NEXT_PUBLIC_SIMULATOR_URL = `ws://${env.CLOUD_IP}:${simPort}`;
}

execSync('pnpm --filter @wavegrid/ui build', { stdio: 'inherit', env });
