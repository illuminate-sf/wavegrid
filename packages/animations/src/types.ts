/**
 * Minimal grid cell interface used by animations and scenes.
 * Both server's CannonTarget and receiver's FilteredCannon satisfy this.
 */
export interface GridCell {
  h: number;
  s: number;
  b: number;
  targetH: number;
  targetS: number;
  targetB: number;
}

export type AnimationFn = (grid: GridCell[], tick: number, attack: number, gridColumns?: number) => void;

export type SceneGenerator = (index: number, total: number, gridColumns: number) => { h: number; s: number; b: number };

export const DEFAULT_GRID_COLUMNS = 7;
