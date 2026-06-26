/**
 * The Receiver — the brain of the Illuminate installation.
 *
 * A pure state engine that:
 *   1. Receives commands from an InputAdapter (upstream source)
 *   2. Runs animations locally at 60fps
 *   3. Applies a low-pass filter (smooth, never jolts)
 *   4. Falls back to 3D sine waves on signal loss
 *   5. Sends filtered output to an OutputAdapter (hardware target)
 *
 * Both input and output are pluggable adapters — swap them to connect
 * to any protocol or hardware without modifying the receiver core.
 */

import { setTarget } from '@wavegrid/animations';

import { ConsoleOutput, InputAdapter, OutputAdapter, WebSocketInput } from './adapters';
import { AnimationState, applyPaint, createDefaultAnimationState, handleCommand, remapGridForOutput, tickCommandMode } from './command-engine';
import { CommandMessage, EvalPatternCommand, SetPatternParamCommand } from './command-types';
import { computeFallbackFrame, DEFAULT_FALLBACK_CONFIG, FallbackConfig } from './fallback';
import {
  CannonState,
  createFilteredGrid,
  DEFAULT_GRID_COLUMNS,
  DEFAULT_NUM_CANNONS,
  DEFAULT_RECEIVER_ALPHA,
  FilteredCannon,
  tickFilter
} from './filter';
import { createSandboxEngine, SandboxEngine } from './sandbox-engine';

export interface ShardConfig {
  /** First cannon index (inclusive). */
  start: number;
  /** Last cannon index (inclusive). */
  end: number;
}

export interface ReceiverConfig {
  /** Input adapter — where state comes from. */
  input: InputAdapter;
  /** Output adapter — where filtered state goes. */
  output: OutputAdapter;
  /** Low-pass filter alpha (lower = smoother). Default 0.06. */
  alpha: number;
  /** Ms of no data before switching to fallback. Default 3000. */
  fallbackDelay: number;
  /** Fallback animation config. */
  fallback: FallbackConfig;
  /** Tick rate in ms (default 1000/60 ~ 16.67ms). */
  tickMs: number;
  /**
   * Optional shard — only output cannons in this index range.
   * When omitted, the receiver outputs all cannons.
   * The LP filter still processes the full grid; sharding only
   * affects which cannons are sent to the output adapter.
   */
  shard?: ShardConfig;
  /** Total number of cannons in the grid. Default 49. */
  numCannons: number;
  /** Number of columns in the grid (for fallback spatial mapping). Default 7. */
  gridColumns: number;
}

export const DEFAULT_RECEIVER_CONFIG: ReceiverConfig = {
  input: new WebSocketInput({ url: 'ws://localhost:3000' }),
  output: new ConsoleOutput(),
  alpha: DEFAULT_RECEIVER_ALPHA,
  fallbackDelay: 3000,
  fallback: DEFAULT_FALLBACK_CONFIG,
  tickMs: 1000 / 60,
  numCannons: DEFAULT_NUM_CANNONS,
  gridColumns: DEFAULT_GRID_COLUMNS
};

export type ReceiverStatus = 'connected' | 'reconnecting' | 'fallback';

export interface ReceiverState {
  status: ReceiverStatus;
  grid: FilteredCannon[];
  tick: number;
  lastDataAt: number;
  fallbackActive: boolean;
  animationState: AnimationState;
}

export class Receiver {
  private config: ReceiverConfig;
  private grid: FilteredCannon[];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private lastDataAt = Date.now();
  private _status: ReceiverStatus = 'reconnecting';
  private _fallbackActive = false;
  private _running = false;
  private _animState: AnimationState = createDefaultAnimationState();
  private _sandbox: SandboxEngine | null = null;
  private _sandboxReady: Promise<SandboxEngine> | null = null;
  private _patternStartTime = 0;
  private _patternFrame = 0;

  constructor(config: Partial<ReceiverConfig> = {}) {
    this.config = { ...DEFAULT_RECEIVER_CONFIG, ...config };
    this.grid = createFilteredGrid(this.config.numCannons);
  }

  get status(): ReceiverStatus { return this._status; }
  get fallbackActive(): boolean { return this._fallbackActive; }
  get animationState(): AnimationState { return this._animState; }

  /** Get the current output state (after filtering, orientation remap, and sharding). */
  getOutputState(): CannonState[] {
    const full = this.grid.map(c => ({
      h: c.h,
      s: c.s,
      b: c.b
    }));
    const rows = Math.ceil(this.grid.length / this.config.gridColumns);
    const remapped = remapGridForOutput(full, this.config.gridColumns, rows, this._animState);
    const shard = this.config.shard;
    if (!shard) return remapped;
    return remapped.slice(shard.start, shard.end + 1);
  }

  /** Start the receiver — connects input and begins the tick loop. */
  start() {
    if (this._running) return;
    this._running = true;
    this.bindInput();
    this.startTickLoop();
    console.log('  \u25C8 Receiver started');
  }

