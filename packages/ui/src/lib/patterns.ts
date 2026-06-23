/**
 * Pattern snippets for the wavegrid UI.
 * Each pattern is a JS snippet that runs in the QuickJS sandbox on the agent.
 */

export interface SnippetPattern {
  name: string;
  code: string;
  speed?: number;
  gradient: string;
}

/* ---------- Scenes (static / slow-moving color fills) ---------- */

export const SCENES: SnippetPattern[] = [
  {
    name: 'Civic',
    gradient: 'linear-gradient(135deg, #1a3a8a, #2563eb, #60a5fa)',
    code: `var meta = { name: 'Civic' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var h = 210 + uv[0] * 20 + Math.sin(ctx.t * 0.3 + uv[1] * 3) * 10;
    ctx.setHSV(i, h, 90, 70 + uv[1] * 20);
  }
}`
  },
  {
    name: 'Pride',
    gradient: 'linear-gradient(135deg, #e33, #f90, #ee0, #3a5, #35e, #a3e)',
    code: `var meta = { name: 'Pride' };
var colors = [[228,3,3],[255,140,0],[255,237,0],[0,128,38],[0,77,255],[117,7,135]];
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var stripe = Math.floor(uv[1] * 6);
    if (stripe > 5) stripe = 5;
    var c = colors[stripe];
    var sh = 0.92 + 0.08 * Math.sin((uv[0] - uv[1]) * 5 + ctx.t * 2);
    ctx.setRGB(i, c[0] * sh, c[1] * sh, c[2] * sh);
  }
}`
  },
  {
    name: 'Gold',
    gradient: 'linear-gradient(135deg, #b8860b, #ffd700, #f0c040)',
    code: `var meta = { name: 'Gold' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var shimmer = 0.85 + 0.15 * Math.sin(uv[0] * 4 + uv[1] * 3 + ctx.t * 1.5);
    ctx.setHSV(i, 45 + uv[0] * 5, 100, 80 * shimmer);
  }
}`
  },
  {
    name: 'White',
    gradient: 'linear-gradient(135deg, #ccc, #fff, #ddd)',
    code: `var meta = { name: 'White' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    ctx.setHSV(i, 0, 0, 100);
  }
}`
  },
  {
    name: 'Solstice',
    gradient: 'linear-gradient(135deg, #c2410c, #ea580c, #f97316)',
    code: `var meta = { name: 'Solstice' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var h = 15 + uv[1] * 25 + Math.sin(ctx.t * 0.5 + uv[0] * 4) * 8;
    ctx.setHSV(i, h, 95, 75 + uv[0] * 15);
  }
}`
  },
  {
    name: 'Ocean',
    gradient: 'linear-gradient(135deg, #0e4580, #0891b2, #22d3ee)',
    code: `var meta = { name: 'Ocean' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var wave = Math.sin(uv[0] * 4 + ctx.t * 1.5) * 0.1 + Math.sin(uv[0] * 7 - ctx.t * 2) * 0.05;
    var depth = uv[1] + wave;
    ctx.setHSV(i, 200 + depth * 20, 70 + depth * 20, 90 - depth * 50);
  }
}`
  },
  {
    name: 'Sunset',
    gradient: 'linear-gradient(135deg, #c2185b, #e65100, #f9a825)',
    code: `var meta = { name: 'Sunset' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var h = ctx.lerp(30, 280, uv[1]);
    var wobble = Math.sin(uv[0] * 3 + ctx.t) * 5;
    ctx.setHSV(i, h + wobble, 90, 100 - uv[1] * 30);
  }
}`
  },
  {
    name: 'Off',
    gradient: 'linear-gradient(135deg, #1a1a25, #0e0e14)',
    code: `var meta = { name: 'Off' };
function render(ctx) { ctx.clear(); }`
  }
];

/* ---------- Animations (dynamic patterns) ---------- */

