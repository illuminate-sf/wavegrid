/**
 * Server-side pattern engine: evaluates evalPattern code locally
 * so the UI grid preview stays in sync (same as animations/scenes).
 *
 * Uses Node's Function constructor — not sandboxed, but patterns
 * come from the trusted UI so this is acceptable for preview purposes.
 */

interface HSBColor {
  h: number;
  s: number;
  b: number;
}

interface PatternObj {
  render: (ctx: PatternCtx) => void;
  init?: (ctx: PatternCtx) => void;
  meta?: { name?: string };
}

interface PatternCtx {
  t: number;
  count: number;
  cols: number;
  rows: number;
  set: (idx: number, h: number, s: number, b: number) => void;
  get: (idx: number) => [number, number, number];
  fill: (h: number, s: number, b: number) => void;
  uv: (idx: number) => [number, number];
  polar: (idx: number) => [number, number];
}

export class ServerPatternEngine {
  private pattern: PatternObj | null = null;
  private startTime: number = 0;
  private gridSize: number;
  private cols: number;
  private rows: number;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.gridSize = cols * rows;
  }

  /**
   * Load a pattern from code string. Returns true if successful.
   */
  load(code: string): boolean {
    try {
      // Evaluate the pattern code — supports both expression and IIFE formats
      // eslint-disable-next-line no-new-func
      const factory = new Function(`"use strict"; return (${code});`);
      const result = factory();

      if (result && typeof result === 'object' && typeof result.render === 'function') {
        this.pattern = result as PatternObj;
        this.startTime = Date.now();
        if (this.pattern.init) {
          const ctx = this.makeCtx(new Array(this.gridSize).fill(null).map(() => ({ h: 0, s: 0, b: 0 })));
          try { this.pattern.init(ctx); } catch { /* ignore init errors */ }
        }
        return true;
      }
      return false;
    } catch {
      this.pattern = null;
      return false;
    }
  }

  /**
   * Stop the current pattern.
   */
  stop(): void {
    this.pattern = null;
  }

  /**
   * Returns true if a pattern is currently loaded.
   */
  get active(): boolean {
    return this.pattern !== null;
  }

  /**
   * Render one frame into the provided grid array.
   * Modifies grid in-place. Returns true if a pattern was rendered.
   */
  render(grid: HSBColor[]): boolean {
    if (!this.pattern) return false;

    const ctx = this.makeCtx(grid);
    try {
      this.pattern.render(ctx);
      return true;
    } catch {
      // Pattern crashed — stop it
      this.pattern = null;
      return false;
    }
  }

  private makeCtx(grid: HSBColor[]): PatternCtx {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const cols = this.cols;
    const rows = this.rows;
    const count = this.gridSize;

    return {
      t: elapsed,
      count,
      cols,
      rows,
      set(idx: number, h: number, s: number, b: number) {
        if (idx >= 0 && idx < count) {
          grid[idx] = { h: ((h % 360) + 360) % 360, s: Math.max(0, Math.min(100, s)), b: Math.max(0, Math.min(100, b)) };
        }
      },
      get(idx: number): [number, number, number] {
        if (idx >= 0 && idx < count) {
          const c = grid[idx];
          return [c.h, c.s, c.b];
        }
        return [0, 0, 0];
      },
      fill(h: number, s: number, b: number) {
        for (let i = 0; i < count; i++) {
          grid[i] = { h: ((h % 360) + 360) % 360, s: Math.max(0, Math.min(100, s)), b: Math.max(0, Math.min(100, b)) };
        }
      },
      uv(idx: number): [number, number] {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return [col / (cols - 1 || 1), row / (rows - 1 || 1)];
      },
      polar(idx: number): [number, number] {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = (cols - 1) / 2;
        const cy = (rows - 1) / 2;
        const dx = col - cx;
        const dy = row - cy;
        const r = Math.sqrt(dx * dx + dy * dy) / Math.max(cx, cy);
        const a = (Math.atan2(dy, dx) / Math.PI + 1) / 2;
        return [r, a];
      }
    };
  }
}
