import http from 'http';

import { GRID_DATA } from './grid-data';
import { getDebugHTML } from './ui';

const PORT = parseInt(process.env.DEBUG_PORT || '3005', 10);
const SIMULATOR_URL = process.env.SIMULATOR_URL || 'ws://localhost:3000';

const server = http.createServer((req, res) => {
  if (req.url === '/api/grid-data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(GRID_DATA, null, 2));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(getDebugHTML(SIMULATOR_URL));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  console.log('\u2551   Wavegrid \u00b7 Debug Zone Mapper            \u2551');
  console.log('\u2551   7\u00d77 Grid \u00b7 49 cannons                   \u2551');
  console.log('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
  console.log('');
  console.log(`  \u2192 http://localhost:${PORT}`);
  console.log('  \u2192 Click cells to toggle on/off');
  console.log('  \u2192 Use dropdowns to assign BEYOND zones');
  console.log('  \u2192 Export JSON for zone mapping config');
  console.log('');
});

export { server };