export const ANIMATIONS: SnippetPattern[] = [
  {
    name: 'Wave',
    gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)',
    code: `var meta = { name: 'Wave' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var v = 0.5 + 0.5 * Math.sin(uv[0] * 6 + ctx.t * 3);
    ctx.setHSV(i, 220, 80, 20 + 80 * v);
  }
}`
  },
  {
    name: 'Breathe',
    gradient: 'linear-gradient(135deg, #4338ca, #6366f1)',
    code: `var meta = { name: 'Breathe' };
function render(ctx) {
  var b = 50 + 50 * Math.sin(ctx.t * 2);
  ctx.fill(200, 80, b);
}`
  },
  {
    name: 'Rainbow',
    gradient: 'linear-gradient(135deg, #e33, #ee0, #3a5, #35e)',
    code: `var meta = { name: 'Rainbow' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var h = (uv[0] + uv[1] + ctx.t * 0.3) * 360 % 360;
    ctx.setHSV(i, h, 100, 100);
  }
}`
  },
  {
    name: 'Pacman',
    gradient: 'linear-gradient(135deg, #ca8a04, #facc15)',
    code: `var meta = { name: 'Pacman' };
function render(ctx) {
  ctx.clear();
  var col = Math.floor(ctx.t * 3) % ctx.cols;
  var row = Math.floor(ctx.t * 3 / ctx.cols) % ctx.rows;
  for (var i = 0; i < ctx.count; i++) {
    var xy = ctx.xy(i);
    if (xy[0] === col && xy[1] === row) ctx.setHSV(i, 50, 100, 100);
    else if ((xy[0] + xy[1]) % 3 === 0) ctx.setHSV(i, 0, 0, 15);
  }
}`
  },
  {
    name: 'Spiral',
    gradient: 'linear-gradient(135deg, #7e22ce, #a855f7)',
    code: `var meta = { name: 'Spiral' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var p = ctx.polar(i);
    var h = (p[1] / Math.PI * 180 + p[0] * 360 - ctx.t * 120) % 360;
    ctx.setHSV(i, h, 90, 80 + 20 * p[0]);
  }
}`
  },
  {
    name: 'Rain',
    gradient: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
    code: `var meta = { name: 'Rain' };
function render(ctx) {
  ctx.fade(0.85);
  for (var i = 0; i < ctx.count; i++) {
    var xy = ctx.xy(i);
    var drop = (xy[1] + ctx.t * 8 + Math.sin(xy[0] * 2.5) * 2) % ctx.rows;
    if (drop < 1) ctx.setHSV(i, 200, 80, 100);
  }
}`
  },
  {
    name: 'Heartbeat',
    gradient: 'linear-gradient(135deg, #b91c1c, #ef4444)',
    code: `var meta = { name: 'Heartbeat' };
function render(ctx) {
  var beat = ctx.t * 1.2;
  var phase = beat - Math.floor(beat);
  var pulse = phase < 0.15 ? Math.sin(phase / 0.15 * Math.PI) :
              phase < 0.3 ? Math.sin((phase - 0.15) / 0.15 * Math.PI) * 0.6 : 0;
  for (var i = 0; i < ctx.count; i++) {
    var p = ctx.polar(i);
    var v = pulse * (1 - p[0] * 0.7);
    ctx.setHSV(i, 0, 90, Math.max(0, v * 100));
  }
}`
  },
  {
    name: 'Plasma',
    gradient: 'linear-gradient(135deg, #c026d3, #e879f9)',
    code: `var meta = { name: 'Plasma' };
function render(ctx) {
  var t = ctx.t;
  for (var i = 0; i < ctx.count; i++) {
    var xy = ctx.xy(i);
    var v = Math.sin(xy[0] * 0.8 + t) + Math.sin(xy[1] * 0.6 - t)
      + Math.sin((xy[0] + xy[1]) * 0.5 + t * 0.7);
    ctx.setHSV(i, (v * 60 + t * 30) % 360, 90, 90);
  }
}`
  },
  {
    name: 'Fire',
    gradient: 'linear-gradient(135deg, #b91c1c, #f97316, #facc15)',
    code: `var meta = { name: 'Fire' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var heat = ctx.noise(uv[0] * 3, uv[1] * 2 - ctx.t * 2, ctx.t * 0.5);
    heat *= (1 - uv[1]);
    var r = ctx.clamp(heat * 3, 0, 1) * 255;
    var g = ctx.clamp(heat * 3 - 1, 0, 1) * 255;
    var b = ctx.clamp(heat * 3 - 2, 0, 1) * 255;
    ctx.setRGB(i, r, g, b);
  }
}`
  },
  {
    name: 'Matrix',
    gradient: 'linear-gradient(135deg, #064e3b, #10b981)',
    code: `var meta = { name: 'Matrix' };
function render(ctx) {
  ctx.clear();
  for (var i = 0; i < ctx.count; i++) {
    var xy = ctx.xy(i);
    var sp = 0.5 + Math.sin(xy[0] * 3.1) * 0.3;
    var head = (Math.sin(xy[0] * 2.7) * 0.5 + 0.5) * ctx.rows + ctx.t * sp * 6;
    var d = (head % ctx.rows) - xy[1];
    if (d < 0) d += ctx.rows;
    if (d < 1) ctx.setRGB(i, 180, 255, 180);
    else if (d < 4) ctx.setRGB(i, 0, Math.max(0, 200 * (1 - d / 4)), 0);
  }
}`
  },
  {
    name: 'Aurora',
    gradient: 'linear-gradient(135deg, #0d9488, #a78bfa, #67e8f9)',
    code: `var meta = { name: 'Aurora' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var band = 0.5 + 0.5 * Math.sin(uv[0] * 4 + Math.sin(ctx.t + uv[0]) * 2 + ctx.t);
    var v = band * (1 - uv[1]);
    ctx.setHSV(i, 140 + 40 * band, 80, v * 100);
  }
}`
  },
  {
    name: 'Starfield',
    gradient: 'linear-gradient(135deg, #0f172a, #334155, #fbbf24)',
    code: `var meta = { name: 'Starfield' };
var stars;
function init(ctx) {
  stars = [];
  for (var i = 0; i < ctx.count; i++) {
    stars.push({ bright: ctx.rand(), phase: ctx.rand() * 6.28, speed: 0.5 + ctx.rand() * 3 });
  }
}
function render(ctx) {
  ctx.clear();
  for (var i = 0; i < ctx.count; i++) {
    var s = stars[i];
    if (s.bright > 0.85) {
      var v = 50 + 50 * Math.sin(ctx.t * s.speed + s.phase);
      ctx.setHSV(i, 40, 10, v);
    }
  }
}`
  }
];

