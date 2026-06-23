// Output sinks. LocalUiSink serves a canvas viewer + streams the framebuffer.
// On PC2 this file is where OscSink lives instead (diff fb -> /beyond/zone/N/livecontrol).
import http from 'node:http';
import dgram from 'node:dgram';
import { readFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';

export function LocalUiSink({ port = 8090 } = {}) {
  const html = readFileSync(new URL('./display.html', import.meta.url));
  const server = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end(html); });
  const wss = new WebSocketServer({ server });
  const clients = new Set();
  wss.on('connection', ws => { clients.add(ws); ws.on('close', () => clients.delete(ws)); });
  server.listen(port, () => console.log(`[ui]    local display:  http://localhost:${port}`));
  return {
    present(fb) {
      const u8 = Uint8Array.from(fb, v => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v)));
      for (const c of clients) if (c.readyState === 1) c.send(u8);
    },
    clientCount() { return clients.size; }
  };
}

// --- OSC encoding (no dependency) ---
function oscFloat(address, value) {
  const a = Buffer.from(address + '\0', 'ascii');
  const ap = Buffer.alloc(Math.ceil(a.length / 4) * 4); a.copy(ap);
  const tt = Buffer.from(',f\0\0', 'ascii');           // ",f" padded to 4 bytes
  const fb = Buffer.alloc(4); fb.writeFloatBE(value, 0);
  return Buffer.concat([ap, tt, fb]);
}

// Drives BEYOND livecontrol over OSC/UDP. Diffs the framebuffer so only changed
// channels are sent (BEYOND drops bursts); alpha=1 to take a zone, alpha=0 to release.
// Values are 0..1 floats by default (BEYOND fader convention).
export function OscSink({ host = '127.0.0.1', port = 8000, count = 49, zoneMap = null,
                          scale = 1, thresh = 2, maxPerFlush = 180 } = {}) {
  const sock = dgram.createSocket('udp4');
  const map = zoneMap || Array.from({ length: count }, (_, i) => i);  // grid index -> BEYOND zone
  const last = new Array(count * 3).fill(-1);
  const active = new Array(count).fill(false);
  let sentThisFlush = 0;
  function emit(zone, ch, v) {                          // ch: red|green|blue|alpha|Brightness
    const val = (ch === 'alpha' || ch === 'Brightness') ? v : (v / 255) * scale;  // scale=255 => raw 0..255
    sock.send(oscFloat(`/beyond/zone/${zone}/livecontrol/${ch}`, val), port, host);
    sentThisFlush++;
  }
  const clamp = v => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
  return {
    kind: 'osc',
    present(fb) {
      sentThisFlush = 0;
      for (let i = 0; i < count; i++) {
        const zone = map[i]; if (zone == null) continue;
        const o = i * 3, r = clamp(fb[o]), g = clamp(fb[o + 1]), b = clamp(fb[o + 2]);
        const on = (r + g + b) > thresh;
        if (on) {
          if (!active[i]) { emit(zone, 'Brightness', 255); emit(zone, 'alpha', 255); active[i] = true; }
          if (Math.abs(r - last[o])     > thresh) { emit(zone, 'red',   r); last[o]     = r; }
          if (Math.abs(g - last[o + 1]) > thresh) { emit(zone, 'green', g); last[o + 1] = g; }
          if (Math.abs(b - last[o + 2]) > thresh) { emit(zone, 'blue',  b); last[o + 2] = b; }
        } else if (active[i]) {
          emit(zone, 'red', 0); emit(zone, 'green', 0); emit(zone, 'blue', 0); emit(zone, 'alpha', 0);
          active[i] = false; last[o] = last[o + 1] = last[o + 2] = 0;
        }
        if (sentThisFlush >= maxPerFlush) break;          // burst guard; rest catches up next frame
      }
    },
    releaseAll() {
      for (let i = 0; i < count; i++) {
        const zone = map[i]; if (zone == null) continue;
        emit(zone, 'alpha', 0);
        active[i] = false; const o = i * 3; last[o] = last[o + 1] = last[o + 2] = -1;
      }
    },
    clientCount() { return 1; },
    close() { try { sock.close(); } catch {} }
  };
}
