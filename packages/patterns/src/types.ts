/**
 * Core types for the pattern engine.
 */

/** Grid configuration. */
export interface GridConfig {
  cols: number;
  rows: number;
  count: number;
}

/** Timing state passed into every render frame. */
export interface FrameTiming {
  /** Elapsed time in seconds since pattern load. */
  t: number;
  /** Delta time in seconds since the previous frame. */
  dt: number;
  /** Frame counter. */
  frame: number;
  /** Beats per minute. */
  bpm: number;
  /** Current beat number (float). */
  beat: number;
  /** Phase within the current beat (0..1). */
  beatPhase: number;
}

/** Parameter descriptor for a pattern's tunable knobs. */
export interface ParamDescriptor {
  type: 'range' | 'hue' | 'toggle' | 'select';
  default: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

/** Pattern metadata declared via `const meta = { ... }`. */
export interface PatternMeta {
  name?: string;
  params?: Record<string, ParamDescriptor>;
}

/** Safety limiter configuration. */
export interface SafetyConfig {
  /** Master brightness ceiling (0..1). */
  brightnessCap: number;
  /** Max full on/off flash rate in Hz. 0 = unlimited. */
  maxFlashHz: number;
}

/** Engine resource limits for the QuickJS sandbox. */
export interface EngineConfig {
  /** Max memory for the sandbox in bytes. Default 64 MB. */
  memLimit: number;
  /** Max stack size in bytes. Default 512 KB. */
  stackLimit: number;
  /** Max ms for a single render() call. Default 6. */
  renderBudgetMs: number;
  /** Max ms for pattern load (eval). Default 2000. */
  loadBudgetMs: number;
}

/** Default engine resource limits. */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  memLimit: 64 * 1024 * 1024,
  stackLimit: 512 * 1024,
  renderBudgetMs: 6,
  loadBudgetMs: 2000
};

/** Default safety limits. */
export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  brightnessCap: 1,
  maxFlashHz: 0
};

/** Default grid (7x7 = 49 cannons). */
export const DEFAULT_GRID_CONFIG: GridConfig = {
  cols: 7,
  rows: 7,
  count: 49
};
