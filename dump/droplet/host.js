/* =====================================================================
 * Distributed Animation Program — PC host runtime (reference impl)
 * Implements the JS binding of the ABI spec (§5 host services, §6 1-D
 * framebuffer, §2 render-set / runs).  UMD: works in Node and browser.
 * ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Host = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const BPP = 3; // RGB888 (§6 format 1)

  // --- run helpers (§2) -------------------------------------------------
  // A run is [start, len] with start = y*W + x (global row-major index).

  /** Whole canvas as a single run. */
  function fullRuns(W, H) {
    return [[0, W * H]];
  }

  /** A rectangular region as H runs of length w (the degenerate case, §2). */
  function rectRuns(W, _H, x0, y0, w, h) {
    const runs = [];
    for (let y = y0; y < y0 + h; y++) runs.push([y * W + x0, w]);
    return runs;
  }

  function countOwned(runs) {
    let n = 0;
    for (let i = 0; i < runs.length; i++) n += runs[i][1];
    return n;
  }

  // --- node: one render node driving one render set ---------------------
  /**
   * createNode(programFactory, opts) -> node
   *   opts: { W, H, runs, haloRuns?, seed, params? }
   * The host materializes coords[] from the runs (§6), allocates the 1-D
   * framebuffer, then calls program.configure / init.
   */
  function createNode(programFactory, opts) {
    const W = opts.W,
      H = opts.H;
    const runs = opts.runs || fullRuns(W, H);
    const haloRuns = opts.haloRuns || [];
    const fps = opts.fps || 120;

    const ownedCount = countOwned(runs);
    const haloCount = countOwned(haloRuns);
    const total = ownedCount + haloCount;

    // Materialize the coordinate array: coords[i] -> (x, y), in wire order.
    // Halo coords are appended after the owned coords (§6).
    const coordsX = new Int32Array(total);
    const coordsY = new Int32Array(total);
    let i = 0;
    const fill = (rs) => {
      for (let r = 0; r < rs.length; r++) {
        const start = rs[r][0],
          len = rs[r][1];
        for (let k = 0; k < len; k++) {
          const idx = start + k;
          coordsX[i] = idx % W;
          coordsY[i] = (idx / W) | 0;
          i++;
        }
      }
    };
    fill(runs);
    fill(haloRuns);

    // Bounding box of the render set (asset-prefetch / Tier-3 hint, §5).
    let bx = W, by = H, bxe = 0, bye = 0;
    for (let j = 0; j < ownedCount; j++) {
      if (coordsX[j] < bx) bx = coordsX[j];
      if (coordsY[j] < by) by = coordsY[j];
      if (coordsX[j] > bxe) bxe = coordsX[j];
      if (coordsY[j] > bye) bye = coordsY[j];
    }
    const bbox = ownedCount
      ? { x: bx, y: by, w: bxe - bx + 1, h: bye - by + 1 }
      : { x: 0, y: 0, w: 0, h: 0 };

    const fb = new Uint8Array(total * BPP); // 1-D framebuffer (§6)

    // Host services injected into the program (§5).  In the JS binding these
    // return values directly instead of writing to linear memory.
    const host = {
      canvas_size: () => [W, H],
      render_set: () => ({ ownedCount, haloCount, bbox }),
      frame_time: (frame) => (frame * 1000) / fps, // ms
      asset_region: () => -1, // no assets in this program
      asset_info: () => -1,
      log: (level, msg) => {
        if (typeof console !== "undefined") console.log("[prog]", msg);
      },
    };

    // The runtime context handed to the program at configure (§6).
    const ctx = {
      W, H,
      runs, haloRuns,
      ownedCount, haloCount,
      coordsX, coordsY,
      fb, format: "rgb888", bpp: BPP,
      bbox,
      host,
    };

    const prog = programFactory.create();
    prog.configure(ctx);
    prog.init(opts.params || null, opts.seed >>> 0);

    const DEFAULT_DT = 1 / 60; // seconds, used when caller omits dt

    return {
      W, H, ownedCount, haloCount, coordsX, coordsY, fb, bbox,
      /**
       * Advance + render one frame; returns the framebuffer (owned + halo).
       * @param frame frame index (passed to render_tile)
       * @param dt    elapsed seconds since the previous frame (time-based
       *              animation). Omit for the 1/60 s default. In a synced
       *              deployment every node must receive the SAME dt so they
       *              stay deterministic / seamless (§8).
       */
      renderFrame(frame, dt) {
        prog.step(dt === undefined ? DEFAULT_DT : dt);
        prog.render_tile(frame);
        return fb;
      },
      checkpoint: () => prog.checkpoint(),
      restore: (blob) => prog.restore(blob),
    };
  }

  return { createNode, fullRuns, rectRuns, countOwned, BPP };
});
