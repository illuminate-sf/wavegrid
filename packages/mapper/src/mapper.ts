/**
 * Zone-to-grid mapping server.
 *
 * Serves the mapper UI, reads/writes mapping.json, and flashes individual
 * zones via OSC to identify physical cannons during calibration.
 */

import http from 'http';
import dgram from 'dgram';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { MapperConfig, OscTarget, ZoneMapping } from './types';

/** Pad a buffer to 4-byte alignment (OSC requirement). */
function pad4(b: Buffer): Buffer {
  const p = Buffer.alloc(Math.ceil((b.length + 1) / 4) * 4);
  b.copy(p);
  return p;
}

/** Encode an OSC message with one or more float values. */
function osc(addr: string, vals: number[]): Buffer {
  const a = pad4(Buffer.from(addr, 'ascii'));
  const t = pad4(Buffer.from(',' + vals.map(() => 'f').join(''), 'ascii'));
  const f = Buffer.alloc(4 * vals.length);
  vals.forEach((v, i) => f.writeFloatBE(v, i * 4));
  return Buffer.concat([a, t, f]);
}

export interface MapperHandle {
  server: http.Server;
  loadMapping(): ZoneMapping;
  flashZone(index: number, targetName: string, ms: number): void;
  close(): void;
}

export function startMapper(config: MapperConfig): MapperHandle {
  const port = config.port ?? 8091;
  const mappingPath = config.mappingPath;
  const htmlPath = config.htmlPath;
  const targets = config.targets ?? { pc2: { host: '127.0.0.1', port: 8000 } };
  const rows = config.rows ?? 7;
  const cols = config.cols ?? 7;
  const flashColor = config.flashColor ?? [255, 255, 255];
  const flashHz = config.flashHz ?? 2;
  const onFlashStart = config.onFlashStart;
  const onFlashEnd = config.onFlashEnd;
  const log = config.log ?? (() => {});

  const sock = dgram.createSocket('udp4');

  function defaultMapping(): ZoneMapping {
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pos = r * cols + c;
        cells.push({
          pos,
          row: r,
          col: c,
          index: pos,
          name: String.fromCharCode(65 + r) + (c + 1),
          target: 'pc2',
        });
      }
    }
    return { rows, cols, cells };
  }

  function loadMapping(): ZoneMapping {
    if (existsSync(mappingPath)) {
      try {
        return JSON.parse(readFileSync(mappingPath, 'utf8'));
      } catch { /* fall through */ }
    }
    const m = defaultMapping();
    writeFileSync(mappingPath, JSON.stringify(m, null, 2));
    return m;
  }

  function setZone(
    t: OscTarget, index: number,
    r: number, g: number, b: number,
    a: number, bright: number,
  ): void {
    const p = `/beyond/zone/${index}/livecontrol`;
    sock.send(osc(`${p}/Brightness`, [bright]), t.port, t.host);
    sock.send(osc(`${p}/alpha`, [a]), t.port, t.host);
    sock.send(osc(`${p}/red`, [r]), t.port, t.host);
    sock.send(osc(`${p}/green`, [g]), t.port, t.host);
    sock.send(osc(`${p}/blue`, [b]), t.port, t.host);
  }

  const flashing = new Map<number, { iv: ReturnType<typeof setInterval>; to: ReturnType<typeof setTimeout> }>();

  function flashZone(index: number, targetName: string, ms: number): void {
    const t = targets[targetName] ?? targets.pc2;
    if (!t) { log(`flash: unknown target ${targetName}`); return; }

    if (flashing.has(index)) {
      const f = flashing.get(index)!;
      clearInterval(f.iv);
      clearTimeout(f.to);
    }

    if (onFlashStart) try { onFlashStart(); } catch { /* ignore */ }

    let on = false;
    const period = Math.max(60, Math.round(1000 / (flashHz * 2)));

    const iv = setInterval(() => {
      on = !on;
      if (on) {
        setZone(t, index, flashColor[0], flashColor[1], flashColor[2], 255, 100);
      } else {
        setZone(t, index, 0, 0, 0, 0, 0);
      }
    }, period);

    const to = setTimeout(() => {
      clearInterval(iv);
      setZone(t, index, 0, 0, 0, 0, 0);
      flashing.delete(index);
      if (onFlashEnd) try { onFlashEnd(); } catch { /* ignore */ }
      log(`flash done index=${index}`);
    }, ms);

    flashing.set(index, { iv, to });
    log(`flash index=${index} target=${targetName} ${ms}ms -> ${t.host}:${t.port}`);
  }

  function body(req: http.IncomingMessage): Promise<string> {
    return new Promise(r => {
      let d = '';
      req.on('data', (c: string) => d += c);
      req.on('end', () => r(d));
    });
  }

  function json(res: http.ServerResponse, o: unknown, code = 200): void {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(o));
  }

  let html: Buffer;
  try {
    html = readFileSync(htmlPath);
  } catch {
    html = Buffer.from('<html><body><h1>Mapper UI not found</h1></body></html>');
  }

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url ?? '/', 'http://x');
    try {
      if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/map')) {
        res.writeHead(200, { 'content-type': 'text/html' });
        return res.end(html);
      }
      if (req.method === 'GET' && u.pathname === '/api/mapping') {
        return json(res, loadMapping());
      }
      if (req.method === 'POST' && u.pathname === '/api/mapping') {
        const m = JSON.parse(await body(req));
        if (!m || !Array.isArray(m.cells)) {
          return json(res, { ok: false, error: 'bad mapping' }, 400);
        }
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
      res.writeHead(404);
      res.end('not found');
    } catch (e: unknown) {
      json(res, { ok: false, error: String((e as Error).message || e) }, 500);
    }
  });

  server.listen(port, '0.0.0.0', () => log(`mapper UI on http://0.0.0.0:${port}/map`));

  return {
    server,
    loadMapping,
    flashZone,
    close(): void {
      for (const [, f] of flashing) {
        clearInterval(f.iv);
        clearTimeout(f.to);
      }
      flashing.clear();
      server.close();
      try { sock.close(); } catch { /* ignore */ }
    },
  };
}
