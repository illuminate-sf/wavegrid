/**
 * Command handler — processes commands from the relay and dispatches
 * to the pattern engine, sink, and render loop.
 */

import type { PatternEngine } from '@wavegrid/patterns';
import { applySafety } from '@wavegrid/patterns';

import type { AgentCommand, RuntimeState, Sink } from './types';

export interface CommandHandlerDeps {
  engine: PatternEngine;
  sink: Sink;
  state: RuntimeState;
  onLog?: (msg: string) => void;
}

export interface RenderLoop {
  start(): void;
  stop(): void;
  /** Directly set a zone in the display buffer (for paint). */
  setZone(index: number, r: number, g: number, b: number): void;
  /** Set all zones to a solid color in the display buffer. */
  setSolid(r: number, g: number, b: number): void;
  readonly running: boolean;
}

/**
 * Create a render loop that ticks the pattern engine and presents to the sink.
 *
 * The loop maintains two buffers:
 *   - target: raw pattern output (updated every frame by the engine)
 *   - display: what's actually shown (LP-filtered toward target)
 *
 * The LP filter (controlled by state.fade) produces smooth transitions
 * identical to the old simulator's tickGrid() / exponential smoothing.
 */
export function createRenderLoop(
  deps: CommandHandlerDeps,
  count: number
): RenderLoop {
  const { engine, sink, state } = deps;
  const len = count * 3;
  const display = new Array<number>(len).fill(0);
  const target = new Array<number>(len).fill(0);
  let t = 0;
  let frame = 0;
  let lastNow = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  // When true, pattern engine drives the target buffer
  let patternActive = true;

  function tick(): void {
    const now = performance.now();
    const rdt = Math.min(0.1, (now - lastNow) / 1000);
    lastNow = now;
    const dt = rdt * state.speed;
    t += dt;
    frame++;

    // Update target from pattern engine
    if (patternActive) {
      const fb = engine.renderFrame(t, dt, frame, state.bpm);
      if (fb) {
        for (let i = 0; i < len && i < fb.length; i++) target[i] = fb[i];
      }
    }

    // Exponential LP filter: display lerps toward target
    const alpha = state.fade;
    for (let i = 0; i < len; i++) {
      const d = target[i] - display[i];
      if (Math.abs(d) < 0.5) {
        display[i] = target[i];
      } else {
        display[i] += d * alpha;
      }
    }

    // Safety limiter on the display buffer
    const out = display.slice();
    applySafety(out, null, rdt, {
      brightnessCap: state.brightnessCap,
      maxFlashHz: state.maxFlashHz
    });

    if (sink.kind !== 'osc' || state.armed) {
      sink.present(out);
    }
  }

  return {
    start(): void {
      if (timer) return;
      patternActive = true;
      lastNow = performance.now();
      timer = setInterval(tick, 1000 / state.fps);
    },
    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    setZone(index: number, r: number, g: number, b: number): void {
      if (index < 0 || index >= count) return;
      const o = index * 3;
      target[o] = r;
      target[o + 1] = g;
      target[o + 2] = b;
      patternActive = false;
      // Ensure the loop is running so LP filter still ticks
      if (!timer) {
        lastNow = performance.now();
        timer = setInterval(tick, 1000 / state.fps);
      }
    },
    setSolid(r: number, g: number, b: number): void {
      for (let i = 0; i < count; i++) {
        const o = i * 3;
        target[o] = r;
        target[o + 1] = g;
        target[o + 2] = b;
      }
      patternActive = false;
      if (!timer) {
        lastNow = performance.now();
        timer = setInterval(tick, 1000 / state.fps);
      }
    },
    get running(): boolean {
      return timer !== null;
    }
  };
}

/**
 * Create a command handler that processes relay commands.
 */
export function createCommandHandler(
  deps: CommandHandlerDeps,
  loop: RenderLoop,
  count: number
): (cmd: AgentCommand) => void {
  const { engine, sink, state, onLog } = deps;
  const log = onLog ?? console.log;

  return function handle(cmd: AgentCommand): void {
    switch (cmd.action) {
    case 'loadPattern':
      try {
        const m = engine.loadPattern(
          cmd.code ?? '',
          (cmd.params as Record<string, unknown>) ?? {}
        );
        state.speed = cmd.speed ?? 1;
        log(`loaded pattern: ${m.name || '(unnamed)'} speed ${state.speed}`);
        loop.start();
      } catch (e: unknown) {
        log(`loadPattern error: ${(e as Error).message}`);
      }
      break;

    case 'startPattern':
      loop.start();
      break;

    case 'arm':
      state.armed = true;
      log('ARMED — OSC output live');
      break;

    case 'disarm':
      state.armed = false;
      if (sink.releaseAll) sink.releaseAll();
      log('DISARMED — released all zones');
      break;

    case 'setSpeed':
      state.speed = cmd.speed ?? 1;
      break;

    case 'setFade':
      state.fade = Math.max(0.002, Math.min(1,
        (cmd.fade as number) ?? state.fade
      ));
      break;

    case 'setBrightnessCap':
      state.brightnessCap = Math.max(0, Math.min(1,
        (cmd.brightnessCap as number) ?? state.brightnessCap
      ));
      break;

    case 'stopPattern':
      loop.setSolid(0, 0, 0);
      break;

    case 'setParam':
      if (cmd.name) engine.setParam(cmd.name, cmd.value);
      break;

    case 'setConfig':
      Object.assign(state, cmd);
      delete (state as unknown as Record<string, unknown>).action;
      if (loop.running) {
        loop.stop();
        loop.start();
      }
      break;

    case 'solid':
    case 'live':
      loop.setSolid(cmd.r ?? 0, cmd.g ?? 0, cmd.b ?? 0);
      break;

    case 'blackout':
    case 'restore':
      loop.setSolid(0, 0, 0);
      break;

    case 'setZone':
      loop.setZone(cmd.zone ?? 0, cmd.r ?? 0, cmd.g ?? 0, cmd.b ?? 0);
      break;

    default:
      log(`unknown command: ${cmd.action}`);
    }
  };
}
