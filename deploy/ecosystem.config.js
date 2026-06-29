// PM2 process definitions for the WaveGrid dev servers.
//
//   pm2 start deploy/ecosystem.config.js   # start server + ui, keep them alive
//   pm2 logs                               # tail both
//   pm2 restart deploy/ecosystem.config.js # pick up code or .env changes
//   pm2 save                               # persist (see deploy/pm2.sh setup)
//
// Reads deploy/.env (gitignored) so the server IP stays out of git.

const fs = require('fs');
const path = require('path');

// Repo root is one level up from deploy/ (override with ILLUMINATE_DIR).
const ILLUMINATE_DIR = process.env.ILLUMINATE_DIR
  ? path.resolve(process.env.ILLUMINATE_DIR)
  : path.resolve(__dirname, '..');

// Parse a KEY=VALUE env file into a plain object.
function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

// Prefer real .env, fall back to the committed example.
const envFile = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : path.join(__dirname, '.env.example');
const fileEnv = loadEnv(envFile);

// Derive URLs/ports from CLOUD_IP so the IP is the single source of truth.
const SIM_PORT = fileEnv.SIM_PORT || '3000';
if (!fileEnv.PORT) fileEnv.PORT = SIM_PORT; // server bind port
if (!fileEnv.NEXT_PUBLIC_SIMULATOR_URL && fileEnv.CLOUD_IP) {
  fileEnv.NEXT_PUBLIC_SIMULATOR_URL = `ws://${fileEnv.CLOUD_IP}:${SIM_PORT}`;
}

// Main UI port (same series as server ports for firewall simplicity).
const UI_PORT = fileEnv.UI_PORT || '3003';

// Pride instance settings (7×2 grid).
const PRIDE_GRID = fileEnv.PRIDE_GRID || '7x2';
const PRIDE_SIM_PORT = fileEnv.PRIDE_SIM_PORT || '3001';
const PRIDE_UI_PORT = fileEnv.PRIDE_UI_PORT || '3004';
const PRIDE_SIMULATOR_URL = fileEnv.CLOUD_IP
  ? `ws://${fileEnv.CLOUD_IP}:${PRIDE_SIM_PORT}`
  : `ws://localhost:${PRIDE_SIM_PORT}`;

// Resolve pnpm/node portably: the node running this config lives next to the
// matching pnpm. The PM2 daemon may not share the user's PATH, so pin both.
const NODE_BIN = path.dirname(process.execPath);
const candidatePnpm = path.join(NODE_BIN, 'pnpm');
const PNPM =
  process.env.PNPM_PATH ||
  (fs.existsSync(candidatePnpm) ? candidatePnpm : 'pnpm');

const baseEnv = {
  ...fileEnv,
  PATH: `${NODE_BIN}:${process.env.PATH || ''}`,
};

const common = {
  cwd: ILLUMINATE_DIR,
  script: PNPM,
  interpreter: 'none', // pnpm is its own executable; don't wrap it in node
  autorestart: true,
  max_restarts: 50,
  restart_delay: 2000,
  time: true,
  env: baseEnv,
};

module.exports = {
  apps: [
    // ── Main show (7×7, 49 cannons) ──────────────────────────────────
    {
      ...common,
      name: 'wavegrid-server',
      args: 'dev:server',
      env: baseEnv,
    },
    {
      ...common,
      name: 'wavegrid-ui',
      args: 'start:ui',
      env: { ...baseEnv, PORT: UI_PORT, WS_PATH: '/ws' },
    },

    // ── Pride show (7×2, 14 cannons) ─────────────────────────────────
    {
      ...common,
      name: 'wavegrid-server-pride',
      args: 'dev:server',
      env: {
        ...baseEnv,
        PORT: PRIDE_SIM_PORT,
        GRID: PRIDE_GRID,
      },
    },
    {
      ...common,
      name: 'wavegrid-ui-pride',
      args: 'start:ui',
      env: {
        ...baseEnv,
        PORT: PRIDE_UI_PORT,
        GRID: PRIDE_GRID,
        SIMULATOR_URL: PRIDE_SIMULATOR_URL,
        NEXT_PUBLIC_SIMULATOR_URL: PRIDE_SIMULATOR_URL,
        WS_PATH: '/ws',
      },
    },
  ],
};
