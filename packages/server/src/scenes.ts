/**
 * Re-export all scenes from the shared @wavegrid/animations package.
 */
export type { SceneGenerator } from '@wavegrid/animations';
export { applyScene, getSceneNames, scenes } from '@wavegrid/animations';

export interface SceneColor {
  h: number;
  s: number;
  b: number;
}
