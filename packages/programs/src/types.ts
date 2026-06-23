/**
 * Types for the program library and host ABI.
 */

/** A run: [start, length] where start = y*W + x (row-major). */
export type Run = [start: number, length: number];

/** Bounding box of a render set. */
export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Host services injected into each program (ABI section 5). */
export interface HostServices {
  canvas_size(): [number, number];
  render_set(): { ownedCount: number; haloCount: number; bbox: BBox };
  frame_time(frame: number): number;
  asset_region(): number;
  asset_info(): number;
  log(level: number, msg: string): void;
}

/** Runtime context for a program instance (ABI section 6). */
export interface ProgramContext {
  W: number;
  H: number;
  runs: Run[];
  haloRuns: Run[];
  ownedCount: number;
  haloCount: number;
  coordsX: Int32Array;
  coordsY: Int32Array;
  fb: Uint8Array;
  format: 'rgb888';
  bpp: number;
  bbox: BBox;
  host: HostServices;
}

/** A program instance after creation. */
export interface ProgramInstance {
  configure(ctx: ProgramContext): void;
  init(params: Record<string, unknown> | null, seed: number): void;
  step(dt: number): void;
  render_tile(frame: number): void;
  checkpoint(): Uint8Array;
  restore(blob: Uint8Array): void;
}

/** A program factory (output of defineProgram().factory). */
export interface ProgramFactory {
  meta: { name: string };
  create(): ProgramInstance;
}

/** A program entry as exported by programs.js. */
export interface ProgramEntry {
  name: string;
  factory: ProgramFactory;
}

/** Node returned by Host.createNode(). */
export interface RenderNode {
  W: number;
  H: number;
  ownedCount: number;
  haloCount: number;
  coordsX: Int32Array;
  coordsY: Int32Array;
  fb: Uint8Array;
  bbox: BBox;
  renderFrame(frame: number, dt?: number): Uint8Array;
  checkpoint(): Uint8Array;
  restore(blob: Uint8Array): void;
}

/** Options for createNode(). */
export interface CreateNodeOptions {
  W: number;
  H: number;
  runs?: Run[];
  haloRuns?: Run[];
  fps?: number;
  seed?: number;
  params?: Record<string, unknown>;
}

/** The Host module interface. */
export interface HostModule {
  BPP: number;
  createNode(factory: ProgramFactory, opts: CreateNodeOptions): RenderNode;
  fullRuns(W: number, H: number): Run[];
  rectRuns(W: number, H: number, x0: number, y0: number, w: number, h: number): Run[];
  countOwned(runs: Run[]): number;
}
