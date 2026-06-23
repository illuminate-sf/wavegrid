/**
 * @wavegrid/programs — animation program library + host ABI runtime.
 */

export { Host } from './host';
export { Programs } from './programs';
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
  Run
} from './types';

import { Programs as ProgramsArr } from './programs';

/**
 * Convenience: get a program entry by name.
 * Returns undefined if not found.
 */
export function getProgram(name: string): import('./types').ProgramEntry | undefined {
  return ProgramsArr.find(p => p.name === name);
}

/**
 * List all available program names.
 */
export function getProgramNames(): string[] {
  return ProgramsArr.map(p => p.name);
}
