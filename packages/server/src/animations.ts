/**
 * Re-export all animations from the shared @wavegrid/animations package.
 * The server still uses setCannonTarget (from ./grid) for its own grid operations,
 * but the animation logic lives in the shared package.
 */
export type { AnimationFn } from '@wavegrid/animations';
export { animations, evaluateAnimation, getAnimationNames } from '@wavegrid/animations';
