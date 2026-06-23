/**
 * Raw OSC sink — drives BEYOND livecontrol over UDP without the node-osc
 * dependency. Absorbs the improvements from the dump's OscSink:
 *
 *   - Per-channel diff with configurable threshold (skip unchanged)
 *   - Burst guard: maxPerFlush cap per frame (BEYOND drops bursts)
 *   - Arm gate: won't emit until armed
 *   - Alpha semantics: alpha=255 on take, alpha=0 on release
 *   - Accepts raw RGB framebuffer (no HSB→RGB conversion needed)
 *   - Zero external dependencies (uses dgram + Buffer directly)
 */

import dgram from 'dgram';

export interface RawOscSinkConfig {
  /** UDP target host. Default '127.0.0.1'. */
  host?: string;
  /** UDP target port. Default 8000. */
  port?: number;
  /** Number of cannons/zones. Default 49. */
  count?: number;
  /**
   * Map of grid index → BEYOND zone index.
   * If null/undefined, identity mapping (grid[i] → zone i).
   */
  zoneMap?: number[] | null;
  /**
   * Scale factor for RGB values.
   * 1 = send as 0..1 floats (BEYOND fader convention).
   * 255 = send as raw 0..255.
   * Default 1.
   */
  scale?: number;
  /** Per-channel diff threshold. Skip if |delta| < thresh. Default 2. */
  thresh?: number;
  /** Max OSC messages per present() call. Default 180. */
  maxPerFlush?: number;
}

/** Encode a single OSC message: address + one float value. */
function oscFloat(address: string, value: number): Buffer {
  const a = Buffer.from(address + '\0', 'ascii');
  const ap = Buffer.alloc(Math.ceil(a.length / 4) * 4);
  a.copy(ap);
  const tt = Buffer.from(',f\0\0', 'ascii');
  const fb = Buffer.alloc(4);
  fb.writeFloatBE(value, 0);
  return Buffer.concat([ap, tt, fb]);
}

export interface OscSinkHandle {
  kind: 'osc';
  /** Send a frame to BEYOND. fb is a flat RGB array (3 values per pixel, 0..255). */
  present(fb: number[]): void;
  /** Release all zones (send alpha=0 for every active zone). */
  releaseAll(): void;
  /** Number of connected "clients" (always 1 for UDP). */
  clientCount(): number;
  /** Close the UDP socket. */
  close(): void;
  /** Arm the sink — allow it to start sending OSC. */
  arm(): void;
  /** Disarm the sink — stop sending, release all zones. */
  disarm(): void;
  /** Whether the sink is currently armed. */
  readonly armed: boolean;
}

/**
 * Create a raw OSC sink for BEYOND livecontrol.
 *
 * Usage:
 *   const sink = createRawOscSink({ host: '192.168.1.100', port: 8000 });
 *   sink.arm();
 *   // per-frame:
 *   sink.present(rgbFramebuffer);
 *   // on shutdown:
 *   sink.releaseAll();
 *   sink.close();
 */
export function createRawOscSink(config: RawOscSinkConfig = {}): OscSinkHandle {
  const host = config.host ?? '127.0.0.1';
  const port = config.port ?? 8000;
  const count = config.count ?? 49;
  const map = config.zoneMap ?? Array.from({ length: count }, (_, i) => i);
  const scale = config.scale ?? 1;
  const thresh = config.thresh ?? 2;
  const maxPerFlush = config.maxPerFlush ?? 180;

  const sock = dgram.createSocket('udp4');
  const last = new Array<number>(count * 3).fill(-1);
  const active = new Array<boolean>(count).fill(false);
  let _armed = false;
  let sentThisFlush = 0;

  function emit(zone: number, ch: string, v: number): void {
    const val = (ch === 'alpha' || ch === 'Brightness')
      ? v
      : (v / 255) * scale;
    sock.send(oscFloat(`/beyond/zone/${zone}/livecontrol/${ch}`, val), port, host);
    sentThisFlush++;
  }

  const clamp = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

  return {
    kind: 'osc',

    get armed(): boolean { return _armed; },

    arm(): void { _armed = true; },

    disarm(): void {
      if (_armed) {
        this.releaseAll();
        _armed = false;
      }
    },

    present(fb: number[]): void {
      if (!_armed) return;
      sentThisFlush = 0;

      for (let i = 0; i < count; i++) {
        const zone = map[i];
        if (zone == null) continue;

        const o = i * 3;
        const r = clamp(fb[o]);
        const g = clamp(fb[o + 1]);
        const b = clamp(fb[o + 2]);
        const on = (r + g + b) > thresh;

        if (on) {
          if (!active[i]) {
            emit(zone, 'Brightness', 255);
            emit(zone, 'alpha', 255);
            active[i] = true;
          }
          if (Math.abs(r - last[o]) > thresh) {
            emit(zone, 'red', r);
            last[o] = r;
          }
          if (Math.abs(g - last[o + 1]) > thresh) {
            emit(zone, 'green', g);
            last[o + 1] = g;
          }
          if (Math.abs(b - last[o + 2]) > thresh) {
            emit(zone, 'blue', b);
            last[o + 2] = b;
          }
        } else if (active[i]) {
          emit(zone, 'red', 0);
          emit(zone, 'green', 0);
          emit(zone, 'blue', 0);
          emit(zone, 'alpha', 0);
          active[i] = false;
          last[o] = last[o + 1] = last[o + 2] = 0;
        }

        if (sentThisFlush >= maxPerFlush) break;
      }
    },

    releaseAll(): void {
      for (let i = 0; i < count; i++) {
        const zone = map[i];
        if (zone == null) continue;
        emit(zone, 'alpha', 0);
        active[i] = false;
        const o = i * 3;
        last[o] = last[o + 1] = last[o + 2] = -1;
      }
    },

    clientCount(): number { return 1; },

    close(): void {
      try { sock.close(); } catch { /* ignore */ }
    }
  };
}
