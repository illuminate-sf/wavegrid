/**
 * Command-mode animation engine for the receiver.
 *
 * When in command mode, the receiver runs animations locally at 60fps.
 * This module evaluates the current animation state and writes targets
 * into the filtered grid, just like computeFallbackFrame does for fallback.
 */

import { applyScene, evaluateAnimation, setTarget } from '@wavegrid/animations';

import { AnimationState, CommandMessage, createDefaultAnimationState } from './command-types';
import { DEFAULT_GRID_COLUMNS, FilteredCannon } from './filter';

/**
 * Process a command message and update the animation state.
 * Returns true if the command was recognized and handled.
 */
export function handleCommand(state: AnimationState, cmd: CommandMessage): boolean {
  switch (cmd.action) {
  case 'setAnimation':
    state.currentAnimation = cmd.name;
    state.tick = 0;
    if (cmd.speed !== undefined) state.speed = cmd.speed;
    return true;

  case 'setScene':
    state.currentScene = cmd.name;
    state.currentAnimation = null;
    return true;

  case 'paint':
    // Paint is handled directly in tickCommandMode
    return true;

  case 'setBrightness':
    state.brightness = Math.max(0, Math.min(100, cmd.value));
    return true;

  case 'stop':
    state.currentAnimation = null;
    state.patternActive = false;
    state.shiftVx = 0;
    state.shiftVy = 0;
    state.shiftAccX = 0;
    state.shiftAccY = 0;
    return true;

  case 'clear':
    state.currentAnimation = null;
    state.currentScene = null;
    state.patternActive = false;
    state.shiftVx = 0;
    state.shiftVy = 0;
    state.shiftAccX = 0;
    state.shiftAccY = 0;
    return true;

  case 'evalPattern':
    // Handled by the receiver (async sandbox load)
    state.currentAnimation = null;
    state.currentScene = null;
    state.patternActive = true;
    return true;

  case 'setPatternParam':
    // Handled by the receiver directly
    return true;

  case 'stopPattern':
    state.patternActive = false;
    return true;

  case 'setShift':
    state.shiftVx = cmd.vx;
    state.shiftVy = cmd.vy;
    if (cmd.vx === 0 && cmd.vy === 0) {
      state.shiftAccX = 0;
      state.shiftAccY = 0;
    }
    return true;

  case 'setSmoothness':
    // Smoothness is handled at the receiver level (alpha)
    return true;

  case 'setAttack':
    state.attack = Math.max(0, Math.min(1, cmd.value));
    return true;

  case 'setSpeed':
    state.speed = Math.max(0.1, Math.min(5.0, cmd.value));
    return true;

  default:
    return false;
  }
}

/**
 * Evaluate one tick of command-mode animation.
 * Writes targets into the filtered grid based on current state.
 */
export function tickCommandMode(
  grid: FilteredCannon[],
  state: AnimationState,
  gridColumns: number = DEFAULT_GRID_COLUMNS
): void {
  // Advance the animation tick
  state.tick += state.speed;

  // Evaluate animation if one is active (skip if pattern is active)
  if (!state.patternActive) {
    if (state.currentAnimation) {
      evaluateAnimation(grid, state.currentAnimation, state.tick, state.attack, gridColumns);
    } else if (state.currentScene) {
      // If no animation, apply the scene (static)
      applyScene(grid, state.currentScene, gridColumns);
    }
  }

  // Apply shift (wrap-around pixel remapping)
  if (state.shiftVx !== 0 || state.shiftVy !== 0) {
    const rows = Math.ceil(grid.length / gridColumns);
    state.shiftAccX += state.shiftVx / 60;
    state.shiftAccY += state.shiftVy / 60;
    const stepsX = Math.trunc(state.shiftAccX);
    const stepsY = Math.trunc(state.shiftAccY);
    if (stepsX !== 0 || stepsY !== 0) {
      shiftGridTargets(grid, gridColumns, rows, stepsX, stepsY);
      state.shiftAccX -= stepsX;
      state.shiftAccY -= stepsY;
    }
  }

  // Apply brightness cap
  if (state.brightness < 100) {
    const scale = state.brightness / 100;
    for (let i = 0; i < grid.length; i++) {
      grid[i].targetB *= scale;
    }
  }
}

/**
 * Apply paint commands directly to grid targets.
 */
export function applyPaint(
  grid: FilteredCannon[],
  cells: Array<{ idx: number; h: number; s: number; b: number }>,
  attack: number = 1.0
): void {
  for (const cell of cells) {
    if (cell.idx >= 0 && cell.idx < grid.length) {
      setTarget(grid, cell.idx, cell.h, cell.s, cell.b, attack);
    }
  }
}

/**
 * Shift grid targets by wrapping around edges.
 */
function shiftGridTargets(
  grid: FilteredCannon[],
  cols: number,
  rows: number,
  dx: number,
  dy: number
): void {
  const snapshot = grid.map(c => ({ h: c.targetH, s: c.targetS, b: c.targetB }));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const srcR = ((r - dy) % rows + rows) % rows;
      const srcC = ((c - dx) % cols + cols) % cols;
      const srcIdx = srcR * cols + srcC;
      const dstIdx = r * cols + c;
      if (dstIdx >= grid.length || srcIdx >= grid.length) continue;
      const src = snapshot[srcIdx];
      grid[dstIdx].targetH = src.h;
      grid[dstIdx].targetS = src.s;
      grid[dstIdx].targetB = src.b;
    }
  }
}

export { createDefaultAnimationState };
export type { AnimationState };
