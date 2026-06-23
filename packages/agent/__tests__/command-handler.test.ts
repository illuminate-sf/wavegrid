import { createEngine } from '@wavegrid/patterns';
import type { PatternEngine } from '@wavegrid/patterns';
import type { RuntimeState, Sink } from '../src/types';
import { createCommandHandler, createRenderLoop } from '../src/command-handler';

jest.setTimeout(30000); // WASM init can be slow

const SIMPLE_PATTERN = `
const meta = { name: 'Test Pattern' };
function render(ctx) {
  for (let i = 0; i < ctx.count; i++) {
    ctx.setHSV(i, (ctx.t * 90 + i * 10) % 360, 100, 80);
  }
}
`;

function makeState(): RuntimeState {
  return { fps: 60, bpm: 120, speed: 1, brightnessCap: 1, maxFlashHz: 0, fade: 1, armed: false };
}

function makeSink(): Sink & { frames: number[][]; released: boolean } {
  return {
    kind: 'ui',
    frames: [],
    released: false,
    present(fb: number[]) { this.frames.push([...fb]); },
    releaseAll() { this.released = true; },
  };
}

describe('createCommandHandler', () => {
  let engine: PatternEngine;

  beforeAll(async () => {
    engine = await createEngine({ grid: { cols: 3, rows: 3, count: 9 } });
  });

  afterAll(() => { engine.dispose(); });

  it('handles loadPattern command', () => {
    const sink = makeSink();
    const state = makeState();
    const loop = createRenderLoop({ engine, sink, state }, 9);
    const handle = createCommandHandler({ engine, sink, state }, loop, 9);

    handle({ action: 'loadPattern', code: SIMPLE_PATTERN, params: {} });
    expect(engine.loaded).toBe(true);
    expect(engine.meta.name).toBe('Test Pattern');
    loop.stop();
  });

  it('handles arm/disarm', () => {
    const sink = makeSink();
    const state = makeState();
    const loop = createRenderLoop({ engine, sink, state }, 9);
    const handle = createCommandHandler({ engine, sink, state }, loop, 9);

    expect(state.armed).toBe(false);
    handle({ action: 'arm' });
    expect(state.armed).toBe(true);
    handle({ action: 'disarm' });
    expect(state.armed).toBe(false);
    expect(sink.released).toBe(true);
  });

  it('handles setSpeed', () => {
    const sink = makeSink();
    const state = makeState();
    const loop = createRenderLoop({ engine, sink, state }, 9);
    const handle = createCommandHandler({ engine, sink, state }, loop, 9);

    handle({ action: 'setSpeed', speed: 2.5 });
    expect(state.speed).toBe(2.5);
  });

  it('handles setFade', () => {
    const sink = makeSink();
    const state = makeState();
    const loop = createRenderLoop({ engine, sink, state }, 9);
    const handle = createCommandHandler({ engine, sink, state }, loop, 9);

    handle({ action: 'setFade', fade: 0.05 });
    expect(state.fade).toBeCloseTo(0.05);
    // Clamps below minimum
    handle({ action: 'setFade', fade: 0.0001 });
    expect(state.fade).toBeCloseTo(0.002);
  });

  it('handles solid command (LP-filtered)', async () => {
    const sink = makeSink();
    const state = makeState();
    // fade=1 means instant (no smoothing)
    state.fade = 1;
    const loop = createRenderLoop({ engine, sink, state }, 9);
    const handle = createCommandHandler({ engine, sink, state }, loop, 9);

    handle({ action: 'solid', r: 255, g: 0, b: 128 });
    // solid now starts the render loop; wait for a frame
    await new Promise(r => setTimeout(r, 100));
    loop.stop();

    expect(sink.frames.length).toBeGreaterThan(0);
    const fb = sink.frames[sink.frames.length - 1];
    expect(fb[0]).toBe(255);
    expect(fb[1]).toBe(0);
    expect(fb[2]).toBe(128);
  });

  it('handles blackout command', async () => {
    const sink = makeSink();
    const state = makeState();
    state.fade = 1;
    const loop = createRenderLoop({ engine, sink, state }, 9);
    const handle = createCommandHandler({ engine, sink, state }, loop, 9);

    handle({ action: 'blackout' });
    await new Promise(r => setTimeout(r, 100));
    loop.stop();

    expect(sink.frames.length).toBeGreaterThan(0);
    const fb = sink.frames[sink.frames.length - 1];
    expect(fb.every(v => v === 0)).toBe(true);
  });

  it('handles setZone command', async () => {
    const sink = makeSink();
    const state = makeState();
    state.fade = 1;
    const loop = createRenderLoop({ engine, sink, state }, 9);
    const handle = createCommandHandler({ engine, sink, state }, loop, 9);

    handle({ action: 'setZone', zone: 2, r: 100, g: 200, b: 50 });
    await new Promise(r => setTimeout(r, 100));
    loop.stop();

    expect(sink.frames.length).toBeGreaterThan(0);
    const fb = sink.frames[sink.frames.length - 1];
    // Zone 2 should be (100, 200, 50)
    expect(fb[6]).toBe(100);
    expect(fb[7]).toBe(200);
    expect(fb[8]).toBe(50);
    // Zone 0 should be (0, 0, 0)
    expect(fb[0]).toBe(0);
    expect(fb[1]).toBe(0);
    expect(fb[2]).toBe(0);
  });

  it('handles stopPattern command', async () => {
    const sink = makeSink();
    const state = makeState();
    state.fade = 1;
    const loop = createRenderLoop({ engine, sink, state }, 9);
    const handle = createCommandHandler({ engine, sink, state }, loop, 9);

    // Start a pattern first
    handle({ action: 'loadPattern', code: SIMPLE_PATTERN });
    expect(loop.running).toBe(true);

    handle({ action: 'stopPattern' });
    // stopPattern now sets target to black; loop keeps running for LP fade
    await new Promise(r => setTimeout(r, 100));
    loop.stop();

    const lastFb = sink.frames[sink.frames.length - 1];
    expect(lastFb.every(v => v === 0)).toBe(true);
  });

  it('does not present to osc sink when not armed', async () => {
    const sink = makeSink();
    sink.kind = 'osc';
    const state = makeState();
    state.armed = false;
    state.fade = 1;
    const loop = createRenderLoop({ engine, sink, state }, 9);
    const handle = createCommandHandler({ engine, sink, state }, loop, 9);

    handle({ action: 'solid', r: 255, g: 0, b: 0 });
    await new Promise(r => setTimeout(r, 100));
    loop.stop();

    expect(sink.frames.length).toBe(0); // Not armed, should not present
  });

  it('presents to osc sink when armed', async () => {
    const sink = makeSink();
    sink.kind = 'osc';
    const state = makeState();
    state.armed = true;
    state.fade = 1;
    const loop = createRenderLoop({ engine, sink, state }, 9);
    const handle = createCommandHandler({ engine, sink, state }, loop, 9);

    handle({ action: 'solid', r: 255, g: 0, b: 0 });
    await new Promise(r => setTimeout(r, 100));
    loop.stop();

    expect(sink.frames.length).toBeGreaterThan(0);
  });

  it('logs unknown commands', () => {
    const sink = makeSink();
    const state = makeState();
    const logs: string[] = [];
    const loop = createRenderLoop({ engine, sink, state, onLog: m => logs.push(m) }, 9);
    const handle = createCommandHandler({ engine, sink, state, onLog: m => logs.push(m) }, loop, 9);

    handle({ action: 'foobar' });
    expect(logs.some(l => l.includes('unknown command'))).toBe(true);
  });

  it('LP filter smoothes transitions when fade < 1', async () => {
    const sink = makeSink();
    const state = makeState();
    state.fade = 0.1; // slow fade
    state.fps = 60;
    const loop = createRenderLoop({ engine, sink, state }, 9);
    const handle = createCommandHandler({ engine, sink, state }, loop, 9);

    handle({ action: 'solid', r: 255, g: 0, b: 0 });
    await new Promise(r => setTimeout(r, 50));
    loop.stop();

    // First frames should be partially faded (not yet at 255)
    expect(sink.frames.length).toBeGreaterThan(0);
    const firstFb = sink.frames[0];
    // With fade=0.1, first frame R should be ~25.5 (0 + (255-0)*0.1)
    expect(firstFb[0]).toBeGreaterThan(0);
    expect(firstFb[0]).toBeLessThan(255);
  });
});

describe('createRenderLoop', () => {
  let engine: PatternEngine;

  beforeAll(async () => {
    engine = await createEngine({ grid: { cols: 3, rows: 3, count: 9 } });
    engine.loadPattern(SIMPLE_PATTERN);
  });

  afterAll(() => { engine.dispose(); });

  it('starts and stops', () => {
    const sink = makeSink();
    const state = makeState();
    const loop = createRenderLoop({ engine, sink, state }, 9);

    expect(loop.running).toBe(false);
    loop.start();
    expect(loop.running).toBe(true);
    loop.stop();
    expect(loop.running).toBe(false);
  });

  it('produces frames when running', async () => {
    const sink = makeSink();
    const state = makeState();
    state.fps = 30;
    state.fade = 1;
    const loop = createRenderLoop({ engine, sink, state }, 9);

    loop.start();
    await new Promise(r => setTimeout(r, 200));
    loop.stop();

    expect(sink.frames.length).toBeGreaterThan(0);
    for (const fb of sink.frames) {
      expect(fb.length).toBe(27);
    }
  });
});
