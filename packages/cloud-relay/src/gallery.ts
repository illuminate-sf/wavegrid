/**
 * Pattern gallery — snippet patterns and HTML UI for the relay.
 */

export interface SnippetPattern {
  name: string;
  code: string;
  speed?: number;
}

export const PATTERNS: SnippetPattern[] = [
  {
    name: 'Rainbow Wave',
    code: `var meta = { name: 'Rainbow Wave' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var h = (uv[0] + uv[1] + ctx.t * 0.3) * 360 % 360;
    ctx.setHSV(i, h, 100, 100);
  }
}`
  },
  {
    name: 'Breathe',
    code: `var meta = { name: 'Breathe' };
function render(ctx) {
  var b = 50 + 50 * Math.sin(ctx.t * 2);
  ctx.fill(200, 80, b);
}`
  },
  {
    name: 'Spiral',
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
    name: 'Plasma',
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
    name: 'Starfield',
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
  },
  {
    name: 'Rain',
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
    name: 'Checkerboard',
    code: `var meta = { name: 'Checkerboard' };
function render(ctx) {
  var off = Math.floor(ctx.t * 4);
  for (var i = 0; i < ctx.count; i++) {
    var xy = ctx.xy(i);
    var c = (xy[0] + xy[1] + off) % 2;
    ctx.setHSV(i, ctx.t * 30 % 360, 80, c ? 100 : 20);
  }
}`
  },
  {
    name: 'Aurora',
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
    name: 'Heartbeat',
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
    name: 'Matrix',
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
    name: 'Ripple',
    code: `var meta = { name: 'Ripple' };
function render(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var p = ctx.polar(i);
    var v = 0.5 + 0.5 * Math.sin(p[0] * 8 - ctx.t * 4);
    ctx.setHSV(i, 200 + p[0] * 40, 60, 15 + 85 * v);
  }
}`
  },
  {
    name: 'Pride',
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
    name: 'Ocean',
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
    name: 'Blackout',
    code: `var meta = { name: 'Blackout' };
function render(ctx) { ctx.clear(); }`
  }
];

export function generateGalleryHtml(): string {
  const tiles = PATTERNS.map((p, i) => `
    <div class="tile" onclick="loadPattern(${i})" title="${p.name}">
      <div class="name">${p.name}</div>
    </div>`).join('');

  return `<!doctype html><html><head><meta charset=utf-8>
<title>Wavegrid Pattern Gallery</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: system-ui, sans-serif; background: #111; color: #eee; padding: 20px; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  .status { font-size: 13px; color: #888; margin-bottom: 20px; }
  .status .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
  .status .on { background: #0f0; }
  .status .off { background: #f00; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
  .tile {
    background: #222; border-radius: 8px; padding: 16px 12px; cursor: pointer;
    border: 2px solid transparent; transition: all 0.15s;
    display: flex; align-items: center; justify-content: center; min-height: 70px;
  }
  .tile:hover { border-color: #555; background: #2a2a2a; transform: scale(1.02); }
  .tile.active { border-color: #4af; background: #1a2a3a; }
  .name { font-size: 14px; font-weight: 500; text-align: center; }
  .controls { margin: 20px 0; display: flex; gap: 12px; align-items: center; }
  .controls button {
    background: #333; color: #eee; border: 1px solid #555; border-radius: 6px;
    padding: 8px 16px; cursor: pointer; font-size: 13px;
  }
  .controls button:hover { background: #444; }
  .controls button.danger { border-color: #a33; }
  .controls button.danger:hover { background: #522; }
  .color-pick { display: flex; gap: 8px; align-items: center; }
  .color-pick input[type=color] { width: 36px; height: 28px; border: none; background: none; cursor: pointer; }
</style></head>
<body>
<h1>Wavegrid</h1>
<div class="status"><span class="dot off" id="dot"></span> <span id="statusText">checking agent...</span></div>
<div class="controls">
  <button onclick="stopPattern()" class="danger">Stop / Blackout</button>
  <div class="color-pick">
    <button onclick="sendSolid()">Solid Color</button>
    <input type="color" id="solidColor" value="#ff6600">
  </div>
</div>
<div class="grid">${tiles}</div>
<script>
var patterns = ${JSON.stringify(PATTERNS.map(p => ({ name: p.name, code: p.code, speed: p.speed })))};
var activeTile = -1;

function cmd(obj) {
  return fetch('/api/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  }).then(r => r.json());
}

function loadPattern(idx) {
  var p = patterns[idx];
  document.querySelectorAll('.tile').forEach((t, i) => t.classList.toggle('active', i === idx));
  activeTile = idx;
  cmd({ action: 'loadPattern', code: p.code, speed: p.speed || 1 });
}

function stopPattern() {
  document.querySelectorAll('.tile').forEach(t => t.classList.remove('active'));
  activeTile = -1;
  cmd({ action: 'stopPattern' });
}

function sendSolid() {
  var hex = document.getElementById('solidColor').value;
  var r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
  document.querySelectorAll('.tile').forEach(t => t.classList.remove('active'));
  activeTile = -1;
  cmd({ action: 'solid', r: r, g: g, b: b });
}

function checkStatus() {
  fetch('/api/status').then(r => r.json()).then(d => {
    var dot = document.getElementById('dot');
    var txt = document.getElementById('statusText');
    if (d.agent) { dot.className = 'dot on'; txt.textContent = 'Agent connected'; }
    else { dot.className = 'dot off'; txt.textContent = 'Agent disconnected'; }
  }).catch(() => {});
}
setInterval(checkStatus, 3000);
checkStatus();
</script></body></html>`;
}