/* ---------- Flag patterns as snippets ---------- */

export const FLAG_PATTERNS: SnippetPattern[] = [
  {
    name: 'Argentina',
    gradient: 'linear-gradient(180deg, #74ACDF 0%, #74ACDF 33%, #fff 33%, #fff 66%, #74ACDF 66%)',
    code: `var meta = { name: 'Argentina' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var r = Math.floor(i / ctx.cols), t = r / (ctx.rows - 1);
    if (t < 0.33) ctx.setHSV(i, 200, 55, 85);
    else if (t < 0.66) ctx.setHSV(i, 0, 0, 100);
    else ctx.setHSV(i, 200, 55, 85);
  }
}`
  },
  {
    name: 'Brazil',
    gradient: 'linear-gradient(135deg, #009739, #FEDD00, #009739)',
    code: `var meta = { name: 'Brazil' };
function render(ctx) {
  var cr = (ctx.rows-1)/2, cc = (ctx.cols-1)/2;
  for (var i = 0; i < ctx.count; i++) {
    var r = Math.floor(i / ctx.cols), c = i % ctx.cols;
    var dist = Math.abs(r-cr)/3 + Math.abs(c-cc)/3;
    if (dist <= 0.85) {
      var cd = Math.sqrt((r-cr)*(r-cr) + (c-cc)*(c-cc));
      if (cd <= 1.2) ctx.setHSV(i, 220, 90, 50);
      else ctx.setHSV(i, 50, 100, 100);
    } else ctx.setHSV(i, 140, 100, 40);
  }
}`
  },
  {
    name: 'France',
    gradient: 'linear-gradient(90deg, #002395 0%, #002395 33%, #fff 33%, #fff 66%, #ED2939 66%)',
    code: `var meta = { name: 'France' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var c = i % ctx.cols, t = c / (ctx.cols - 1);
    if (t < 0.33) ctx.setHSV(i, 220, 100, 70);
    else if (t < 0.66) ctx.setHSV(i, 0, 0, 100);
    else ctx.setHSV(i, 0, 100, 80);
  }
}`
  },
  {
    name: 'Germany',
    gradient: 'linear-gradient(180deg, #000 0%, #000 33%, #DD0000 33%, #DD0000 66%, #FFCC00 66%)',
    code: `var meta = { name: 'Germany' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var r = Math.floor(i / ctx.cols), t = r / (ctx.rows - 1);
    if (t < 0.33) ctx.setHSV(i, 0, 0, 5);
    else if (t < 0.66) ctx.setHSV(i, 0, 100, 80);
    else ctx.setHSV(i, 45, 100, 80);
  }
}`
  },
  {
    name: 'Italy',
    gradient: 'linear-gradient(90deg, #008C45 0%, #008C45 33%, #fff 33%, #fff 66%, #CD212A 66%)',
    code: `var meta = { name: 'Italy' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var c = i % ctx.cols, t = c / (ctx.cols - 1);
    if (t < 0.33) ctx.setHSV(i, 140, 100, 40);
    else if (t < 0.66) ctx.setHSV(i, 0, 0, 100);
    else ctx.setHSV(i, 0, 100, 80);
  }
}`
  },
  {
    name: 'Japan',
    gradient: 'radial-gradient(circle, #BC002D 30%, #fff 30%)',
    code: `var meta = { name: 'Japan' };
function render(ctx) {
  var cr = (ctx.rows-1)/2, cc = (ctx.cols-1)/2;
  for (var i = 0; i < ctx.count; i++) {
    var r = Math.floor(i / ctx.cols), c = i % ctx.cols;
    var d = Math.sqrt((r-cr)*(r-cr) + (c-cc)*(c-cc));
    if (d <= 1.8) ctx.setHSV(i, 0, 100, 70);
    else ctx.setHSV(i, 0, 0, 100);
  }
}`
  },
  {
    name: 'Mexico',
    gradient: 'linear-gradient(90deg, #006847 0%, #006847 33%, #fff 33%, #fff 66%, #CE1126 66%)',
    code: `var meta = { name: 'Mexico' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var c = i % ctx.cols, t = c / (ctx.cols - 1);
    if (t < 0.33) ctx.setHSV(i, 150, 100, 30);
    else if (t < 0.66) ctx.setHSV(i, 0, 0, 100);
    else ctx.setHSV(i, 0, 100, 80);
  }
}`
  },
  {
    name: 'Spain',
    gradient: 'linear-gradient(180deg, #AA151B 0%, #AA151B 25%, #F1BF00 25%, #F1BF00 75%, #AA151B 75%)',
    code: `var meta = { name: 'Spain' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var r = Math.floor(i / ctx.cols), t = r / (ctx.rows - 1);
    if (t < 0.28) ctx.setHSV(i, 0, 100, 80);
    else if (t < 0.72) ctx.setHSV(i, 50, 100, 100);
    else ctx.setHSV(i, 0, 100, 80);
  }
}`
  },
  {
    name: 'UK',
    gradient: 'linear-gradient(135deg, #00247D, #CF142B, #00247D)',
    code: `var meta = { name: 'UK' };
function render(ctx) {
  var cr = (ctx.rows-1)/2, cc = (ctx.cols-1)/2;
  for (var i = 0; i < ctx.count; i++) {
    var r = Math.floor(i / ctx.cols), c = i % ctx.cols;
    if (r === Math.floor(cr) || c === Math.floor(cc)) ctx.setHSV(i, 0, 100, 80);
    else if (Math.abs(r - cr - (c - cc)) < 0.8 || Math.abs(r - cr + (c - cc)) < 0.8) ctx.setHSV(i, 0, 100, 60);
    else ctx.setHSV(i, 230, 80, 35);
  }
}`
  },
  {
    name: 'USA',
    gradient: 'linear-gradient(180deg, #B22234, #fff, #B22234, #fff, #3C3B6E)',
    code: `var meta = { name: 'USA' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var r = Math.floor(i / ctx.cols), c = i % ctx.cols;
    if (r <= 2 && c <= 2) ctx.setHSV(i, 220, 90, 50);
    else if (r % 2 === 0) ctx.setHSV(i, 0, 95, 65);
    else ctx.setHSV(i, 0, 0, 100);
  }
}`
  }
];

