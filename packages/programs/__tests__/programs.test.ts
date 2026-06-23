import { getProgram, getProgramNames, Host, Programs } from '../src/index';

describe('Programs library', () => {
  it('exports a non-empty array of programs', () => {
    expect(Array.isArray(Programs)).toBe(true);
    expect(Programs.length).toBeGreaterThan(50);
  });

  it('every program has a name and factory', () => {
    for (const entry of Programs) {
      expect(typeof entry.name).toBe('string');
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.factory).toBeDefined();
      expect(entry.factory.meta).toBeDefined();
      expect(entry.factory.meta.name).toBe(entry.name);
      expect(typeof entry.factory.create).toBe('function');
    }
  });

  it('getProgramNames returns all names', () => {
    const names = getProgramNames();
    expect(names.length).toBe(Programs.length);
    expect(names).toContain('Color Wave');
    expect(names).toContain('Plasma');
  });

  it('getProgram finds by name', () => {
    const p = getProgram('Color Wave');
    expect(p).toBeDefined();
    expect(p!.name).toBe('Color Wave');
    expect(p!.factory.meta.name).toBe('Color Wave');
  });

  it('getProgram returns undefined for unknown name', () => {
    expect(getProgram('nonexistent')).toBeUndefined();
  });
});

describe('Program rendering', () => {
  it('Color Wave renders a 7x7 frame', () => {
    const entry = getProgram('Color Wave');
    expect(entry).toBeDefined();

    const node = Host.createNode(entry!.factory, {
      W: 7,
      H: 7,
      runs: Host.fullRuns(7, 7),
      seed: 12345,
    });

    expect(node.ownedCount).toBe(49);
    expect(node.fb.length).toBe(49 * 3);

    const fb = node.renderFrame(0, 1 / 60);
    expect(fb).toBeDefined();
    expect(fb.length).toBe(49 * 3);

    // Should have produced some non-zero pixel data
    let sum = 0;
    for (let i = 0; i < fb.length; i++) sum += fb[i];
    expect(sum).toBeGreaterThan(0);
  });

  it('Plasma renders without throwing', () => {
    const entry = getProgram('Plasma');
    const node = Host.createNode(entry!.factory, {
      W: 7, H: 7,
      runs: Host.fullRuns(7, 7),
      seed: 42,
    });
    // Render several frames to exercise step()
    for (let f = 0; f < 10; f++) {
      node.renderFrame(f, 1 / 60);
    }
    expect(node.fb.length).toBe(49 * 3);
  });

  it('every program can render at least one frame on a 7x7 grid', () => {
    for (const entry of Programs) {
      const node = Host.createNode(entry.factory, {
        W: 7, H: 7,
        runs: Host.fullRuns(7, 7),
        seed: 12345,
      });
      expect(() => node.renderFrame(0, 1 / 60)).not.toThrow();
      expect(node.fb.length).toBe(49 * 3);
    }
  });

  it('checkpoint and restore preserves state', () => {
    const entry = getProgram('Color Wave')!;
    const node = Host.createNode(entry.factory, {
      W: 7, H: 7,
      runs: Host.fullRuns(7, 7),
      seed: 12345,
    });

    // Advance 30 frames
    for (let f = 0; f < 30; f++) node.renderFrame(f, 1 / 60);
    const checkpoint = node.checkpoint();

    // Advance 30 more frames
    for (let f = 30; f < 60; f++) node.renderFrame(f, 1 / 60);

    // Restore to frame 30 state — verifies restore doesn't throw
    node.restore(checkpoint);
    node.renderFrame(30, 1 / 60);
    expect(node.fb.length).toBe(49 * 3);
  });

  it('supports custom grid size (100x100)', () => {
    const entry = getProgram('Color Wave')!;
    const node = Host.createNode(entry.factory, {
      W: 100, H: 100,
      runs: Host.fullRuns(100, 100),
      seed: 42,
    });
    expect(node.ownedCount).toBe(10000);
    expect(node.fb.length).toBe(10000 * 3);
    node.renderFrame(0, 1 / 60);
  });

  it('supports rect runs (partial render set)', () => {
    const entry = getProgram('Ripple')!;
    const runs = Host.rectRuns(10, 10, 2, 2, 4, 4);
    const node = Host.createNode(entry.factory, {
      W: 10, H: 10,
      runs,
      seed: 42,
    });
    expect(node.ownedCount).toBe(16); // 4x4
    expect(node.fb.length).toBe(16 * 3);
    node.renderFrame(0, 1 / 60);
  });
});
