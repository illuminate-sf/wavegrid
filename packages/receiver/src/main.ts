/**
 * Receiver entry point.
 *
 * Configure input and output adapters via environment variables:
 *
 *   SIMULATOR_URL      WebSocket upstream (default ws://localhost:3000)
 *   RECEIVER_ALPHA     LP filter alpha (default 0.06)
 *   FALLBACK_DELAY     Ms before sine fallback (default 3000)
 *   WS_OUTPUT_PORT     Optional WebSocket relay port
 *   SHARD_START/END    Optional cannon index range
 *   ROUTING_CONFIG     Path to a JSON routing config file (enables OSC output)
 *   BEYOND_HOST/PORT   Quick single-target BEYOND OSC (alternative to routing file)
 *   FB4_HOST/PORT      Quick single-target FB4 OSC (alternative to routing file)
 */

import * as fs from 'fs';

import { ConsoleOutput, MultiOutput, OutputAdapter, WebSocketInput, WebSocketOutput } from './adapters';
import {
  BeyondOscOutput,
  FB4OscOutput,
  RoutingConfig,
  createRoutedOutput
} from './osc-adapters';
import { Receiver, ShardConfig } from './receiver';

const SIMULATOR_URL = process.env.SIMULATOR_URL || 'ws://localhost:3000';
const ALPHA = parseFloat(process.env.RECEIVER_ALPHA || '0.06');
const FALLBACK_DELAY = parseInt(process.env.FALLBACK_DELAY || '3000', 10);
const WS_OUTPUT_PORT = process.env.WS_OUTPUT_PORT ? parseInt(process.env.WS_OUTPUT_PORT, 10) : undefined;

let shard: ShardConfig | undefined;
if (process.env.SHARD_START !== undefined && process.env.SHARD_END !== undefined) {
  shard = {
    start: parseInt(process.env.SHARD_START, 10),
    end: parseInt(process.env.SHARD_END, 10)
  };
}

// ─── Input adapter ───
const input = new WebSocketInput({ url: SIMULATOR_URL });

// ─── Output adapter(s) ───
const outputs: OutputAdapter[] = [new ConsoleOutput()];
const outputLabels: string[] = ['Console'];

// Routing config file — creates a RoutedOscOutput from JSON
if (process.env.ROUTING_CONFIG) {
  const raw = fs.readFileSync(process.env.ROUTING_CONFIG, 'utf8');
  const routingConfig: RoutingConfig = JSON.parse(raw);
  const routed = createRoutedOutput(routingConfig);
  routed.connect();
  outputs.push(routed);
  outputLabels.push(`Routed OSC → [${routed.targetNames.join(', ')}]`);
}

// Quick single-target BEYOND OSC (no routing file needed)
if (process.env.BEYOND_HOST) {
  const host = process.env.BEYOND_HOST;
  const port = parseInt(process.env.BEYOND_PORT || '9000', 10);
  // Default: identity map (grid index = projector index)
  const projectorMap: Record<number, number> = {};
  for (let i = 0; i < 49; i++) projectorMap[i] = i;
  const beyond = new BeyondOscOutput({ host, port, projectorMap });
  beyond.connect();
  outputs.push(beyond);
  outputLabels.push(`BEYOND OSC → ${host}:${port}`);
}

// Quick single-target FB4 OSC
if (process.env.FB4_HOST) {
  const host = process.env.FB4_HOST;
  const port = parseInt(process.env.FB4_PORT || '8000', 10);
  // FB4 requires explicit serial mapping — no default identity map
  console.warn('  ⚠ FB4_HOST set but no serial map — use ROUTING_CONFIG for per-cannon FB4 mapping');
  const fb4 = new FB4OscOutput({ host, port, serialMap: {} });
  fb4.connect();
  outputs.push(fb4);
  outputLabels.push(`FB4 OSC → ${host}:${port}`);
}

let wsOutput: WebSocketOutput | null = null;
if (WS_OUTPUT_PORT) {
  wsOutput = new WebSocketOutput({ port: WS_OUTPUT_PORT });
  wsOutput.listen();
  outputs.push(wsOutput);
  outputLabels.push(`WebSocket :${WS_OUTPUT_PORT}`);
}

const output = outputs.length === 1 ? outputs[0] : new MultiOutput(outputs);

// ─── Receiver ───
const receiver = new Receiver({
  input,
  output,
  alpha: ALPHA,
  fallbackDelay: FALLBACK_DELAY,
  shard
});

console.log('');
console.log('  ╭──────────────────────────────────────╮');
console.log('  │   Illuminate · Receiver               │');
console.log('  │   the brain                           │');
console.log('  ╰──────────────────────────────────────╯');
console.log('');
console.log(`  → Input:  WebSocket @ ${SIMULATOR_URL}`);
console.log(`  → Output: ${outputLabels.join(' + ')}`);
console.log(`  → Alpha: ${ALPHA}  Fallback delay: ${FALLBACK_DELAY}ms`);
console.log(`  → Shard: ${shard ? `cannons ${shard.start}–${shard.end} (${shard.end - shard.start + 1} of 49)` : 'all cannons (no shard)'}`);
console.log('');

receiver.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n  Shutting down...');
  receiver.stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  receiver.stop();
  process.exit(0);
});
