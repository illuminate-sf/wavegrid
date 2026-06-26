import { setTarget } from './helpers';
import { DEFAULT_GRID_COLUMNS, GridCell, SceneGenerator } from './types';

export const scenes: Record<string, SceneGenerator> = {
  civic: () => ({ h: 220, s: 90, b: 80 }),

  pride: (i, total) => ({ h: Math.round((i / total) * 360), s: 90, b: 80 }),

  gold: () => ({ h: 45, s: 95, b: 80 }),

  white: () => ({ h: 0, s: 0, b: 80 }),

  solstice: (i, _total, cols) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return { h: 40 + row * 5 + col * 4, s: 85, b: 80 };
  },

  ocean: (i, _total, cols) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return { h: 180 + row * 8 + col * 3, s: 75, b: 70 };
  },

  sunset: (i, _total, cols) => {
    const row = Math.floor(i / cols);
    return { h: 10 + row * 5, s: 90, b: 85 - row * 5 };
  },

  heart: (i, total, cols) => {
    const rows = Math.ceil(total / cols);
    if (cols !== 7 || rows < 7) return { h: 350, s: 85, b: 2 };
    const row = Math.floor(i / cols);
    const col = i % cols;
    const bitmap = [
      [0, 1, 0, 0, 0, 1, 0],
      [1, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0]
    ];
    const on = bitmap[row]?.[col];
    return on ? { h: 350, s: 85, b: 80 } : { h: 0, s: 0, b: 2 };
  },

  sf: (i, total, cols) => {
    const rows = Math.ceil(total / cols);
    if (cols !== 7 || rows < 7) return { h: 220, s: 80, b: 8 };
    const row = Math.floor(i / cols);
    const col = i % cols;
    const bitmap = [
      [0, 1, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0],
      [1, 0, 0, 0, 1, 0, 0],
      [0, 1, 1, 0, 1, 1, 0],
      [0, 0, 1, 0, 1, 0, 0],
      [0, 0, 1, 0, 1, 0, 0],
      [1, 1, 0, 0, 1, 0, 0]
    ];
    const on = bitmap[row]?.[col];
    return on ? { h: 45, s: 95, b: 85 } : { h: 220, s: 80, b: 8 };
  },

  smiley: (i, total, cols) => {
    const rows = Math.ceil(total / cols);
    if (cols !== 7 || rows < 7) return { h: 0, s: 0, b: 2 };
    const row = Math.floor(i / cols);
    const col = i % cols;
    const bitmap = [
      [0, 1, 1, 1, 1, 1, 0],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 0, 0, 0, 1, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [0, 1, 1, 1, 1, 1, 0]
    ];
    const FACE = 1;
    const on = bitmap[row]?.[col] === FACE;
    return on ? { h: 50, s: 90, b: 85 } : { h: 0, s: 0, b: 2 };
  },

  forest: (i, _total, cols) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return { h: 120 + row * 6 + col * 2, s: 75, b: 30 + row * 8 };
  },

  fire: (i, _total, cols) => {
    const row = Math.floor(i / cols);
    const invertedRow = (cols - 1) - row;
    return { h: 10 + invertedRow * 6, s: 95, b: 40 + invertedRow * 8 };
  },

  night: (i, total, cols) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const starCount = Math.max(2, Math.floor(total / 7));
    const step = total / starCount;
    const starPositions = Array.from({ length: starCount }, (_, k) => Math.round(k * step));
    if (starPositions.includes(i)) {
      return { h: 200 + (row + col) * 10, s: 20, b: 90 };
    }
    return { h: 240, s: 60, b: 8 + row * 2 };
  },

  checker: (i, _total, cols) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const isLight = (row + col) % 2 === 0;
    return isLight ? { h: 0, s: 0, b: 80 } : { h: 220, s: 80, b: 60 };
  },

  off: () => ({ h: 0, s: 0, b: 0 })
};

export function getSceneNames(): string[] {
  return Object.keys(scenes);
}

/**
 * Apply a scene to a grid, setting targets for all cells.
 */
export function applyScene(grid: GridCell[], sceneName: string, gridColumns: number = DEFAULT_GRID_COLUMNS): boolean {
  const generator = scenes[sceneName];
  if (!generator) return false;
  for (let i = 0; i < grid.length; i++) {
    const { h, s, b } = generator(i, grid.length, gridColumns);
    setTarget(grid, i, h, s, b);
  }
  return true;
}
