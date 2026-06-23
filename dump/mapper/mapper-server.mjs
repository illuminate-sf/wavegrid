// Local TEST stand-in for "droplet proxy + PC2 agent".
// Serves the mapper UI and emulates the mapping store + flash command,
// so the UI can be built/verified before PC2 is reachable.
// Same API contract the droplet will expose: GET/POST /api/mapping, POST /api/command.
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const MAP_FILE = join(__dir, 'mapping.json');
const HTML_FILE = join(__dir, 'mapper.html');
const PORT = process.env.PORT || 8091;
const ROWS = 7, COLS = 7;

function defaultMapping() {
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const pos = r * COLS + c;
    cells.push({ pos, row: r, col: c, index: pos, name: String.fromCharCode(65 + r) + (c + 1), target: 'pc2' });
  }
  return { rows: ROWS, cols: COLS, cells };
}
function loadMapping() {
  if (existsSync(MAP_FILE)) { try { return JSON.parse(readFileSync(MAP_FILE, 'utf8')); } catch {} }
  const m = defaultMapping(); writeFileSync(MAP_FILE, JSON.stringify(m, null, 2)); return m;
}
function body(req) { return new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d)); }); }
function json(res, obj, code = 200) { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/map')) {
      res.writeHead(200, { 'content-type': 'text/html' }); return res.end(readFileSync(HTML_FILE));
    }
    if (req.method === 'GET' && url.pathname === '/api/mapping') return json(res, loadMapping());
    if (req.method === 'POST' && url.pathname === '/api/mapping') {
      const m = JSON.parse(await body(req));
      if (!m || !Array.isArray(m.cells)) return json(res, { ok: false, error: 'bad mapping' }, 400);
      writeFileSync(MAP_FILE, JSON.stringify(m, null, 2));
      console.log(`[SAVE] mapping with ${m.cells.length} cells`);
      return json(res, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/command') {
      const cmd = JSON.parse((await body(req)) || '{}');
      if (cmd.action === 'flashZone') {
        const ms = cmd.ms || 5000;
        console.log(`[FLASH] index=${cmd.index}  pos=${cmd.pos}  name=${cmd.name}  target=${cmd.target || '?'}  for ${ms}ms`);
        return json(res, { ok: true, until: Date.now() + ms });
      }
      console.log('[CMD]', JSON.stringify(cmd));
      return json(res, { ok: true });
    }
    res.writeHead(404); res.end('not found');
  } catch (e) { json(res, { ok: false, error: String(e && e.message || e) }, 500); }
});
server.listen(PORT, () => console.log(`mapper TEST server → http://localhost:${PORT}   (store: ${MAP_FILE})`));
