/**
 * Receiver entry point.
 * Starts the brain and connects to the simulator upstream.
 */

import { createOscBridge,createStubBridge } from './osc';
import { Receiver } from './receiver';

const SIMULATOR_URL = process.env.SIMULATOR_URL || 'ws://localhost:3000';
const ALPHA = parseFloat(process.env.RECEIVER_ALPHA || '0.06');
const FALLBACK_DELAY = parseInt(process.env.FALLBACK_DELAY || '3000', 10);
const OSC_HOST = process.env.OSC_HOST;
const OSC_PORT = process.env.OSC_PORT ? parseInt(process.env.OSC_PORT, 10) : undefined;

const bridge = (OSC_HOST && OSC_PORT)
  ? createOscBridge({ host: OSC_HOST, port: OSC_PORT, prefix: '/beyond/laser' })
  : createStubBridge();

const receiver = new Receiver({
  simulatorUrl: SIMULATOR_URL,
  alpha: ALPHA,
  fallbackDelay: FALLBACK_DELAY,
  bridge
});

console.log('');
console.log('  ╭──────────────────────────────────────╮');
console.log('  │   Illuminate · Receiver               │');
console.log('  │   the brain                           │');
console.log('  ╰──────────────────────────────────────╯');
console.log('');
console.log(`  → Simulator: ${SIMULATOR_URL}`);
console.log(`  → Alpha: ${ALPHA}  Fallback delay: ${FALLBACK_DELAY}ms`);
if (OSC_HOST && OSC_PORT) {
  console.log(`  → OSC: ${OSC_HOST}:${OSC_PORT}`);
} else {
  console.log('  → OSC: stub (console output)');
}
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
