// Zone↔grid mapping config server, hosted BY the agent on PC2 for direct LAN access.
//   • serves the mapper UI (mapper.html)
//   • GET/POST /api/mapping  -> reads/writes mapping.json on PC2 (source of truth)
//   • POST /api/command {flashZone} -> blinks that zone's laser for N ms via OSC, then releases
// Flash sends OSC straight to the target BEYOND (pc2=localhost / pc1=slave) so it works
// even while the agent's pattern loop is idle (calibration time).
import http from 'node:http';
import dgram from 'node:dgram';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

function pad4(b) { const p = Buffer.alloc(Math.ceil((b.length + 1) / 4) * 4); b.copy(p); return p; }
function osc(addr, vals) {
  const a = pad4(Buffer.from(addr, 'ascii'));
  const t = pad4(Buffer.from(',' + vals.map(() => 'f').join(''), 'ascii'));
  const f = Buffer.alloc(4 * vals.length); vals.forEach((v, i) => f.writeFloatBE(v, i * 4));
  return Buffer.concat([a, t, f]);
}

export function startMapper({
  port = 8091, mappingPath, htmlPath,
  targets = { pc2: { host: '127.0.0.1', port: 8000 }, pc1: { host: '169.254.149.17', port: 8000 } },
  rows = 7, cols = 7, flashColor = [255, 255, 255], flashHz = 2,
  onFlashStart = null, onFlashEnd = null, log = () => {}
} = {}) {
  const sock = dgram.createSocket('udp4');

  function defaultMapping() {
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const pos = r * cols + c;
      cells.push({ pos, row: r, col: c, index: pos, name: String.fromCharCode(65 + r) + (c + 1), target: 'pc2' });
    }
    return { rows, cols, cells };
  }
  function loadMapping() {
    if (existsSync(mappingPath)) { try { return JSON.parse(readFileSync(mappingPath, 'utf8')); } catch {} }
    const m = defaultMapping(); writeFileSync(mappingPath, JSON.stringify(m, null, 2)); return m;
  }
  function setZone(t, index, r, g, b, a, bright) {
    const p = `/beyond/zone/${index}/livecontrol`;
    sock.send(osc(`${p}/Brightness`, [bright]), t.port, t.host);
    sock.send(osc(`${p}/alpha`, [a]), t.port, t.host);
    sock.send(osc(`${p}/red`, [r]), t.port, t.host);
    sock.send(osc(`${p}/green`, [g]), t.port, t.host);
    sock.send(osc(`${p}/blue`, [b]), t.port, t.host);
  }

  const flashing = new Map(); // index -> {iv,to}
  function flashZone(index, targetName, ms) {
    const t = targets[targetName] || targets.pc2;
    if (!t) { log(`flash: unknown target ${targetName}`); return; }
    if (flashing.has(index)) { const f = flashing.get(index); clearInterval(f.iv); clearTimeout(f.to); }
    if (onFlashStart) try { onFlashStart(); } catch {}
    let on = false;
    const period = Math.max(60, Math.round(1000 / (flashHz * 2)));
    const iv = setInterval(() => {
      on = !on;
      if (on) setZone(t, index, flashColor[0], flashColor[1], flashColor[2], 255, 100);
      else setZone(t, index, 0, 0, 0, 0, 0);
    }, period);
    const to = setTimeout(() => {
      clearInterval(iv);
      setZone(t, index, 0, 0, 0, 0, 0);   // release back to whatever the cue shows
      flashing.delete(index);
      if (onFlashEnd) try { onFlashEnd(); } catch {}
      log(`flash done index=${index}`);
    }, ms);
    flashing.set(index, { iv, to });
    log(`flash index=${index} target=${targetName} ${ms}ms -> ${t.host}:${t.port}`);
  }

  function body(req) { return new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d)); }); }
  function json(res, o, code = 200) { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); }
  const html = readFileSync(htmlPath);

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    try {
      if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/map')) {
        res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html);
      }
      if (req.method === 'GET' && u.pathname === '/api/mapping') return json(res, loadMapping());
      if (req.method === 'POST' && u.pathname === '/api/mapping') {
        const m = JSON.parse(await body(req));
        if (!m || !Array.isArray(m.cells)) return json(res, { ok: false, error: 'bad mapping' }, 400);
        writeFileSync(mappingPath, JSON.stringify(m, null, 2));
        log(`saved mapping (${m.cells.length} cells)`);
        return json(res, { ok: true });
      }
      if (req.method === 'POST' && u.pathname === '/api/command') {
        const cmd = JSON.parse((await body(req)) || '{}');
        if (cmd.action === 'flashZone') {
          const ms = cmd.ms || 5000;
          flashZone(cmd.index | 0, cmd.target || 'pc2', ms);
          return json(res, { ok: true, until: Date.now() + ms });
        }
        return json(res, { ok: true });
      }
      res.writeHead(404); res.end('not found');
    } catch (e) { json(res, { ok: false, error: String(e && e.message || e) }, 500); }
  });
  server.listen(port, '0.0.0.0', () => log(`mapper UI on http://0.0.0.0:${port}/map`));
  return { server, loadMapping, flashZone };
}
