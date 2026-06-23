/* =====================================================================
 * programs.js — a library of animation programs, all conforming to the
 * ABI (§4 / §11.2).  Each is built with defineProgram(), which supplies
 * configure / init / step / checkpoint / restore boilerplate so an author
 * only writes the per-frame render (and optional custom step).
 *
 * State convention: S.t is a time accumulator advanced by the default
 * step() (S.t += S.speed). Animations derive everything from S.t in
 * closed form, so they are render-set-blind and trivially checkpointable.
 * UMD: usable in Node (require) and the browser (<script src>).
 * ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Programs = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TAU = Math.PI * 2;
  const D120 = 2.09439510, D240 = 4.18879020;
  // Speeds are calibrated to this reference rate; step() advances S.t by
  // real elapsed time, so visual speed is identical at any framerate.
  const REF_FPS = 60;

  // ---- helpers --------------------------------------------------------
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function hsv(h, s, v, fb, o) {
    h -= Math.floor(h);
    const i = Math.floor(h * 6), f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = q;
    }
    fb[o] = (r * 255) | 0; fb[o + 1] = (g * 255) | 0; fb[o + 2] = (b * 255) | 0;
  }

  function firePal(v, fb, o) {
    v = clamp01(v);
    fb[o] = (clamp01(v * 3) * 255) | 0;
    fb[o + 1] = (clamp01(v * 3 - 1) * 255) | 0;
    fb[o + 2] = (clamp01(v * 3 - 2) * 255) | 0;
  }

  function hash11(n) {
    const s = Math.sin(n * 12.9898) * 43758.5453123;
    return s - Math.floor(s);
  }
  function hash2(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi),
      c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  }
  // one generation of Conway's Life on a toroidal grid (Tier-2 global state).
  function lifeStep(grid, age, W, H) {
    const next = new Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let nb = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = (x + dx + W) % W, ny = (y + dy + H) % H;
            nb += grid[ny * W + nx];
          }
        const i = y * W + x, alive = grid[i];
        const live = alive ? nb === 2 || nb === 3 : nb === 3;
        next[i] = live ? 1 : 0;
        age[i] = live ? (alive ? age[i] + 1 : 0) : 0;
      }
    }
    return next;
  }

  const enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
  const dec = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;
  function s2b(s) { return enc ? enc.encode(s) : Uint8Array.from(Buffer.from(s, "utf8")); }
  function b2s(b) { return dec ? dec.decode(b) : Buffer.from(b).toString("utf8"); }

  // ---- program builder -----------------------------------------------
  function defineProgram(def) {
    return {
      meta: { name: def.name },
      create() {
        let ctx = null, S = null;
        return {
          configure(c) { ctx = c; },
          init(params, seed) {
            S = Object.assign({ t: 0, speed: def.speed || 0.04 }, def.defaults);
            S.seed = seed >>> 0;
            if (def.init) def.init(S, ctx, params || {}, seed >>> 0);
          },
          // dt is elapsed seconds; S.t advances in real time (framerate-independent).
          step(dt) { if (def.step) def.step(S, dt, ctx); else S.t += S.speed * dt * REF_FPS; },
          render_tile(frame) { def.render(S, ctx, frame); },
          checkpoint() { return s2b(JSON.stringify(S)); },
          restore(blob) { S = JSON.parse(b2s(blob)); },
        };
      },
    };
  }

  // shorthand for per-frame geometry
  function geom(ctx) {
    const cx = (ctx.W - 1) / 2, cy = (ctx.H - 1) / 2;
    return { cx, cy, maxd: Math.sqrt(cx * cx + cy * cy) || 1 };
  }

  // ============================ THE LIBRARY ============================
  const P = [];

  // 0 — Color Wave (the original program, for reference)
  P.push(defineProgram({
    name: "Color Wave", speed: TAU / 120,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb,
        n = ctx.ownedCount + ctx.haloCount;
      const kx = TAU * 3 / ctx.W, ky = TAU / ctx.H;
      for (let i = 0; i < n; i++) {
        const a = kx * X[i] + ky * Y[i] - S.t, o = i * 3;
        fb[o] = (127.5 + 127.5 * Math.sin(a)) | 0;
        fb[o + 1] = (127.5 + 127.5 * Math.sin(a + D120)) | 0;
        fb[o + 2] = (127.5 + 127.5 * Math.sin(a + D240)) | 0;
      }
    },
  }));

  // 1 — Plasma
  P.push(defineProgram({
    name: "Plasma", speed: 0.05,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, t = S.t,
        n = ctx.ownedCount + ctx.haloCount;
      for (let i = 0; i < n; i++) {
        const x = X[i], y = Y[i];
        let v = Math.sin(x * 0.12 + t) + Math.sin(y * 0.13 - t)
          + Math.sin((x + y) * 0.09 + t) + Math.sin(Math.hypot(x - 50, y - 50) * 0.15);
        hsv(v * 0.12 + t * 0.05, 0.85, 1, fb, i * 3);
      }
    },
  }));

  // 2 — Ripple
  P.push(defineProgram({
    name: "Ripple", speed: 0.12,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx);
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(X[i] - cx, Y[i] - cy);
        const v = 0.5 + 0.5 * Math.sin(d * 0.5 - S.t * 3);
        hsv(0.55 + d * 0.004, 0.6, 0.15 + 0.85 * v, fb, i * 3);
      }
    },
  }));

  // 3 — Rainbow Spiral
  P.push(defineProgram({
    name: "Rainbow Spiral", speed: 0.04,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx);
      for (let i = 0; i < n; i++) {
        const dx = X[i] - cx, dy = Y[i] - cy;
        const ang = Math.atan2(dy, dx) / TAU, d = Math.hypot(dx, dy);
        hsv(ang + d * 0.03 - S.t, 0.9, 1, fb, i * 3);
      }
    },
  }));

  // 4 — Checkerboard Scroll
  P.push(defineProgram({
    name: "Checkerboard", speed: 0.6,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const cell = 10, off = S.t;
      for (let i = 0; i < n; i++) {
        const c = (Math.floor((X[i] + off) / cell) + Math.floor((Y[i] - off) / cell)) & 1;
        if (c) hsv(S.t * 0.02, 0.8, 1, fb, i * 3);
        else hsv(S.t * 0.02 + 0.5, 0.8, 0.25, fb, i * 3);
      }
    },
  }));

  // 5 — Barber Pole
  P.push(defineProgram({
    name: "Barber Pole", speed: 0.08,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const a = 0.7, ca = Math.cos(a), sa = Math.sin(a);
      for (let i = 0; i < n; i++) {
        const u = X[i] * ca + Y[i] * sa;
        hsv(u * 0.05 - S.t, 0.85, 1, fb, i * 3);
      }
    },
  }));

  // 6 — Noise Clouds
  P.push(defineProgram({
    name: "Noise Clouds", speed: 0.25,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      for (let i = 0; i < n; i++) {
        const v = vnoise(X[i] * 0.07 + S.t * 0.3, Y[i] * 0.07 - S.t * 0.15);
        hsv(0.6, 0.4 * v, 0.2 + 0.8 * v, fb, i * 3);
      }
    },
  }));

  // 7 — Fire
  P.push(defineProgram({
    name: "Fire", speed: 1.2,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount, H = ctx.H;
      for (let i = 0; i < n; i++) {
        const heat = Y[i] / (H - 1);
        let v = vnoise(X[i] * 0.16, Y[i] * 0.16 - S.t);
        firePal(v * (0.15 + heat * 1.5), fb, i * 3);
      }
    },
  }));

  // 8 — Starfield Twinkle
  P.push(defineProgram({
    name: "Starfield", speed: 0.15,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      for (let i = 0; i < n; i++) {
        const h = hash2(X[i], Y[i]), o = i * 3;
        if (h > 0.985) {
          const b = (0.5 + 0.5 * Math.sin(S.t * 4 + h * 200));
          fb[o] = (b * 255) | 0; fb[o + 1] = (b * 255) | 0; fb[o + 2] = (b * 255) | 0;
        } else { fb[o] = 4; fb[o + 1] = 6; fb[o + 2] = 18; }
      }
    },
  }));

  // 9 — Interference (two moving sources)
  P.push(defineProgram({
    name: "Interference", speed: 0.06,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx);
      const ax = cx + Math.cos(S.t) * cx * 0.6, ay = cy + Math.sin(S.t * 1.3) * cy * 0.6;
      const bx = cx - Math.cos(S.t * 0.8) * cx * 0.6, by = cy - Math.sin(S.t) * cy * 0.6;
      for (let i = 0; i < n; i++) {
        const d1 = Math.hypot(X[i] - ax, Y[i] - ay), d2 = Math.hypot(X[i] - bx, Y[i] - by);
        const v = 0.5 + 0.25 * (Math.sin(d1 * 0.7) + Math.sin(d2 * 0.7));
        hsv(0.8 + v * 0.3, 0.7, v, fb, i * 3);
      }
    },
  }));

  // 10 — Diagonal Rainbow
  P.push(defineProgram({
    name: "Diagonal Rainbow", speed: 0.05,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const inv = 1 / (ctx.W + ctx.H);
      for (let i = 0; i < n; i++) hsv((X[i] + Y[i]) * inv * 2 - S.t, 0.95, 1, fb, i * 3);
    },
  }));

  // 11 — Breathing Radial
  P.push(defineProgram({
    name: "Breathing", speed: 0.05,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy, maxd } = geom(ctx);
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(X[i] - cx, Y[i] - cy) / maxd;
        const v = 0.5 + 0.5 * Math.sin(S.t * 2 - d * 4);
        hsv(d * 0.5 + S.t * 0.1, 0.8, v, fb, i * 3);
      }
    },
  }));

  // 12 — Concentric Rings
  P.push(defineProgram({
    name: "Concentric Rings", speed: 0.06,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx);
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(X[i] - cx, Y[i] - cy);
        const r = Math.sin(d * 0.6 - S.t * 4);
        hsv(Math.floor(d / 8) * 0.12 + S.t * 0.05, 0.85, 0.3 + 0.7 * (0.5 + 0.5 * r), fb, i * 3);
      }
    },
  }));

  // 13 — Pinwheel
  P.push(defineProgram({
    name: "Pinwheel", speed: 0.03,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx), sectors = 12;
      for (let i = 0; i < n; i++) {
        const ang = Math.atan2(Y[i] - cy, X[i] - cx) / TAU + S.t;
        const s = Math.floor((ang - Math.floor(ang)) * sectors);
        hsv(s / sectors, 0.9, 1, fb, i * 3);
      }
    },
  }));

  // 14 — Lissajous Blob
  P.push(defineProgram({
    name: "Lissajous Blob", speed: 0.05,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx);
      const bx = cx + Math.sin(S.t * 3) * cx * 0.8, by = cy + Math.sin(S.t * 2 + 1) * cy * 0.8;
      const sig = 90;
      for (let i = 0; i < n; i++) {
        const dx = X[i] - bx, dy = Y[i] - by;
        const v = Math.exp(-(dx * dx + dy * dy) / sig);
        hsv(S.t * 0.2, 0.6, v, fb, i * 3);
      }
    },
  }));

  // 15 — Voronoi Cells
  P.push(defineProgram({
    name: "Voronoi Cells", speed: 0.03,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx), K = 7, px = [], py = [];
      for (let k = 0; k < K; k++) {
        px[k] = cx + Math.cos(S.t * (0.5 + 0.15 * k) + k * 1.7) * cx * 0.7;
        py[k] = cy + Math.sin(S.t * (0.4 + 0.12 * k) + k * 2.3) * cy * 0.7;
      }
      for (let i = 0; i < n; i++) {
        let d1 = 1e9, d2 = 1e9, bi = 0;
        for (let k = 0; k < K; k++) {
          const dx = X[i] - px[k], dy = Y[i] - py[k], dd = dx * dx + dy * dy;
          if (dd < d1) { d2 = d1; d1 = dd; bi = k; } else if (dd < d2) d2 = dd;
        }
        const edge = clamp01((Math.sqrt(d2) - Math.sqrt(d1)) * 0.2);
        hsv(bi / K, 0.7, 0.2 + 0.8 * edge, fb, i * 3);
      }
    },
  }));

  // 16 — Matrix Rain
  P.push(defineProgram({
    name: "Matrix Rain", speed: 0.9,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount, H = ctx.H;
      const L = 16;
      for (let i = 0; i < n; i++) {
        const col = X[i], y = Y[i], o = i * 3;
        const sp = 0.4 + 0.9 * hash11(col * 1.7);
        const head = (hash11(col * 3.1) * H + S.t * sp) % H;
        let d = head - y; if (d < 0) d += H;
        if (d < 1.4) { fb[o] = 200; fb[o + 1] = 255; fb[o + 2] = 200; }
        else if (d < L) { const b = 1 - d / L; fb[o] = (20 * b) | 0; fb[o + 1] = (200 * b) | 0; fb[o + 2] = (50 * b) | 0; }
        else { fb[o] = 0; fb[o + 1] = 8; fb[o + 2] = 0; }
      }
    },
  }));

  // 17 — Twister Columns
  P.push(defineProgram({
    name: "Twister", speed: 0.07,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      for (let i = 0; i < n; i++) {
        const x = X[i], y = Y[i];
        const warp = Math.sin(S.t + x * 0.2) * 10;
        const v = 0.5 + 0.5 * Math.sin((y + warp) * 0.4);
        hsv(x / ctx.W + S.t * 0.1, 0.85, v, fb, i * 3);
      }
    },
  }));

  // 18 — XOR Pattern
  P.push(defineProgram({
    name: "XOR Pattern", speed: 0.8,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const off = S.t | 0;
      for (let i = 0; i < n; i++) {
        const v = ((X[i] ^ Y[i]) + off) & 255;
        hsv(v / 255, 0.9, 1, fb, i * 3);
      }
    },
  }));

  // 19 — Julia Set (animated)
  P.push(defineProgram({
    name: "Julia Set", speed: 0.02,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const W = ctx.W, H = ctx.H, maxIter = 64;
      const cre = 0.7885 * Math.cos(S.t), cim = 0.7885 * Math.sin(S.t);
      for (let i = 0; i < n; i++) {
        let zx = (X[i] / W * 2 - 1) * 1.6, zy = (Y[i] / H * 2 - 1) * 1.6, it = 0;
        while (it < maxIter && zx * zx + zy * zy < 4) {
          const xt = zx * zx - zy * zy + cre; zy = 2 * zx * zy + cim; zx = xt; it++;
        }
        if (it >= maxIter) { const o = i * 3; fb[o] = 0; fb[o + 1] = 0; fb[o + 2] = 0; }
        else hsv(it / maxIter + S.t * 0.1, 0.9, 1, fb, i * 3);
      }
    },
  }));

  // 20 — Kaleidoscope
  P.push(defineProgram({
    name: "Kaleidoscope", speed: 0.03,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx), sectors = 6;
      for (let i = 0; i < n; i++) {
        const dx = X[i] - cx, dy = Y[i] - cy;
        let ang = Math.atan2(dy, dx);
        const seg = TAU / sectors;
        ang = Math.abs(((ang % seg) + seg) % seg - seg / 2);
        const r = Math.hypot(dx, dy);
        const v = 0.5 + 0.5 * Math.sin(r * 0.4 - S.t * 3 + ang * 6);
        hsv(ang * 0.5 + r * 0.01 + S.t * 0.1, 0.85, 0.25 + 0.75 * v, fb, i * 3);
      }
    },
  }));

  // 21 — Swirl Vortex
  P.push(defineProgram({
    name: "Swirl Vortex", speed: 0.04,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx);
      for (let i = 0; i < n; i++) {
        const dx = X[i] - cx, dy = Y[i] - cy, r = Math.hypot(dx, dy);
        const a = Math.atan2(dy, dx) + r * 0.05 - S.t;
        hsv(a / TAU, 0.8, 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(r * 0.5 - S.t * 2)), fb, i * 3);
      }
    },
  }));

  // 22 — Moiré
  P.push(defineProgram({
    name: "Moiré", speed: 0.4,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const c = Math.cos(S.t * 0.1), s = Math.sin(S.t * 0.1);
      for (let i = 0; i < n; i++) {
        const x = X[i], y = Y[i];
        const g1 = Math.sin(x * 0.5) * Math.sin(y * 0.5);
        const g2 = Math.sin((x * c - y * s) * 0.5) * Math.sin((x * s + y * c) * 0.5);
        const v = (g1 + g2) * 0.5;
        hsv(0.6 + v * 0.3, 0.5, 0.5 + 0.5 * v, fb, i * 3);
      }
    },
  }));

  // 23 — Tunnel
  P.push(defineProgram({
    name: "Tunnel", speed: 0.05,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy, maxd } = geom(ctx);
      for (let i = 0; i < n; i++) {
        const dx = X[i] - cx, dy = Y[i] - cy, r = Math.hypot(dx, dy) || 0.001;
        const depth = 2 / (r * 0.04 + 0.2) + S.t * 2;
        const aa = (Math.atan2(dy, dx) / TAU) * 10;
        const chk = (Math.floor(depth) + Math.floor(aa)) & 1;
        const fade = clamp01(r / maxd);
        hsv(depth * 0.02, 0.6, chk ? fade : fade * 0.3, fb, i * 3);
      }
    },
  }));

  // 24 — Sine Plaid
  P.push(defineProgram({
    name: "Sine Plaid", speed: 0.04,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      for (let i = 0; i < n; i++) {
        const sx = 0.5 + 0.5 * Math.sin(X[i] * 0.3 - S.t * 2);
        const sy = 0.5 + 0.5 * Math.sin(Y[i] * 0.3 + S.t * 1.5);
        hsv(0.5 + (sx - sy) * 0.3, 0.6, sx * sy, fb, i * 3);
      }
    },
  }));

  // 25 — Conic Gradient
  P.push(defineProgram({
    name: "Conic Gradient", speed: 0.05,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx);
      for (let i = 0; i < n; i++)
        hsv(Math.atan2(Y[i] - cy, X[i] - cx) / TAU + S.t, 0.9, 1, fb, i * 3);
    },
  }));

  // 26 — Metaballs
  P.push(defineProgram({
    name: "Metaballs", speed: 0.04,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx), K = 5, px = [], py = [];
      for (let k = 0; k < K; k++) {
        px[k] = cx + Math.cos(S.t * (1 + 0.2 * k) + k * 2) * cx * 0.7;
        py[k] = cy + Math.sin(S.t * (0.8 + 0.25 * k) + k) * cy * 0.7;
      }
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let k = 0; k < K; k++) {
          const dx = X[i] - px[k], dy = Y[i] - py[k];
          sum += 220 / (dx * dx + dy * dy + 1);
        }
        const v = clamp01(sum);
        hsv(0.75 + v * 0.4 + S.t * 0.05, 0.7, v, fb, i * 3);
      }
    },
  }));

  // 27 — Diamonds
  P.push(defineProgram({
    name: "Diamonds", speed: 0.06,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx);
      for (let i = 0; i < n; i++) {
        const d = Math.abs(X[i] - cx) + Math.abs(Y[i] - cy);
        const v = 0.5 + 0.5 * Math.sin(d * 0.4 - S.t * 3);
        hsv(d * 0.01 + S.t * 0.05, 0.8, 0.3 + 0.7 * v, fb, i * 3);
      }
    },
  }));

  // 28 — Radar Sweep
  P.push(defineProgram({
    name: "Radar Sweep", speed: 0.03,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy, maxd } = geom(ctx);
      const sweep = ((S.t % TAU) + TAU) % TAU;
      for (let i = 0; i < n; i++) {
        const dx = X[i] - cx, dy = Y[i] - cy, r = Math.hypot(dx, dy) / maxd;
        let da = Math.atan2(dy, dx) - sweep; da = ((da % TAU) + TAU) % TAU;
        const beam = Math.exp(-da * 1.2);
        const rings = Math.sin(r * 22) > 0 ? 1 : 0.55;
        hsv(0.33, 0.85, clamp01(beam) * (0.35 + 0.65 * rings), fb, i * 3);
      }
    },
  }));

  // 29 — TV Static
  P.push(defineProgram({
    name: "TV Static", speed: 0.5,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const fr = Math.floor(S.t * 60);
      for (let i = 0; i < n; i++) {
        const g = (hash2(X[i] + fr * 131, Y[i] - fr * 57) * 255) | 0, o = i * 3;
        fb[o] = g; fb[o + 1] = g; fb[o + 2] = g;
      }
    },
  }));

  // 30 — Scanlines
  P.push(defineProgram({
    name: "Scanlines", speed: 0.05,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount, H = ctx.H;
      for (let i = 0; i < n; i++) {
        const y = Y[i];
        const roll = ((y / H + S.t * 0.2) % 1 + 1) % 1;
        const bar = Math.exp(-((roll - 0.5) * (roll - 0.5)) / 0.02);
        const scan = y % 2 === 0 ? 1 : 0.6;
        const base = 0.5 + 0.5 * Math.sin(X[i] * 0.2 - S.t * 3);
        hsv(0.55, 0.5, clamp01(scan * (0.3 + 0.7 * base) + bar * 0.5), fb, i * 3);
      }
    },
  }));

  // 31 — Honeycomb
  P.push(defineProgram({
    name: "Honeycomb", speed: 0.04,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const th = [0, TAU / 3, 2 * TAU / 3], cs = th.map(Math.cos), sn = th.map(Math.sin);
      for (let i = 0; i < n; i++) {
        let q = 0;
        for (let k = 0; k < 3; k++) q += Math.cos((X[i] * cs[k] + Y[i] * sn[k]) * 0.6 - S.t * 2);
        const v = 0.5 + q / 6;
        hsv(0.12 + 0.1 * Math.sin(S.t), 0.7, clamp01(v), fb, i * 3);
      }
    },
  }));

  // 32 — Sierpinski
  P.push(defineProgram({
    name: "Sierpinski", speed: 0.3,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const off = S.t | 0;
      for (let i = 0; i < n; i++) {
        const o = i * 3;
        if ((((X[i] + off) & (Y[i] + off)) === 0)) hsv((X[i] + Y[i]) * 0.005 + S.t * 0.1, 0.9, 1, fb, o);
        else { fb[o] = 8; fb[o + 1] = 10; fb[o + 2] = 26; }
      }
    },
  }));

  // 33 — Rotating Checkerboard
  P.push(defineProgram({
    name: "Rot. Checkerboard", speed: 0.03,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx), c = Math.cos(S.t), s = Math.sin(S.t), cell = 10;
      for (let i = 0; i < n; i++) {
        const dx = X[i] - cx, dy = Y[i] - cy;
        const xr = dx * c - dy * s, yr = dx * s + dy * c;
        const chk = (Math.floor(xr / cell) + Math.floor(yr / cell)) & 1;
        hsv(S.t * 0.05 + chk * 0.5, 0.7, chk ? 1 : 0.3, fb, i * 3);
      }
    },
  }));

  // 34 — Aurora
  P.push(defineProgram({
    name: "Aurora", speed: 0.04,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount, H = ctx.H;
      for (let i = 0; i < n; i++) {
        const x = X[i], y = Y[i];
        const band = 0.5 + 0.5 * Math.sin(x * 0.08 + Math.sin(S.t + x * 0.02) * 2 + S.t);
        const v = band * (1 - y / H);
        hsv(0.35 + 0.12 * band, 0.8, clamp01(v * 1.3), fb, i * 3);
      }
    },
  }));

  // 35 — Spotlight
  P.push(defineProgram({
    name: "Spotlight", speed: 0.05,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { cx, cy } = geom(ctx);
      const sx = cx + Math.sin(S.t) * cx * 0.7, sy = cy + Math.cos(S.t * 1.3) * cy * 0.7;
      const inv = 1 / (ctx.W + ctx.H);
      for (let i = 0; i < n; i++) {
        const light = clamp01(1 - Math.hypot(X[i] - sx, Y[i] - sy) / 28);
        hsv((X[i] + Y[i]) * inv * 2, 0.6, 0.08 + 0.92 * light, fb, i * 3);
      }
    },
  }));

  // 36 — Triangle Bands
  P.push(defineProgram({
    name: "Triangle Bands", speed: 0.04,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      for (let i = 0; i < n; i++) {
        const p = (X[i] + Y[i]) * 0.06 - S.t;
        const tw = Math.abs((p - Math.floor(p)) - 0.5) * 2;
        hsv(0.55 + tw * 0.3, 0.7, 0.3 + 0.7 * tw, fb, i * 3);
      }
    },
  }));

  // 37 — Pulse Grid
  P.push(defineProgram({
    name: "Pulse Grid", speed: 0.05,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const cell = 12;
      for (let i = 0; i < n; i++) {
        const x = X[i], y = Y[i];
        const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
        const px = (x % cell) - cell / 2, py = (y % cell) - cell / 2;
        const dot = clamp01(1 - Math.hypot(px, py) / (cell * 0.4));
        const pulse = 0.5 + 0.5 * Math.sin(S.t * 3 - (gx + gy) * 0.6);
        hsv((gx + gy) * 0.05 + S.t * 0.05, 0.8, dot * pulse, fb, i * 3);
      }
    },
  }));

  // 38 — Mandelbrot (animated zoom)
  P.push(defineProgram({
    name: "Mandelbrot", speed: 0.04,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const W = ctx.W, H = ctx.H, maxIter = 60;
      const scale = 1.5 * (0.32 + 0.68 * (0.5 + 0.5 * Math.sin(S.t * 0.3)));
      const ox = -0.743643887, oy = 0.131825904;
      for (let i = 0; i < n; i++) {
        const re = ox + (X[i] / W * 2 - 1) * scale, im = oy + (Y[i] / H * 2 - 1) * scale;
        let zr = 0, zi = 0, it = 0;
        while (it < maxIter && zr * zr + zi * zi < 4) {
          const t = zr * zr - zi * zi + re; zi = 2 * zr * zi + im; zr = t; it++;
        }
        const o = i * 3;
        if (it >= maxIter) { fb[o] = 0; fb[o + 1] = 0; fb[o + 2] = 0; }
        else hsv(it / maxIter + S.t * 0.05, 0.85, 1, fb, o);
      }
    },
  }));

  // 39 — Game of Life (Tier-2 global state)
  P.push(defineProgram({
    name: "Game of Life", defaults: { acc: 0 },
    init(S, ctx, params, seed) {
      const W = ctx.W, H = ctx.H, g = new Array(W * H), age = new Array(W * H).fill(0);
      for (let i = 0; i < W * H; i++)
        g[i] = hash2((i % W) + seed * 0.13, (i / W | 0) - seed * 0.07) > 0.72 ? 1 : 0;
      S.grid = g; S.age = age;
    },
    step(S, dt, ctx) {
      S.acc += dt;
      const interval = 0.1; // seconds per generation (framerate-independent)
      while (S.acc >= interval) { S.acc -= interval; S.grid = lifeStep(S.grid, S.age, ctx.W, ctx.H); }
    },
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, W = ctx.W, n = ctx.ownedCount + ctx.haloCount;
      for (let i = 0; i < n; i++) {
        const gi = Y[i] * W + X[i], o = i * 3;
        if (S.grid[gi]) hsv(0.33 - Math.min(S.age[gi], 40) * 0.006, 0.7, 1, fb, o);
        else { fb[o] = 6; fb[o + 1] = 12; fb[o + 2] = 8; }
      }
    },
  }));

  // 40 — Rain Rings
  P.push(defineProgram({
    name: "Rain Rings", speed: 0.05,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb, n = ctx.ownedCount + ctx.haloCount;
      const { maxd } = geom(ctx), K = 6, dx0 = [], dy0 = [], ph = [];
      for (let k = 0; k < K; k++) {
        dx0[k] = hash11(k * 1.3) * ctx.W; dy0[k] = hash11(k * 2.7) * ctx.H; ph[k] = hash11(k * 5.1);
      }
      for (let i = 0; i < n; i++) {
        let v = 0;
        for (let k = 0; k < K; k++) {
          const age = ((S.t * 0.5 + ph[k]) % 1 + 1) % 1;
          const radius = age * maxd;
          const dd = Math.abs(Math.hypot(X[i] - dx0[k], Y[i] - dy0[k]) - radius);
          v += Math.max(0, 1 - dd / 2) * (1 - age);
        }
        hsv(0.55, 0.5, clamp01(v), fb, i * 3);
      }
    },
  }));

  // ============================ FLAGS =================================
  // Authored in normalized coords (u,v ∈ 0..1) so they render at any
  // resolution. A subtle time-based "sheen" keeps them gently animated
  // (and makes them legible as running programs). Designs are limited to
  // stripes / Nordic crosses / a disc — patterns that survive 7x7.
  const OUT = [0, 0, 0];
  function defineFlag(name, draw) {
    return defineProgram({
      name, speed: 0.04,
      render(S, ctx) {
        const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb,
          W = ctx.W, H = ctx.H, n = ctx.ownedCount + ctx.haloCount;
        for (let i = 0; i < n; i++) {
          const u = (X[i] + 0.5) / W, v = (Y[i] + 0.5) / H;
          draw(u, v, OUT);
          const sh = 0.92 + 0.08 * Math.sin((u - v) * 5 + S.t * 2); // cloth sheen
          const o = i * 3;
          fb[o] = (OUT[0] * sh) | 0;
          fb[o + 1] = (OUT[1] * sh) | 0;
          fb[o + 2] = (OUT[2] * sh) | 0;
        }
      },
    });
  }
  const set3 = (out, k) => { out[0] = k[0]; out[1] = k[1]; out[2] = k[2]; };
  const vtri = (a, b, c) => (u, _v, out) => set3(out, u < 1 / 3 ? a : u < 2 / 3 ? b : c);
  const htri = (a, b, c) => (_u, v, out) => set3(out, v < 1 / 3 ? a : v < 2 / 3 ? b : c);
  const hduo = (a, b) => (_u, v, out) => set3(out, v < 0.5 ? a : b);
  const nordic = (field, cross) => (u, v, out) =>
    set3(out, Math.abs(u - 0.33) < 0.08 || Math.abs(v - 0.5) < 0.08 ? cross : field);

  P.push(defineFlag("France", vtri([0, 85, 164], [255, 255, 255], [239, 65, 53])));
  P.push(defineFlag("Italy", vtri([0, 146, 70], [255, 255, 255], [206, 43, 55])));
  P.push(defineFlag("Ireland", vtri([22, 155, 98], [255, 255, 255], [255, 136, 62])));
  P.push(defineFlag("Belgium", vtri([0, 0, 0], [255, 233, 0], [237, 41, 57])));
  P.push(defineFlag("Romania", vtri([0, 43, 127], [252, 209, 22], [206, 17, 38])));
  P.push(defineFlag("Nigeria", vtri([0, 135, 81], [255, 255, 255], [0, 135, 81])));
  P.push(defineFlag("Germany", htri([0, 0, 0], [221, 0, 0], [255, 206, 0])));
  P.push(defineFlag("Netherlands", htri([174, 28, 40], [255, 255, 255], [33, 70, 139])));
  P.push(defineFlag("Russia", htri([255, 255, 255], [0, 57, 166], [213, 43, 30])));
  P.push(defineFlag("Hungary", htri([206, 42, 62], [255, 255, 255], [67, 111, 77])));
  P.push(defineFlag("Austria", htri([237, 41, 57], [255, 255, 255], [237, 41, 57])));
  P.push(defineFlag("Ukraine", hduo([0, 87, 183], [255, 215, 0])));
  P.push(defineFlag("Poland", hduo([255, 255, 255], [212, 33, 61])));
  P.push(defineFlag("Sweden", nordic([0, 106, 167], [254, 204, 0])));
  P.push(defineFlag("Denmark", nordic([198, 12, 48], [255, 255, 255])));
  P.push(defineFlag("Japan", (u, v, out) => {
    const dx = u - 0.5, dy = v - 0.5;
    set3(out, dx * dx + dy * dy < 0.30 * 0.30 ? [188, 0, 45] : [255, 255, 255]);
  }));
  // USA — resolution-aware so it stays legible at 7x7. At low resolution it
  // uses 7 alternating stripes and a checkerboard "star field" canton; at
  // high resolution, the full 13 stripes and a star dot-grid.
  const USA_RED = [178, 34, 52], USA_WHITE = [255, 255, 255], USA_BLUE = [60, 59, 110];
  P.push(defineProgram({
    name: "USA", speed: 0.04,
    render(S, ctx) {
      const X = ctx.coordsX, Y = ctx.coordsY, fb = ctx.fb,
        W = ctx.W, H = ctx.H, n = ctx.ownedCount + ctx.haloCount;
      const low = H <= 16;
      const nStripes = low ? 7 : 13;
      const cc = Math.max(1, Math.round(W * 0.43)); // canton cols (3 at W=7)
      const cr = Math.max(1, Math.round(H * 0.43)); // canton rows (3 at H=7)
      for (let i = 0; i < n; i++) {
        const x = X[i], y = Y[i], u = (x + 0.5) / W, v = (y + 0.5) / H;
        let col = Math.floor(v * nStripes) % 2 === 0 ? USA_RED : USA_WHITE;
        if (low) {
          if (x < cc && y < cr) col = (x + y) % 2 === 1 ? USA_WHITE : USA_BLUE;
        } else if (u < 0.4 && v < 7 / 13) {
          const c = (u / 0.4) * 11, row = (v / (7 / 13)) * 9, off = (Math.floor(row) % 2) * 0.5;
          const fx = Math.abs(((c + off) % 1) - 0.5), fy = Math.abs((row % 1) - 0.5);
          col = fx < 0.2 && fy < 0.2 ? USA_WHITE : USA_BLUE;
        }
        const sh = 0.92 + 0.08 * Math.sin((u - v) * 5 + S.t * 2);
        const o = i * 3;
        fb[o] = (col[0] * sh) | 0; fb[o + 1] = (col[1] * sh) | 0; fb[o + 2] = (col[2] * sh) | 0;
      }
    },
  }));

  return P.map((p) => ({ name: p.meta.name, factory: p }));
});
