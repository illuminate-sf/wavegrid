/**
 * Distributed Animation Program — host runtime.
 * Implements the JS binding of the ABI spec (§5 host services, §6 1-D
 * framebuffer, §2 render-set / runs).
 */

import type {
  BBox,
  CreateNodeOptions,
  HostModule,
  HostServices,
  ProgramContext,
  ProgramFactory,
  RenderNode,
  Run
} from './types';

const BPP = 3; // RGB888 (§6 format 1)

/** Whole canvas as a single run. */
function fullRuns(W: number, H: number): Run[] {
  return [[0, W * H]];
}

/** A rectangular region as H runs of length w (the degenerate case, §2). */
function rectRuns(W: number, _H: number, x0: number, y0: number, w: number, h: number): Run[] {
  const runs: Run[] = [];
  for (let y = y0; y < y0 + h; y++) runs.push([y * W + x0, w]);
  return runs;
}

function countOwned(runs: Run[]): number {
  let n = 0;
  for (let i = 0; i < runs.length; i++) n += runs[i][1];
  return n;
}

/**
 * createNode(programFactory, opts) -> node
 *   opts: { W, H, runs, haloRuns?, seed, params? }
 * The host materializes coords[] from the runs (§6), allocates the 1-D
 * framebuffer, then calls program.configure / init.
 */
function createNode(programFactory: ProgramFactory, opts: CreateNodeOptions): RenderNode {
  const W = opts.W;
  const H = opts.H;
  const runs = opts.runs ?? fullRuns(W, H);
  const haloRuns = opts.haloRuns ?? [];
  const fps = opts.fps ?? 120;

  const ownedCount = countOwned(runs);
  const haloCount = countOwned(haloRuns);
  const total = ownedCount + haloCount;

  // Materialize the coordinate array: coords[i] -> (x, y), in wire order.
  // Halo coords are appended after the owned coords (§6).
  const coordsX = new Int32Array(total);
  const coordsY = new Int32Array(total);
  let idx = 0;
  const fillCoords = (rs: Run[]): void => {
    for (let r = 0; r < rs.length; r++) {
      const start = rs[r][0];
      const len = rs[r][1];
      for (let k = 0; k < len; k++) {
        const gi = start + k;
        coordsX[idx] = gi % W;
        coordsY[idx] = (gi / W) | 0;
        idx++;
      }
    }
  };
  fillCoords(runs);
  fillCoords(haloRuns);

  // Bounding box of the render set (asset-prefetch / Tier-3 hint, §5).
  let bx = W, by = H, bxe = 0, bye = 0;
  for (let j = 0; j < ownedCount; j++) {
    if (coordsX[j] < bx) bx = coordsX[j];
    if (coordsY[j] < by) by = coordsY[j];
    if (coordsX[j] > bxe) bxe = coordsX[j];
    if (coordsY[j] > bye) bye = coordsY[j];
  }
  const bbox: BBox = ownedCount
    ? { x: bx, y: by, w: bxe - bx + 1, h: bye - by + 1 }
    : { x: 0, y: 0, w: 0, h: 0 };

  const fb = new Uint8Array(total * BPP); // 1-D framebuffer (§6)

  // Host services injected into the program (§5).
  const host: HostServices = {
    canvas_size: () => [W, H],
    render_set: () => ({ ownedCount, haloCount, bbox }),
    frame_time: (frame: number) => (frame * 1000) / fps,
    asset_region: () => -1,
    asset_info: () => -1,
    log: (_level: number, msg: string) => {
      console.log('[prog]', msg);
    }
  };

  // The runtime context handed to the program at configure (§6).
  const ctx: ProgramContext = {
    W, H,
    runs, haloRuns,
    ownedCount, haloCount,
    coordsX, coordsY,
    fb, format: 'rgb888', bpp: BPP,
    bbox,
    host
  };

  const prog = programFactory.create();
  prog.configure(ctx);
  prog.init(opts.params ?? null, (opts.seed ?? 0) >>> 0);

  const DEFAULT_DT = 1 / 60;

  return {
    W, H, ownedCount, haloCount, coordsX, coordsY, fb, bbox,
    renderFrame(frame: number, dt?: number): Uint8Array {
      prog.step(dt === undefined ? DEFAULT_DT : dt);
      prog.render_tile(frame);
      return fb;
    },
    checkpoint: () => prog.checkpoint(),
    restore: (blob: Uint8Array) => prog.restore(blob)
  };
}

export const Host: HostModule = { createNode, fullRuns, rectRuns, countOwned, BPP };
export default Host;
