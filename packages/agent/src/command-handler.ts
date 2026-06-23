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
  readonly running: boolean;
}

/**
 * Create a render loop that ticks the pattern engine and presents to the sink.
 */
export function createRenderLoop(
  deps: CommandHandlerDeps,
  count: number,
): RenderLoop {
  const { engine, sink, state } = deps;
  const prev = new Array<number>(count * 3).fill(0);
  let t = 0;
  let frame = 0;
  let lastNow = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  function tick(): void {
    const now = performance.now();
    const rdt = Math.min(0.1, (now - lastNow) / 1000);
    lastNow = now;
    const dt = rdt * state.speed;
    t += dt;
    frame++;

    const fb = engine.renderFrame(t, dt, frame, state.bpm);
    if (fb) {
      applySafety(fb, prev, rdt, {
        brightnessCap: state.brightnessCap,
        maxFlashHz: state.maxFlashHz,
      });
      if (sink.kind !== 'osc' || state.armed) {
        sink.present(fb);
      }
      // Update prev for next safety pass
      for (let i = 0; i < fb.length; i++) prev[i] = fb[i];
    }
  }

  return {
    start(): void {
      if (timer) return;
      lastNow = performance.now();
      timer = setInterval(tick, 1000 / state.fps);
    },
    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    get running(): boolean {
      return timer !== null;
    },
  };
}

/**
 * Create a command handler that processes relay commands.
 */
export function createCommandHandler(
  deps: CommandHandlerDeps,
  loop: RenderLoop,
  count: number,
): (cmd: AgentCommand) => void {
  const { engine, sink, state, onLog } = deps;
  const log = onLog ?? console.log;

  function solidFb(r: number, g: number, b: number): number[] {
    const fb = new Array<number>(count * 3);
    for (let i = 0; i < count; i++) {
      fb[i * 3] = r;
      fb[i * 3 + 1] = g;
      fb[i * 3 + 2] = b;
    }
    return fb;
  }

  function manual(fb: number[]): void {
    loop.stop();
    if (sink.kind !== 'osc' || state.armed) {
      sink.present(fb);
    }
  }

  return function handle(cmd: AgentCommand): void {
    switch (cmd.action) {
      case 'loadPattern':
        try {
          const m = engine.loadPattern(
            cmd.code ?? '',
            (cmd.params as Record<string, unknown>) ?? {},
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

      case 'stopPattern':
        manual(solidFb(0, 0, 0));
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
        manual(solidFb(cmd.r ?? 0, cmd.g ?? 0, cmd.b ?? 0));
        break;

      case 'blackout':
      case 'restore':
        manual(solidFb(0, 0, 0));
        break;

      case 'setZone': {
        const fb = solidFb(0, 0, 0);
        const z = cmd.zone ?? 0;
        if (z >= 0 && z < count) {
          fb[z * 3] = cmd.r ?? 0;
          fb[z * 3 + 1] = cmd.g ?? 0;
          fb[z * 3 + 2] = cmd.b ?? 0;
        }
        manual(fb);
        break;
      }

      default:
        log(`unknown command: ${cmd.action}`);
    }
  };
}
