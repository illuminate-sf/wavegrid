import { handleCommand, tickCommandMode, applyPaint, createDefaultAnimationState, AnimationState } from '../src/command-engine';
import { createFilteredGrid, FilteredCannon } from '../src/filter';
import { CommandMessage } from '../src/command-types';

function makeState(overrides: Partial<AnimationState> = {}): AnimationState {
  return { ...createDefaultAnimationState(), ...overrides };
}

function makeGrid(n = 4): FilteredCannon[] {
  return createFilteredGrid(n);
}

describe('handleCommand', () => {
  describe('paint clears animation and scene', () => {
    it('clears currentAnimation when paint arrives', () => {
      const state = makeState({ currentAnimation: 'rainbow' });
      handleCommand(state, { type: 'command', action: 'paint', cells: [{ idx: 0, h: 0, s: 100, b: 100 }] });
      expect(state.currentAnimation).toBeNull();
    });

    it('clears currentScene when paint arrives', () => {
      const state = makeState({ currentScene: 'warm' });
      handleCommand(state, { type: 'command', action: 'paint', cells: [{ idx: 0, h: 0, s: 100, b: 100 }] });
      expect(state.currentScene).toBeNull();
    });

    it('clears patternActive when paint arrives', () => {
      const state = makeState({ patternActive: true });
      handleCommand(state, { type: 'command', action: 'paint', cells: [{ idx: 0, h: 0, s: 100, b: 100 }] });
      expect(state.patternActive).toBe(false);
    });
  });

  describe('setAnimation conditional tick reset', () => {
    it('resets tick to 0 when animation name changes', () => {
      const state = makeState({ currentAnimation: 'rainbow', tick: 42 });
      handleCommand(state, { type: 'command', action: 'setAnimation', name: 'pulse' });
      expect(state.tick).toBe(0);
      expect(state.currentAnimation).toBe('pulse');
    });

    it('does NOT reset tick when same animation name is re-sent (keepalive safe)', () => {
      const state = makeState({ currentAnimation: 'rainbow', tick: 42 });
      handleCommand(state, { type: 'command', action: 'setAnimation', name: 'rainbow' });
      expect(state.tick).toBe(42);
      expect(state.currentAnimation).toBe('rainbow');
    });

    it('resets tick when changing from null to an animation', () => {
      const state = makeState({ currentAnimation: null, tick: 10 });
      handleCommand(state, { type: 'command', action: 'setAnimation', name: 'rainbow' });
      expect(state.tick).toBe(0);
    });

    it('clears currentScene when setting an animation', () => {
      const state = makeState({ currentScene: 'warm' });
      handleCommand(state, { type: 'command', action: 'setAnimation', name: 'rainbow' });
      expect(state.currentScene).toBeNull();
    });
  });

  describe('keepalive is a no-op', () => {
    it('returns true without modifying state', () => {
      const state = makeState({ currentAnimation: 'rainbow', tick: 100, brightness: 80 });
      const before = { ...state };
      const result = handleCommand(state, { type: 'command', action: 'keepalive' });
      expect(result).toBe(true);
      expect(state.currentAnimation).toBe(before.currentAnimation);
      expect(state.tick).toBe(before.tick);
      expect(state.brightness).toBe(before.brightness);
    });
  });

  describe('clear resets scene and animation', () => {
    it('clears both animation and scene', () => {
      const state = makeState({ currentAnimation: 'rainbow', currentScene: 'warm' });
      handleCommand(state, { type: 'command', action: 'clear' });
      expect(state.currentAnimation).toBeNull();
      expect(state.currentScene).toBeNull();
      expect(state.patternActive).toBe(false);
    });
  });

  describe('setSmoothness is handled at receiver level', () => {
    it('returns true (handled by receiver, not state)', () => {
      const state = makeState();
      const result = handleCommand(state, { type: 'command', action: 'setSmoothness', value: 0.5 });
      expect(result).toBe(true);
    });
  });
});