/* ---------- Paint mode pattern (solid color with zone override) ---------- */

export function makeSolidPattern(r: number, g: number, b: number): string {
  return `var meta = { name: 'Solid' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) ctx.setRGB(i, ${r}, ${g}, ${b});
}`;
}

/* ---------- Flag with wave/spin/ripple effect ---------- */

export function makeFlagWithEffect(
  flagCode: string,
  effect: 'none' | 'spin' | 'ripple' | 'wave'
): string {
  if (effect === 'none') return flagCode;

  // Wrap the flag render function with an effect overlay
  const effectCode: Record<string, string> = {
    spin: `
var __origRender = render;
var __cache = null;
function render(ctx) {
  if (!__cache) { __cache = []; __origRender(ctx); for (var i = 0; i < ctx.count * 3; i++) __cache[i] = 0; for (var j = 0; j < ctx.count; j++) { var c = ctx.getRGB(j); __cache[j*3] = c[0]; __cache[j*3+1] = c[1]; __cache[j*3+2] = c[2]; } }
  var angle = ctx.t * 0.4, cx = (ctx.cols-1)/2, cy = (ctx.rows-1)/2;
  for (var i = 0; i < ctx.count; i++) {
    var r = Math.floor(i/ctx.cols), c = i%ctx.cols;
    var dr = r - cy, dc = c - cx;
    var sr = Math.round(cy + dr*Math.cos(angle) - dc*Math.sin(angle));
    var sc = Math.round(cx + dr*Math.sin(angle) + dc*Math.cos(angle));
    sr = ((sr % ctx.rows) + ctx.rows) % ctx.rows;
    sc = ((sc % ctx.cols) + ctx.cols) % ctx.cols;
    var si = sr * ctx.cols + sc;
    ctx.setRGB(i, __cache[si*3], __cache[si*3+1], __cache[si*3+2]);
  }
}`,
    ripple: `
var __origRender = render;
render = function(ctx) {
  __origRender(ctx);
  var cx = (ctx.cols-1)/2, cy = (ctx.rows-1)/2;
  for (var i = 0; i < ctx.count; i++) {
    var r = Math.floor(i/ctx.cols), c = i%ctx.cols;
    var dist = Math.sqrt((r-cy)*(r-cy) + (c-cx)*(c-cx));
    var wave = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(dist * 1.5 - ctx.t * 2.5));
    var rgb = ctx.getRGB(i);
    ctx.setRGB(i, rgb[0]*wave, rgb[1]*wave, rgb[2]*wave);
  }
};`,
    wave: `
var __origRender = render;
render = function(ctx) {
  __origRender(ctx);
  for (var i = 0; i < ctx.count; i++) {
    var c = i % ctx.cols;
    var phase = Math.sin(c / ctx.cols * Math.PI * 2 - ctx.t * 2);
    var mult = 0.5 + 0.5 * phase;
    var rgb = ctx.getRGB(i);
    ctx.setRGB(i, rgb[0]*mult, rgb[1]*mult, rgb[2]*mult);
  }
};`
  };

  return flagCode + '\n' + (effectCode[effect] || '');
}
