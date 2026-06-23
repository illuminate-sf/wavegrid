// Host-side safety limiter — runs on the framebuffer BEFORE the sink.
// Identical policy to the simulator. The sandbox cannot bypass this.
export function applySafety(fb, prev, dt, cfg) {
  const cap = cfg.brightnessCap ?? 1;        // master brightness ceiling
  for (let i = 0; i < fb.length; i++) fb[i] *= cap;
  if (prev && cfg.maxFlashHz > 0) {          // flash / slew limit
    const maxStep = 255 * 2 * cfg.maxFlashHz * dt; // full on/off swings capped to maxFlashHz
    for (let i = 0; i < fb.length; i++) {
      const d = fb[i] - prev[i];
      if (d > maxStep) fb[i] = prev[i] + maxStep;
      else if (d < -maxStep) fb[i] = prev[i] - maxStep;
      prev[i] = fb[i];
    }
  } else if (prev) {
    for (let i = 0; i < fb.length; i++) prev[i] = fb[i];
  }
}