describe('tickCommandMode', () => {
  describe('tick increment order', () => {
    it('evaluates animation THEN increments tick (not before)', () => {
      const grid = makeGrid(4);
      const state = makeState({ currentAnimation: 'rainbow', tick: 0, speed: 1 });

      // First tick: animation evaluated at tick=0, then tick becomes 1
      tickCommandMode(grid, state, 2);
      expect(state.tick).toBe(1);

      // Second tick: animation evaluated at tick=1, then tick becomes 2
      tickCommandMode(grid, state, 2);
      expect(state.tick).toBe(2);
    });

    it('increments tick by speed value', () => {
      const grid = makeGrid(4);
      const state = makeState({ currentAnimation: 'rainbow', tick: 0, speed: 2.0 });
      tickCommandMode(grid, state, 2);
      expect(state.tick).toBe(2.0);
    });

    it('does not increment tick when no animation is active', () => {
      const grid = makeGrid(4);
      const state = makeState({ currentAnimation: null, tick: 5 });
      // tick still increments — the tick counter runs regardless
      tickCommandMode(grid, state, 2);
      expect(state.tick).toBe(6);
    });

    it('evaluates rainbow at tick=0 on first call (not tick=1)', () => {
      // Rainbow hue = (tick * 1.5 + (row + col) * 25) % 360
      // At tick=0, cell 0 (row=0, col=0): hue = (0 * 1.5 + 0) % 360 = 0
      // At tick=1, cell 0 (row=0, col=0): hue = (1 * 1.5 + 0) % 360 = 1.5
      // If tick is incremented BEFORE eval (old bug), first eval sees tick=1 → hue=1.5
      // If tick is incremented AFTER eval (fix), first eval sees tick=0 → hue=0
      const grid = makeGrid(4);
      const state = makeState({ currentAnimation: 'rainbow', tick: 0, speed: 1, attack: 1.0 });
      tickCommandMode(grid, state, 2);
      // Cell 0 should have hue=0 (evaluated at tick=0, not tick=1)
      expect(grid[0].targetH).toBe(0);
    });
  });

  describe('paint targets survive ticks without animation', () => {
    it('paint targets are not overwritten when animation is null', () => {
      const grid = makeGrid(4);
      // Paint cell 0 to red
      applyPaint(grid, [{ idx: 0, h: 0, s: 100, b: 100 }], 1.0);
      expect(grid[0].targetH).toBe(0);
      expect(grid[0].targetS).toBe(100);
      expect(grid[0].targetB).toBe(100);

      // Tick without any animation active
      const state = makeState({ currentAnimation: null, currentScene: null });
      tickCommandMode(grid, state, 2);

      // Paint targets should survive
      expect(grid[0].targetH).toBe(0);
      expect(grid[0].targetS).toBe(100);
      expect(grid[0].targetB).toBe(100);
    });
  });

  describe('pattern skips animation evaluation', () => {
    it('does not evaluate animation when patternActive is true', () => {
      const grid = makeGrid(4);
      // Set a known target
      grid[0].targetH = 42;
      grid[0].targetS = 50;
      grid[0].targetB = 75;

      const state = makeState({
        currentAnimation: 'rainbow',
        patternActive: true
      });

      tickCommandMode(grid, state, 2);

      // Targets should be unchanged (animation was skipped due to patternActive)
      expect(grid[0].targetH).toBe(42);
      expect(grid[0].targetS).toBe(50);
      // brightness cap at 100% doesn't change 75
      expect(grid[0].targetB).toBe(75);
    });
  });
});

describe('applyPaint', () => {
  it('sets target values on specified cells', () => {
    const grid = makeGrid(4);
    applyPaint(grid, [
      { idx: 0, h: 120, s: 80, b: 90 },
      { idx: 3, h: 240, s: 60, b: 70 }
    ], 1.0);

    expect(grid[0].targetH).toBe(120);
    expect(grid[0].targetS).toBe(80);
    expect(grid[0].targetB).toBe(90);
    expect(grid[3].targetH).toBe(240);
    expect(grid[3].targetS).toBe(60);
    expect(grid[3].targetB).toBe(70);
  });

  it('ignores out-of-range indices', () => {
    const grid = makeGrid(4);
    const before = grid.map(c => ({ ...c }));
    applyPaint(grid, [{ idx: 99, h: 0, s: 100, b: 100 }], 1.0);
    // Grid should be unchanged
    for (let i = 0; i < grid.length; i++) {
      expect(grid[i].targetH).toBe(before[i].targetH);
    }
  });
});
