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
import * as fs from 'fs';
import { resolve } from 'path';

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
  resetFilteredGrid,
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
  private grid: FilteredCannon[] | null = null;
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
  private _stateFile: string;

  constructor(config: Partial<ReceiverConfig> = {}) {
    this.config = { ...DEFAULT_RECEIVER_CONFIG, ...config };
    this._stateFile = resolve(process.cwd(), '.state', 'receiver-last-pattern.json');
  }

  get status(): ReceiverStatus { return this._status; }
  get fallbackActive(): boolean { return this._fallbackActive; }
  get animationState(): AnimationState { return this._animState; }

  /** Raw filtered grid — BEFORE orientation remap. For debug UI. */
  get rawGrid(): FilteredCannon[] | null { return this.grid; }

  /** Lazily create the grid on first command. */
  private ensureGrid(): FilteredCannon[] {
    if (!this.grid) {
      this.grid = createFilteredGrid(this.config.numCannons);
    }
    return this.grid;
  }

  /** Get the current output state (after filtering, orientation remap, and sharding). */
  getOutputState(): CannonState[] {
    const g = this.ensureGrid();
    const full = g.map(c => ({
      h: c.h,
      s: c.s,
      b: c.b
    }));
    const rows = Math.ceil(g.length / this.config.gridColumns);
    const remapped = remapGridForOutput(full, this.config.gridColumns, rows, this._animState);
    const shard = this.config.shard;
    if (!shard) return remapped;
    return remapped.slice(shard.start, shard.end + 1);
  }

  /** Start the receiver — connects input and begins the tick loop. */
  start() {
    if (this._running) return;
    this._running = true;
    this.restoreLastPattern();
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

      // Config-only commands: update state but do NOT create the grid.
      // The receiver must produce zero output until a visual command arrives.
      if (cmd.action === 'keepalive') return;
      if (cmd.action === 'setSmoothness') {
        this.config.alpha = Math.max(0.01, Math.min(1, cmd.value));
        return;
      }
      if (cmd.action === 'setAttack' || cmd.action === 'setOrientation' || cmd.action === 'setShift') {
        handleCommand(this._animState, cmd);
        return;
      }
      if (cmd.action === 'setPatternParam') {
        this.handleSetPatternParam(cmd);
        return;
      }
      if (cmd.action === 'stop' || cmd.action === 'stopPattern') {
        handleCommand(this._animState, cmd);
        this.disposeSandbox();
        this.clearPersistedPattern();
        return;
      }

      // Visual commands: create the grid (if needed) and start output
      const grid = this.ensureGrid();

      if (cmd.action === 'paint') {
        handleCommand(this._animState, cmd);
        applyPaint(grid, cmd.cells, this._animState.attack);
      } else if (cmd.action === 'evalPattern') {
        resetFilteredGrid(grid);
        handleCommand(this._animState, cmd);
        this.handleEvalPattern(cmd);
        this.persistPattern(cmd);
      } else if (cmd.action === 'clear') {
        handleCommand(this._animState, cmd);
        this.disposeSandbox();
        resetFilteredGrid(grid);
        this.clearPersistedPattern();
      } else {
        // setAnimation, setScene — LP filter handles smooth transition
        handleCommand(this._animState, cmd);
        this.persistCommand(cmd);
      }
    });

    input.on('disconnected', () => {
      this._status = 'reconnecting';
      console.log('\n  \u25C8 Input disconnected');
    });

    input.connect();
  }

  private _tickErrors = 0;

  private startTickLoop() {
    this.tickTimer = setInterval(() => {
      try {
        this.tick++;

        // No grid yet — receiver is idle, waiting for first command
        if (!this.grid) return;

        const now = Date.now();
        const timeSinceData = now - this.lastDataAt;

        // Check if we should switch to fallback — but only if nothing
        // is actively running locally (pattern, animation, or scene).
        const hasLocalVisual = this._animState.patternActive ||
          !!this._animState.currentAnimation ||
          !!this._animState.currentScene;

        if (timeSinceData > this.config.fallbackDelay && !this._fallbackActive && !hasLocalVisual) {
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
        this._tickErrors = 0;
      } catch (err) {
        this._tickErrors++;
        if (this._tickErrors <= 3) {
          console.error(`  ✖ Tick error (${this._tickErrors}):`, err instanceof Error ? err.message : String(err));
        }
        if (this._tickErrors === 3) {
          console.error('  ✖ Suppressing further tick errors (still running)');
        }
      }
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

  // ── State persistence ────────────────────────────────────────

  private persistPattern(cmd: EvalPatternCommand): void {
    try {
      const dir = resolve(process.cwd(), '.state');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this._stateFile, JSON.stringify({
        type: 'evalPattern',
        code: cmd.code,
        params: cmd.params || {}
      }), 'utf8');
    } catch { /* best effort */ }
  }

  private persistCommand(cmd: CommandMessage): void {
    try {
      const dir = resolve(process.cwd(), '.state');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this._stateFile, JSON.stringify({
        type: cmd.action,
        name: (cmd as any).name
      }), 'utf8');
    } catch { /* best effort */ }
  }

  private clearPersistedPattern(): void {
    try {
      if (fs.existsSync(this._stateFile)) fs.unlinkSync(this._stateFile);
    } catch { /* best effort */ }
  }

  private restoreLastPattern(): void {
    try {
      if (!fs.existsSync(this._stateFile)) return;
      const raw = JSON.parse(fs.readFileSync(this._stateFile, 'utf8'));
      if (!raw.type) return;

      const grid = this.ensureGrid();
      resetFilteredGrid(grid);

      if (raw.type === 'evalPattern' && raw.code) {
        console.log('  ◈ Restoring last pattern from disk');
        this._animState.currentAnimation = null;
        this._animState.currentScene = null;
        this._animState.patternActive = true;
        this.handleEvalPattern({ type: 'command', action: 'evalPattern', code: raw.code, params: raw.params || {} });
      } else if (raw.type === 'setAnimation' && raw.name) {
        console.log(`  ◈ Restoring last animation from disk: ${raw.name}`);
        this._animState.currentAnimation = raw.name;
        this._animState.currentScene = null;
        this._animState.patternActive = false;
      } else if (raw.type === 'setScene' && raw.name) {
        console.log(`  ◈ Restoring last scene from disk: ${raw.name}`);
        this._animState.currentScene = raw.name;
        this._animState.currentAnimation = null;
        this._animState.patternActive = false;
      }
    } catch { /* ignore — will get fresh command from server */ }
  }
}
