/**
 * The Receiver — the brain of the Illuminate installation.
 *
 * Connects to the simulator upstream, runs its own independent low-pass
 * filter, and outputs smooth state to hardware (OSC/BEYOND).
 *
 * On signal loss, smoothly transitions to a 3D sine wave fallback.
 * When signal returns, smoothly blends back to the received state.
 */

import { WebSocket } from 'ws';

import { computeFallbackFrame, DEFAULT_FALLBACK_CONFIG,FallbackConfig } from './fallback';
import {
  applyUpstreamState,
  CannonState,
  createFilteredGrid,
  DEFAULT_RECEIVER_ALPHA,
  FilteredCannon,
  tickFilter} from './filter';
import { createStubBridge,OscBridge } from './osc';

export interface ReceiverConfig {
  /** Upstream simulator WebSocket URL. */
  simulatorUrl: string;
  /** Low-pass filter alpha (lower = smoother). Default 0.06. */
  alpha: number;
  /** Ms of no data before switching to fallback. Default 3000. */
  fallbackDelay: number;
  /** Fallback animation config. */
  fallback: FallbackConfig;
  /** OSC bridge (or stub). */
  bridge: OscBridge;
  /** Tick rate in ms (default 1000/60 ≈ 16.67ms). */
  tickMs: number;
}

export const DEFAULT_RECEIVER_CONFIG: ReceiverConfig = {
  simulatorUrl: 'ws://localhost:3000',
  alpha: DEFAULT_RECEIVER_ALPHA,
  fallbackDelay: 3000,
  fallback: DEFAULT_FALLBACK_CONFIG,
  bridge: createStubBridge(),
  tickMs: 1000 / 60
};

export type ReceiverStatus = 'connected' | 'reconnecting' | 'fallback';

export interface ReceiverState {
  status: ReceiverStatus;
  grid: FilteredCannon[];
  tick: number;
  lastDataAt: number;
  fallbackActive: boolean;
}

export class Receiver {
  private config: ReceiverConfig;
  private grid: FilteredCannon[];
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private lastDataAt = Date.now();
  private _status: ReceiverStatus = 'reconnecting';
  private _fallbackActive = false;
  private _running = false;

  constructor(config: Partial<ReceiverConfig> = {}) {
    this.config = { ...DEFAULT_RECEIVER_CONFIG, ...config };
    this.grid = createFilteredGrid();
  }

  get status(): ReceiverStatus { return this._status; }
  get fallbackActive(): boolean { return this._fallbackActive; }

  /** Get the current output state (after filtering). */
  getOutputState(): CannonState[] {
    return this.grid.map(c => ({
      h: c.h,
      s: c.s,
      b: c.b
    }));
  }

  /** Start the receiver — connects upstream and begins the tick loop. */
  start() {
    if (this._running) return;
    this._running = true;
    this.connectUpstream();
    this.startTickLoop();
    console.log('  ◈ Receiver started');
  }

  /** Stop the receiver — disconnects and stops the tick loop. */
  stop() {
    this._running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.config.bridge.close();
    console.log('  ◈ Receiver stopped');
  }

  private connectUpstream() {
    try {
      this.ws = new WebSocket(this.config.simulatorUrl);

      this.ws.on('open', () => {
        this._status = 'connected';
        this.lastDataAt = Date.now();
        console.log('  ◈ Connected to simulator');
      });

      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'state' && Array.isArray(msg.grid)) {
            this.lastDataAt = Date.now();
            applyUpstreamState(this.grid, msg.grid);

            // If we were in fallback, we'll smoothly blend back
            // because the targets change and the LP filter converges
            if (this._fallbackActive) {
              console.log('\n  ◈ Signal restored — blending back from fallback');
              this._fallbackActive = false;
            }
          }
        } catch (_e) {
          // ignore malformed
        }
      });

      this.ws.on('close', () => {
        this._status = 'reconnecting';
        console.log('\n  ◈ Upstream disconnected');
        this.scheduleReconnect();
      });

      this.ws.on('error', () => {
        this.scheduleReconnect();
      });
    } catch (_e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this._running) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this._running) this.connectUpstream();
    }, 2000);
  }

  private startTickLoop() {
    this.tickTimer = setInterval(() => {
      this.tick++;
      const now = Date.now();
      const timeSinceData = now - this.lastDataAt;

      // Check if we should switch to fallback
      if (timeSinceData > this.config.fallbackDelay && !this._fallbackActive) {
        this._fallbackActive = true;
        this._status = 'fallback';
        console.log('\n  ◈ Signal lost — entering sine wave fallback');
      }

      // If fallback is active, compute sine wave targets
      if (this._fallbackActive) {
        computeFallbackFrame(this.grid, this.tick, this.config.fallback);
      }

      // Always tick the low-pass filter — this ensures smooth output
      // whether receiving data, transitioning to fallback, or in fallback
      tickFilter(this.grid, this.config.alpha);

      // Send filtered output to hardware bridge
      this.config.bridge.send(this.getOutputState());
    }, this.config.tickMs);
  }
}
