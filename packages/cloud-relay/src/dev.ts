#!/usr/bin/env node
/**
 * Local development entry point for the wavegrid cloud relay.
 *
 * Starts the relay server on http://localhost:3000 with a pattern gallery UI.
 * The agent connects via ws://localhost:3000/agent?token=changeme.
 *
 * Usage:
 *   pnpm dev
 */

import { createRelayServer } from './relay-server';

const PASSWORD = process.env.RELAY_PASSWORD ?? 'demo';
const AGENT_TOKEN = process.env.AGENT_TOKEN ?? 'changeme';

const relay = createRelayServer({
  port: 3000,
  host: '0.0.0.0',
  password: PASSWORD,
  agentToken: AGENT_TOKEN,
  log: (msg) => console.log('[relay]', msg)
});

console.log(`Cloud relay running on http://localhost:3000`);
console.log(`  Login password: ${PASSWORD}`);
console.log(`  Agent token: ${AGENT_TOKEN}`);
console.log(`  Agent URL: ws://localhost:3000/agent?token=${AGENT_TOKEN}`);

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  relay.close();
  process.exit(0);
});
