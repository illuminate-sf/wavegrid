// Engine
export type { CreateEngineOptions, PatternEngine } from './engine';
export { createEngine } from './engine';

// Prelude (for advanced usage / browser builds)
export { generatePrelude } from './prelude';

// Safety limiter
export { applySafety } from './safety';

// Types
export type {
  EngineConfig,
  FrameTiming,
  GridConfig,
  ParamDescriptor,
  PatternMeta,
  SafetyConfig,
} from './types';
export {
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_GRID_CONFIG,
  DEFAULT_SAFETY_CONFIG,
} from './types';
