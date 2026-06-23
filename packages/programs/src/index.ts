/**
 * @wavegrid/programs — animation program library + host ABI runtime.
 *
 * The host.js and programs.js files are UMD modules that work in
 * Node, browser, and the QuickJS sandbox. This entry point provides
 * typed access from TypeScript.
 */

// Re-export types
export type {
  BBox,
  CreateNodeOptions,
  HostModule,
  HostServices,
  ProgramContext,
  ProgramEntry,
  ProgramFactory,
  ProgramInstance,
  RenderNode,
  Run,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HostJS = require('./host') as import('./types').HostModule;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProgramsJS = require('./programs') as import('./types').ProgramEntry[];

/** The Host ABI runtime (createNode, fullRuns, rectRuns, etc.). */
export const Host = HostJS;

/** All 58 animation programs (array of { name, factory }). */
export const Programs = ProgramsJS;

/**
 * Convenience: get a program entry by name.
 * Returns undefined if not found.
 */
export function getProgram(name: string): import('./types').ProgramEntry | undefined {
  return ProgramsJS.find(p => p.name === name);
}

/**
 * List all available program names.
 */
export function getProgramNames(): string[] {
  return ProgramsJS.map(p => p.name);
}

/**
 * Get the raw JS source of host.js (for shipping to the QuickJS sandbox).
 */
export function getHostSource(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('fs').readFileSync(require.resolve('./host.js'), 'utf8');
}

/**
 * Get the raw JS source of programs.js (for shipping to the QuickJS sandbox).
 */
export function getProgramsSource(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('fs').readFileSync(require.resolve('./programs.js'), 'utf8');
}
