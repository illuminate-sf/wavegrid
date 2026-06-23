/**
 * Host-side safety limiter — runs on the framebuffer BEFORE the sink.
 * Identical policy to the simulator. The sandbox cannot bypass this.
 *
 * Two protections:
 *   1. brightnessCap — hard ceiling on all channel values
 *   2. maxFlashHz   — slew-rate limit that prevents rapid on/off flashing
 */

import { DEFAULT_SAFETY_CONFIG, SafetyConfig } from './types';

/**
 * Apply safety limits to a framebuffer in-place.
 *
 * @param fb   - RGB framebuffer (flat array, 3 values per pixel: R, G, B in 0..255 range)
 * @param prev - Previous frame's buffer (for slew-rate limiting). null on first frame.
 * @param dt   - Delta time in seconds since the previous frame.
 * @param cfg  - Safety configuration.
 */
export function applySafety(
  fb: number[],
  prev: number[] | null,
  dt: number,
  cfg: SafetyConfig = DEFAULT_SAFETY_CONFIG
): void {
  const cap = cfg.brightnessCap ?? 1;

  // Brightness cap: scale all channels down
  if (cap < 1) {
    for (let i = 0; i < fb.length; i++) {
      fb[i] *= cap;
    }
  }

  // Flash / slew-rate limit: clamp per-channel change per frame
  if (prev && cfg.maxFlashHz > 0) {
    const maxStep = 255 * 2 * cfg.maxFlashHz * dt;
    for (let i = 0; i < fb.length; i++) {
      const d = fb[i] - prev[i];
      if (d > maxStep) fb[i] = prev[i] + maxStep;
      else if (d < -maxStep) fb[i] = prev[i] - maxStep;
    }
  }
}
