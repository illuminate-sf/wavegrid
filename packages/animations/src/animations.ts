import { getPerimeterIndices, prideColorAt, ROYGBIV, roygbivAt, setTarget, smooth } from './helpers';
import { AnimationFn, DEFAULT_GRID_COLUMNS, GridCell } from './types';

export const animations: Record<string, AnimationFn> = {
  wave: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    for (let i = 0; i < grid.length; i++) {
      const col = i % cols;
      const hue = (tick * 2 + col * 40) % 360;
      const bright = 60 + Math.sin(tick * 0.05 + col * 0.8) * 20;
      setTarget(grid, i, hue, 85, bright, attack);
    }
  },

  breathe: (grid, tick, attack) => {
    const brightness = 40 + Math.sin(tick * 0.03) * 35;
    for (let i = 0; i < grid.length; i++) {
      setTarget(grid, i, 220, 80, brightness, attack);
    }
  },

  rainbow: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    for (let i = 0; i < grid.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const hue = (tick * 1.5 + (row + col) * 25) % 360;
      setTarget(grid, i, hue, 90, 80, attack);
    }
  },

  pacman: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    const perimeter = getPerimeterIndices(grid.length, cols);
    const pos = Math.floor(tick * 0.3) % perimeter.length;
    for (let i = 0; i < grid.length; i++) {
      setTarget(grid, i, 220, 60, 15, attack);
    }
    const pacIdx = perimeter[pos];
    setTarget(grid, pacIdx, 55, 95, 95, 1.0);
    for (let t = 1; t <= 3; t++) {
      const trailPos = (pos - t + perimeter.length) % perimeter.length;
      const trailIdx = perimeter[trailPos];
      setTarget(grid, trailIdx, 55, 80, 70 - t * 18, 1.0);
    }
  },

  spiral: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    const rows = Math.ceil(grid.length / cols);
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const maxDistance = Math.max(1, Math.hypot(cx, cy));
    const time = tick / 60;

    for (let i = 0; i < grid.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const dx = col - cx;
      const dy = row - cy;
      const phase = Math.atan2(dy, dx);
      const distance = Math.hypot(dx, dy) / maxDistance;
      const arms = Math.cos(phase * 3 - time * 1.55 + distance * 6.2);
      const tail = Math.cos(phase * 3 - time * 1.55 + distance * 6.2 - 0.72);
      const coreVoid = smooth((distance - 0.16) / 0.18);
      const intensity = (smooth((arms - 0.18) / 0.82) * 0.78 + smooth((tail - 0.2) / 0.8) * 0.24) * coreVoid;
      const color = prideColorAt(0.78 + phase / (Math.PI * 2) + time * 0.1 + tail * 0.08, time);

      setTarget(grid, i, color.h, color.s, intensity * 100, attack);
    }
  },

  rain: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    const rows = Math.ceil(grid.length / cols);
    for (let i = 0; i < grid.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const phase = (tick * 0.15 + col * 2.3 + col * col * 0.7) % rows;
      const dist = Math.abs(row - phase);
      const bright = dist < 1.5 ? 90 - dist * 30 : 10;
      setTarget(grid, i, 200 + col * 8, 70, bright, attack);
    }
  },

  'heart-breathe': (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    const rows = Math.ceil(grid.length / cols);
    const bitmap = [
      [0, 1, 0, 0, 0, 1, 0],
      [1, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0]
    ];
    const t = (Math.sin(tick * 0.03) + 1) / 2;
    const brightness = 5 + Math.pow(t, 0.4) * 95;
    for (let i = 0; i < grid.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const on = cols === 7 && rows >= 7 && bitmap[row]?.[col];
      if (on) {
        setTarget(grid, i, 0, 100, brightness, attack);
      } else {
        setTarget(grid, i, 0, 0, 2, attack);
      }
    }
  }
};

// ── ROYGBIV Pride animations ────

animations['pride-flow'] = (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
  const rows = Math.ceil(grid.length / cols);
  const speed = tick * 0.012;
  for (let i = 0; i < grid.length; i++) {
    const row = Math.floor(i / cols);
    const color = roygbivAt(row / rows + speed);
    setTarget(grid, i, color.h, color.s, 90, attack);
  }
};

animations['pride-breathe'] = (grid, tick, attack) => {
  const speed = tick * 0.008;
  const brightness = 70 + Math.sin(tick * 0.04) * 20;
  const color = roygbivAt(speed);
  for (let i = 0; i < grid.length; i++) {
    setTarget(grid, i, color.h, color.s, brightness, attack);
  }
};

animations['pride-rotate'] = (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
  const offset = Math.floor(tick * 0.08);
  for (let i = 0; i < grid.length; i++) {
    const col = i % cols;
    const idx = ((col + offset) % ROYGBIV.length + ROYGBIV.length) % ROYGBIV.length;
    const color = ROYGBIV[idx];
    setTarget(grid, i, color.h, color.s, 90, attack);
  }
};

animations['pride-ring'] = (grid, tick, attack) => {
  const n = grid.length;
  const speed = tick * 0.012;
  for (let i = 0; i < n; i++) {
    const color = roygbivAt(i / n + speed);
    setTarget(grid, i, color.h, color.s, 90, attack);
  }
};

export function getAnimationNames(): string[] {
  return Object.keys(animations);
}

/**
 * Evaluate an animation by name against a grid.
 * Returns false if animation name is unknown.
 */
export function evaluateAnimation(
  grid: GridCell[],
  name: string,
  tick: number,
  attack: number,
  gridColumns: number = DEFAULT_GRID_COLUMNS
): boolean {
  const fn = animations[name];
  if (!fn) return false;
  fn(grid, tick, attack, gridColumns);
  return true;
}
