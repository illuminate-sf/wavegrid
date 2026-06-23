import { createEngine, PatternEngine } from '../src/engine';

// Allow enough time for WASM initialization
jest.setTimeout(30000);

describe('PatternEngine', () => {
  let engine: PatternEngine;

  afterEach(() => {
    if (engine) engine.dispose();
  });

  it('loads a simple pattern and renders a frame', async () => {
    engine = await createEngine();
    const meta = engine.loadPattern(`
      const meta = { name: 'Red Fill' };
      function render(ctx) {
        ctx.fill(0, 100, 100);
      }
    `);
    expect(meta.name).toBe('Red Fill');
    expect(engine.loaded).toBe(true);

    const fb = engine.renderFrame(0, 1 / 60, 0, 120);
    expect(fb).not.toBeNull();
    expect(fb!.length).toBe(49 * 3);

    // fill(0, 100, 100) = red: hsv(0, 100, 100) -> rgb(255, 0, 0)
    expect(fb![0]).toBe(255);
    expect(fb![1]).toBe(0);
    expect(fb![2]).toBe(0);
  });

  it('returns null when no pattern is loaded', async () => {
    engine = await createEngine();
    const fb = engine.renderFrame(0, 1 / 60, 0, 120);
    expect(fb).toBeNull();
    expect(engine.loaded).toBe(false);
  });

  it('throws when pattern has no render function', async () => {
    engine = await createEngine();
    expect(() => {
      engine.loadPattern('const meta = { name: "bad" };');
    }).toThrow('pattern has no render(ctx)');
  });

  it('supports custom grid dimensions', async () => {
    engine = await createEngine({ grid: { cols: 3, rows: 3 } });
    engine.loadPattern(`
      const meta = { name: 'Small Grid' };
      function render(ctx) {
        for (let i = 0; i < ctx.count; i++) ctx.setRGB(i, i * 28, 0, 0);
      }
    `);
    const fb = engine.renderFrame(0, 1 / 60, 0, 120);
    expect(fb).not.toBeNull();
    expect(fb!.length).toBe(9 * 3); // 3x3 = 9 pixels * 3 channels
    expect(fb![0]).toBe(0);   // pixel 0: R=0*28=0
    expect(fb![3]).toBe(28);  // pixel 1: R=1*28=28
    expect(fb![6]).toBe(56);  // pixel 2: R=2*28=56
  });

  it('passes time values to the pattern', async () => {
    engine = await createEngine();
    const logs: string[] = [];
    engine = await createEngine({ onLog: (m) => logs.push(m) });
    engine.loadPattern(`
      const meta = { name: 'Timer' };
      function render(ctx) {
        ctx.log(ctx.t.toFixed(2) + ' ' + ctx.dt.toFixed(4) + ' ' + ctx.frame);
        ctx.fill(0, 0, Math.round(ctx.t * 10));
      }
    `);
    engine.renderFrame(1.5, 0.0167, 90, 120);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain('1.50');
    expect(logs[0]).toContain('0.0167');
    expect(logs[0]).toContain('90');
  });

  it('handles pattern parameters', async () => {
    engine = await createEngine();
    const meta = engine.loadPattern(`
      const meta = {
        name: 'Parameterized',
        params: {
          speed: { type: 'range', min: 0, max: 10, step: 0.1, default: 1 },
          hue: { type: 'hue', default: 200 }
        }
      };
      function render(ctx) {
        ctx.fill(ctx.p.hue, 100, 50);
      }
    `);
    expect(meta.params).toBeDefined();
    expect(meta.params!.speed.default).toBe(1);

    // Render with default params
    let fb = engine.renderFrame(0, 1 / 60, 0, 120);
    expect(fb).not.toBeNull();

    // Change a param and re-render
    engine.setParam('hue', 120);
    fb = engine.renderFrame(0.1, 1 / 60, 1, 120);
    expect(fb).not.toBeNull();
  });

  it('strips export keywords from pattern code', async () => {
    engine = await createEngine();
    const meta = engine.loadPattern(`
      export const meta = { name: 'Exported' };
      export function render(ctx) {
        ctx.fill(120, 100, 100);
      }
    `);
    expect(meta.name).toBe('Exported');
    const fb = engine.renderFrame(0, 1 / 60, 0, 120);
    expect(fb).not.toBeNull();
    // green: hsv(120, 100, 100) -> rgb(0, 255, 0)
    expect(fb![0]).toBe(0);
    expect(fb![1]).toBe(255);
    expect(fb![2]).toBe(0);
  });

  it('can reload a new pattern after disposing the old one', async () => {
    engine = await createEngine();
    engine.loadPattern(`
      const meta = { name: 'First' };
      function render(ctx) { ctx.fill(0, 100, 100); }
    `);
    let fb = engine.renderFrame(0, 1 / 60, 0, 120);
    expect(fb![0]).toBe(255); // red

    engine.loadPattern(`
      const meta = { name: 'Second' };
      function render(ctx) { ctx.fill(120, 100, 100); }
    `);
    fb = engine.renderFrame(0, 1 / 60, 0, 120);
    expect(fb![0]).toBe(0);   // green
    expect(fb![1]).toBe(255);
  });

  it('handles ctx API: xy, uv, polar, noise, setHSV', async () => {
    engine = await createEngine();
    engine.loadPattern(`
      const meta = { name: 'API Test' };
      function render(ctx) {
        for (let i = 0; i < ctx.count; i++) {
          const [x, y] = ctx.xy(i);
          const [u, v] = ctx.uv(i);
          const [r, a] = ctx.polar(i);
          const n = ctx.noise(u, v, ctx.t);
          ctx.setHSV(i, n * 360, 100, 100);
        }
      }
    `);
    const fb = engine.renderFrame(0.5, 1 / 60, 30, 120);
    expect(fb).not.toBeNull();
    expect(fb!.length).toBe(49 * 3);
    // Just verify it produced some non-zero output
    const sum = fb!.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
  });

  it('handles ctx API: fade, clear, getRGB, getHSV', async () => {
    engine = await createEngine();
    engine.loadPattern(`
      const meta = { name: 'Fade Test' };
      let firstFrame = true;
      function render(ctx) {
        if (firstFrame) {
          ctx.fill(0, 100, 100); // red
          firstFrame = false;
        } else {
          ctx.fade(0.5);
        }
      }
    `);
    engine.renderFrame(0, 1 / 60, 0, 120);
    const fb = engine.renderFrame(0.016, 1 / 60, 1, 120);
    expect(fb).not.toBeNull();
    // After fade(0.5), values should be halved
    expect(fb![0]).toBeCloseTo(127.5, 0);
  });

  it('handles ctx API: lerp, smoothstep, rand, ease', async () => {
    engine = await createEngine();
    const logs: string[] = [];
    engine = await createEngine({ onLog: (m) => logs.push(m) });
    engine.loadPattern(`
      const meta = { name: 'Math Test' };
      function render(ctx) {
        const l = ctx.lerp(0, 100, 0.5);
        const s = ctx.smoothstep(0, 1, 0.5);
        const r = ctx.rand();
        const e = ctx.ease.inQuad(0.5);
        ctx.log(l + ' ' + s.toFixed(2) + ' ' + (r >= 0 && r < 1) + ' ' + e);
        ctx.fill(0, 0, l);
      }
    `);
    engine.renderFrame(0, 1 / 60, 0, 120);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain('50');     // lerp(0,100,0.5) = 50
    expect(logs[0]).toContain('0.50');   // smoothstep midpoint
    expect(logs[0]).toContain('true');   // rand in [0,1)
    expect(logs[0]).toContain('0.25');   // inQuad(0.5) = 0.25
  });

  it('onLog receives pattern console.log output', async () => {
    const logs: string[] = [];
    engine = await createEngine({ onLog: (m) => logs.push(m) });
    engine.loadPattern(`
      const meta = { name: 'Logger' };
      function render(ctx) {
        ctx.log('hello', 'world');
      }
    `);
    engine.renderFrame(0, 1 / 60, 0, 120);
    expect(logs).toContain('hello world');
  });

  it('handles initial params override', async () => {
    const logs: string[] = [];
    engine = await createEngine({ onLog: (m) => logs.push(m) });
    engine.loadPattern(
      `const meta = { name: 'P', params: { speed: { type: 'range', min: 0, max: 5, step: 0.1, default: 1 } } };
       function render(ctx) { ctx.log(String(ctx.p.speed)); ctx.fill(0,0,0); }`,
      { speed: 3 }
    );
    engine.renderFrame(0, 1 / 60, 0, 120);
    expect(logs).toContain('3');
  });
});