  /** Stop the receiver — disconnects and stops the tick loop. */
  stop() {
    this._running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.config.input.disconnect();
    this.config.output.close();
    console.log('  \u25C8 Receiver stopped');
  }

  private bindInput() {
    const input = this.config.input;

    input.on('connected', () => {
      this._status = 'connected';
      this.lastDataAt = Date.now();
      console.log('  \u25C8 Input connected');
    });

    input.on('command', (cmd: CommandMessage) => {
      this.lastDataAt = Date.now();
      if (this._fallbackActive) {
        console.log('\n  \u25C8 Signal restored \u2014 exiting fallback');
        this._fallbackActive = false;
      }

      // Handle paint commands directly (they write to grid)
      if (cmd.action === 'paint') {
        handleCommand(this._animState, cmd);
        applyPaint(this.grid, cmd.cells, this._animState.attack);
      } else if (cmd.action === 'setSmoothness') {
        this.config.alpha = Math.max(0.01, Math.min(1, cmd.value));
      } else if (cmd.action === 'evalPattern') {
        handleCommand(this._animState, cmd);
        this.handleEvalPattern(cmd);
      } else if (cmd.action === 'setPatternParam') {
        this.handleSetPatternParam(cmd);
      } else if (cmd.action === 'stopPattern') {
        handleCommand(this._animState, cmd);
        this.disposeSandbox();
      } else if (cmd.action === 'clear' || cmd.action === 'stop') {
        handleCommand(this._animState, cmd);
        this.disposeSandbox();
      } else {
        handleCommand(this._animState, cmd);
      }
    });

    input.on('disconnected', () => {
      this._status = 'reconnecting';
      console.log('\n  \u25C8 Input disconnected');
    });

    input.connect();
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
        console.log('\n  \u25C8 Signal lost \u2014 entering sine wave fallback');
      }

      if (this._fallbackActive) {
        computeFallbackFrame(this.grid, this.tick, this.config.fallback, this.config.gridColumns);
      } else {
        if (this._animState.patternActive && this._sandbox?.loaded) {
          this.tickPattern();
        }
        tickCommandMode(this.grid, this._animState, this.config.gridColumns);
      }

      // Always tick the low-pass filter — this ensures smooth output
      // whether receiving data, transitioning to fallback, or in fallback
      tickFilter(this.grid, this.config.alpha);

      // Send filtered output to the output adapter
      this.config.output.send(this.getOutputState());
    }, this.config.tickMs);
  }

  // ── QuickJS sandbox pattern methods ─────────────────────────

  private async ensureSandbox(): Promise<SandboxEngine> {
    if (this._sandbox) return this._sandbox;
    if (this._sandboxReady) return this._sandboxReady;

    const cols = this.config.gridColumns;
    const rows = Math.ceil(this.config.numCannons / cols);

    this._sandboxReady = createSandboxEngine(cols, rows, undefined, (msg) => {
      console.log('  ◈ [pattern]', msg);
    });

    this._sandbox = await this._sandboxReady;
    this._sandboxReady = null;
    return this._sandbox;
  }

  private handleEvalPattern(cmd: EvalPatternCommand): void {
    this.ensureSandbox()
      .then((sb) => {
        try {
          const meta = sb.loadPattern(cmd.code, cmd.params);
          this._patternStartTime = Date.now();
          this._patternFrame = 0;
          console.log('  ◈ Pattern loaded:', meta.name || '(anonymous)');
        } catch (e: unknown) {
          this._animState.patternActive = false;
          console.error('  ◈ Pattern load error:', e instanceof Error ? e.message : String(e));
        }
      })
      .catch((e: unknown) => {
        this._animState.patternActive = false;
        console.error('  ◈ Sandbox init error:', e instanceof Error ? e.message : String(e));
      });
  }

  private handleSetPatternParam(cmd: SetPatternParamCommand): void {
    if (this._sandbox?.loaded) {
      try {
        this._sandbox.setParam(cmd.name, cmd.value);
      } catch (e: unknown) {
        console.error('  ◈ setParam error:', e instanceof Error ? e.message : String(e));
      }
    }
  }

  private tickPattern(): void {
    if (!this._sandbox?.loaded) return;

    const now = Date.now();
    const t = (now - this._patternStartTime) / 1000;
    const dt = 1 / 60;
    this._patternFrame++;

    const frame = this._sandbox.renderFrame(t, dt, this._patternFrame);
    if (!frame) return;

    const attack = this._animState.attack;
    for (let i = 0; i < frame.length && i < this.grid.length; i++) {
      setTarget(this.grid, i, frame[i].h, frame[i].s, frame[i].b, attack);
    }
  }

  private disposeSandbox(): void {
    if (this._sandbox) {
      this._sandbox.dispose();
      this._sandbox = null;
    }
    this._sandboxReady = null;
  }
}
