#!/usr/bin/env node
/**
 * Local development entry point for the wavegrid agent.
 *
 * Boots the QuickJS pattern engine + local canvas viewer (http://localhost:8090)
 * and optionally connects to a cloud relay for remote pattern loading.
 *
 * Usage:
 *   pnpm dev                              # standalone with demo pattern
 *   pnpm dev --relay ws://host:3000/agent?token=changeme
 */

import { createEngine } from '@wavegrid/patterns';

import { createCommandHandler, createRenderLoop } from './command-handler';
import { createLocalUiSink } from './local-ui-sink';
import { createRelayClient } from './relay-client';
import type { AgentCommand, RuntimeState } from './types';

const DEFAULT_RELAY = 'ws://localhost:3000/agent?token=changeme';

function parseRelayUrl(): string {
  const wsArg = process.argv.find(a => a.startsWith('ws://') || a.startsWith('wss://'));
  if (wsArg) return wsArg;
  const idx = process.argv.indexOf('--relay');
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  if (process.argv.includes('--no-relay')) return '';
  return process.env.RELAY_URL ?? DEFAULT_RELAY;
}

const RELAY_URL = parseRelayUrl();

const COUNT = 49; // 7×7 grid

const DEMO_PATTERN = `
var meta = { name: 'Rainbow Wave' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var h = (uv[0] + uv[1] + ctx.t * 0.3) * 360 % 360;
    ctx.setHSV(i, h, 100, 100);
  }
}
`;

async function main(): Promise<void> {
  const engine = await createEngine({
    grid: { cols: 7, rows: 7 },
    onLog: (m) => console.log('[pattern]', m)
  });

  const sink = createLocalUiSink({ port: 8090 });
  console.log('Viewer at http://localhost:8090');

  const state: RuntimeState = {
    fps: 30,
    bpm: 120,
    speed: 1,
    brightnessCap: 1,
    maxFlashHz: 12,
    armed: false
  };

  const deps = { engine, sink, state, onLog: (m: string) => console.log('[agent]', m) };
  const loop = createRenderLoop(deps, COUNT);
  const handle = createCommandHandler(deps, loop, COUNT);

  // Load the demo pattern immediately
  handle({ action: 'loadPattern', code: DEMO_PATTERN });
  console.log('Demo pattern loaded — open http://localhost:8090 to see it');

  // Connect to relay if URL provided
  if (RELAY_URL) {
    console.log(`Connecting to relay: ${RELAY_URL}`);
    const relay = createRelayClient({
      url: RELAY_URL,
      onCommand: (cmd: AgentCommand) => handle(cmd),
      onLog: (m: string) => console.log('[relay]', m)
    });
    relay.connect();
  }

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    loop.stop();
    engine.dispose();
    sink.close();
    process.exit(0);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
