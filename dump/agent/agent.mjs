// Local laser agent — stand-in for the PC2 agent.
//   • dials OUT to the droplet relay (same as PC2 will)
//   • runs patterns in the QuickJS sandbox
//   • renders to a LOCAL UI sink (swap for OscSink on PC2 — nothing else changes)
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import WebSocket from 'ws';
import { createEngine } from './engine.mjs';
import { LocalUiSink, OscSink } from './sinks.mjs';
import { startMapper } from './mapper.mjs';
import { applySafety } from './safety.mjs';

const cfg = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
const RELAY_URL = process.env.RELAY_URL || cfg.relayUrl;
const COUNT = 49;

const run = { fps: cfg.fps ?? 60, bpm: cfg.bpm ?? 120, speed: 1, brightnessCap: cfg.brightnessCap ?? 1, maxFlashHz: cfg.maxFlashHz ?? 12, armed: cfg.armed ?? false, _lastDt: 1/60 };
const sink = (cfg.sink === 'osc')
  ? OscSink({ host: cfg.osc?.host ?? '127.0.0.1', port: cfg.osc?.port ?? 8000, count: COUNT, zoneMap: cfg.osc?.zoneMap ?? null, scale: cfg.osc?.scale ?? 1, thresh: cfg.osc?.thresh ?? 2, maxPerFlush: cfg.osc?.maxPerFlush ?? 180 })
  : LocalUiSink({ port: cfg.uiPort ?? 8090 });
console.log(`sink=${sink.kind || 'ui'}  armed=${run.armed}`);
const engine = await createEngine({ onLog: m => console.log('  [pattern]', m), config: { renderBudgetMs: 6 } });

// Zone↔grid mapping config server — direct LAN access on PC2 (configure here, perform via droplet).
const __dir = dirname(fileURLToPath(import.meta.url));
if (cfg.mapper !== false) {
  startMapper({
    port: cfg.mapperPort ?? 8091,
    mappingPath: join(__dir, 'mapping.json'),
    htmlPath: join(__dir, 'mapper.html'),
    targets: cfg.osc?.targets ?? { pc2: { host: '127.0.0.1', port: 8000 }, pc1: { host: '169.254.149.17', port: 8000 } },
    onFlashStart: () => stopLoop(),   // pause pattern playback so the flash is unambiguous
    log: m => console.log('  [mapper]', m)
  });
}

const prev = new Array(COUNT * 3).fill(0);
let t = 0, frame = 0, lastNow = 0, loop = null;

// OSC sink only emits when ARMED (protects a live show); UI sink always draws.
function present(fb, dt) { applySafety(fb, prev, dt, run); if (sink.kind !== 'osc' || run.armed) sink.present(fb); }
function solidFb(r, g, b) { const fb = new Array(COUNT * 3); for (let i = 0; i < COUNT; i++) { fb[i*3]=r; fb[i*3+1]=g; fb[i*3+2]=b; } return fb; }
function manual(fb) { stopLoop(); present(fb, 1); }                      // static frame

function startLoop() { if (loop) return; lastNow = performance.now(); loop = setInterval(tick, 1000 / run.fps); }
function stopLoop() { if (loop) { clearInterval(loop); loop = null; } }
function tick() {
  const now = performance.now(); const rdt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
  const dt = rdt * run.speed; run._lastDt = rdt;   // pattern gets scaled clock; safety uses real time
  t += dt; frame++;
  const fb = engine.renderFrame(t, dt, frame, run.bpm);
  if (fb) present(fb, rdt);
}

function handle(cmd) {
  switch (cmd.action) {
    case 'loadPattern':
      try { const m = engine.loadPattern(cmd.code, cmd.params || {}); run.speed = (cmd.speed != null ? cmd.speed : 1); console.log('  loaded pattern:', m.name || '(unnamed)', 'speed', run.speed); t = 0; frame = 0; startLoop(); }
      catch (e) { console.log('  loadPattern error:', e.message); } break;
    case 'startPattern': startLoop(); break;
    case 'arm': run.armed = true; console.log('  ARMED — OSC output live'); break;
    case 'disarm': run.armed = false; if (sink.releaseAll) sink.releaseAll(); console.log('  DISARMED — released all zones'); break;
    case 'setSpeed': run.speed = (cmd.speed != null ? cmd.speed : 1); break;
    case 'stopPattern': manual(solidFb(0, 0, 0)); break;
    case 'setParam': engine.setParam(cmd.name, cmd.value); break;
    case 'setConfig': Object.assign(run, cmd); delete run.action; if (loop) { stopLoop(); startLoop(); } break;
    // manual commands so the existing control UI also works against the sim:
    case 'solid': case 'live': manual(solidFb(cmd.r | 0, cmd.g | 0, cmd.b | 0)); break;
    case 'blackout': case 'restore': manual(solidFb(0, 0, 0)); break;
    case 'setZone': { const fb = solidFb(0,0,0); const z = cmd.zone | 0; if (z>=0 && z<COUNT){ fb[z*3]=cmd.r|0; fb[z*3+1]=cmd.g|0; fb[z*3+2]=cmd.b|0; } manual(fb); } break;
    default: console.log('  unknown command:', cmd.action);
  }
}

let backoff = 3000;
function connect() {
  console.log('connecting to relay:', RELAY_URL.replace(/token=[^&]+/, 'token=…'));
  const ws = new WebSocket(RELAY_URL);
  let settled = false;
  const giveUp = setTimeout(() => { if (ws.readyState !== 1) { try { ws.terminate(); } catch { try { ws.close(); } catch {} } } }, 12000);
  ws.on('open', () => { clearTimeout(giveUp); backoff = 3000; console.log('connected to droplet relay ✓'); });
  ws.on('message', d => { let c; try { c = JSON.parse(d); } catch { return; } console.log('cmd:', c.action); handle(c); });
  ws.on('close', () => { clearTimeout(giveUp); if (settled) return; settled = true; const d = backoff; backoff = Math.min(Math.round(backoff * 1.5), 15000); console.log(`relay closed; reconnecting in ${d}ms`); setTimeout(connect, d); });
  ws.on('error', e => { console.log('ws error:', e.message); try { ws.close(); } catch {} });
  const hb = setInterval(() => { if (ws.readyState === 1) ws.ping(); else clearInterval(hb); }, 15000);
}

connect();
console.log('open the local display →  http://localhost:' + (cfg.uiPort ?? 8090));
