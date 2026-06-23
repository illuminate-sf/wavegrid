// Local test of the agent's mapper.mjs — runs it against a fake BEYOND (UDP capture)
// so we can confirm flashZone emits correct OSC without PC2/BEYOND.
import { startMapper } from '../agent/mapper.mjs';
import dgram from 'node:dgram';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const cap = dgram.createSocket('udp4');
let pkts = [];
cap.on('message', m => pkts.push(m.toString('latin1').replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').trim()));
cap.bind(9000, '127.0.0.1', () => console.log('fake BEYOND listening on udp 9000'));

startMapper({
  port: 8092,
  mappingPath: join(__dir, 'mapping.test.json'),
  htmlPath: join(__dir, '..', 'agent', 'mapper.html'),
  targets: { pc2: { host: '127.0.0.1', port: 9000 }, pc1: { host: '127.0.0.1', port: 9000 } },
  flashHz: 4,
  log: x => console.log('[mapper]', x)
});

setInterval(() => {
  if (pkts.length) { console.log(`captured ${pkts.length} OSC msgs; sample: ${pkts.slice(0, 4).join('  |  ')}`); pkts = []; }
}, 1000);
