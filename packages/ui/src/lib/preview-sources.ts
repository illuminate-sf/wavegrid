/**
 * Scene and animation render body strings for client-side preview.
 * These use the ctx API: ctx.set(i, h, s, b), ctx.fill(h, s, b),
 * ctx.count, ctx.cols, ctx.rows, ctx.frame, ctx.t, ctx.uv(i), ctx.polar(i).
 *
 * Duplicated from playlist-compiler.ts to keep the UI self-contained
 * (no server dependency).
 */

export const ANIMATION_SOURCES: Record<string, string> = {
  wave: `
    for (var i = 0; i < ctx.count; i++) {
      var col = i % ctx.cols;
      var hue = (ctx.frame * 2 + col * 40) % 360;
      var bright = 70 + Math.sin(ctx.frame * 0.05 + col * 0.8) * 30;
      ctx.set(i, hue, 100, bright);
    }`,

  breathe: `
    var brightness = 70 + Math.sin(ctx.frame * 0.03) * 30;
    for (var i = 0; i < ctx.count; i++) {
      ctx.set(i, 220, 100, brightness);
    }`,

  rainbow: `
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      var hue = (ctx.frame * 1.5 + (row + col) * 25) % 360;
      ctx.set(i, hue, 100, 100);
    }`,

  pacman: `
    var cols = ctx.cols;
    var rows = ctx.rows;
    var perim = [];
    for (var c = 0; c < cols; c++) perim.push(c);
    for (var r = 1; r < rows; r++) perim.push(r * cols + cols - 1);
    for (var c2 = cols - 2; c2 >= 0; c2--) perim.push((rows - 1) * cols + c2);
    for (var r2 = rows - 2; r2 >= 1; r2--) perim.push(r2 * cols);
    var pos = Math.floor(ctx.frame * 0.3) % perim.length;
    for (var i = 0; i < ctx.count; i++) ctx.set(i, 220, 60, 15);
    ctx.set(perim[pos], 55, 95, 95);
    for (var t = 1; t <= 3; t++) {
      var tp = (pos - t + perim.length) % perim.length;
      ctx.set(perim[tp], 55, 80, 70 - t * 18);
    }`,

  spiral: `
    var cols = ctx.cols;
    var rows = ctx.rows;
    var cx = (cols - 1) / 2;
    var cy = (rows - 1) / 2;
    var maxDist = Math.max(1, Math.sqrt(cx * cx + cy * cy));
    var time = ctx.frame / 60;
    var PRIDE = [{h:0,s:100},{h:30,s:100},{h:55,s:100},{h:120,s:100},{h:210,s:100},{h:260,s:100},{h:290,s:100}];
    function prideAt(pos, t) {
      var p = (((pos + t * 0.1) % 1) + 1) % 1;
      var sc = p * PRIDE.length;
      var idx = Math.floor(sc) % PRIDE.length;
      var nxt = (idx + 1) % PRIDE.length;
      var mx = sc - Math.floor(sc);
      var dh = PRIDE[nxt].h - PRIDE[idx].h;
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      return { h: ((PRIDE[idx].h + dh * mx) % 360 + 360) % 360, s: PRIDE[idx].s + (PRIDE[nxt].s - PRIDE[idx].s) * mx };
    }
    function smooth(x) { var v = x < 0 ? 0 : x > 1 ? 1 : x; return v * v * (3 - 2 * v); }
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / cols);
      var col = i % cols;
      var dx = col - cx;
      var dy = row - cy;
      var phase = Math.atan2(dy, dx);
      var distance = Math.sqrt(dx * dx + dy * dy) / maxDist;
      var arms = Math.cos(phase * 3 - time * 1.55 + distance * 6.2);
      var tail = Math.cos(phase * 3 - time * 1.55 + distance * 6.2 - 0.72);
      var coreVoid = smooth((distance - 0.16) / 0.18);
      var intensity = (smooth((arms - 0.18) / 0.82) * 0.78 + smooth((tail - 0.2) / 0.8) * 0.24) * coreVoid;
      var color = prideAt(0.78 + phase / (Math.PI * 2), time);
      ctx.set(i, color.h, color.s, intensity * 100);
    }`,

  rain: `
    var rows = ctx.rows;
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      var phase = (ctx.frame * 0.15 + col * 2.3 + col * col * 0.7) % rows;
      var dist = Math.abs(row - phase);
      var bright = dist < 1.5 ? 100 - dist * 25 : 20;
      ctx.set(i, 200 + col * 8, 90, bright);
    }`,

  'i-heart-sf': `
    var bitmaps = [
      [[0,0,1,1,1,0,0],[0,0,0,1,0,0,0],[0,0,0,1,0,0,0],[0,0,0,1,0,0,0],[0,0,0,1,0,0,0],[0,0,0,1,0,0,0],[0,0,1,1,1,0,0]],
      [[0,1,0,0,0,1,0],[1,1,1,0,1,1,1],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0],[0,0,0,0,0,0,0]],
      [[0,1,1,0,1,1,1],[1,0,0,0,1,0,0],[1,0,0,0,1,0,0],[0,1,1,0,1,1,0],[0,0,1,0,1,0,0],[0,0,1,0,1,0,0],[1,1,0,0,1,0,0]]
    ];
    var colors = [{h:45,s:100,b:100},{h:0,s:100,b:100},{h:45,s:100,b:100}];
    var frame = Math.floor(ctx.frame / 180) % 3;
    var bitmap = bitmaps[frame];
    var color = colors[frame];
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      var on = ctx.cols === 7 && ctx.rows >= 7 && bitmap[row] && bitmap[row][col];
      if (on) ctx.set(i, color.h, color.s, color.b);
      else ctx.set(i, 220, 80, 8);
    }`,

  'heart-breathe': `
    var bitmap = [
      [0,1,0,0,0,1,0],[1,1,1,0,1,1,1],[1,1,1,1,1,1,1],
      [0,1,1,1,1,1,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0],[0,0,0,0,0,0,0]
    ];
    var t = (Math.sin(ctx.frame * 0.03) + 1) / 2;
    var brightness = 5 + Math.pow(t, 0.4) * 95;
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      var on = ctx.cols === 7 && ctx.rows >= 7 && bitmap[row] && bitmap[row][col];
      if (on) ctx.set(i, 0, 100, brightness);
      else ctx.set(i, 0, 0, 2);
    }`,

  'pride-flow': `
    var ROYGBIV = [{h:0,s:100},{h:30,s:100},{h:55,s:100},{h:120,s:100},{h:210,s:100},{h:260,s:100},{h:290,s:100}];
    function roygbivAt(pos) {
      var p = ((pos % 1) + 1) % 1;
      var sc = p * ROYGBIV.length;
      var idx = Math.floor(sc) % ROYGBIV.length;
      var nxt = (idx + 1) % ROYGBIV.length;
      var mx = sc - Math.floor(sc);
      var dh = ROYGBIV[nxt].h - ROYGBIV[idx].h;
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      return { h: ((ROYGBIV[idx].h + dh * mx) % 360 + 360) % 360, s: ROYGBIV[idx].s + (ROYGBIV[nxt].s - ROYGBIV[idx].s) * mx };
    }
    var speed = ctx.frame * 0.012;
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var c = roygbivAt(row / ctx.rows + speed);
      ctx.set(i, c.h, c.s, 100);
    }`,

  'pride-breathe': `
    var ROYGBIV = [{h:0,s:100},{h:30,s:100},{h:55,s:100},{h:120,s:100},{h:210,s:100},{h:260,s:100},{h:290,s:100}];
    function roygbivAt(pos) {
      var p = ((pos % 1) + 1) % 1;
      var sc = p * ROYGBIV.length;
      var idx = Math.floor(sc) % ROYGBIV.length;
      var nxt = (idx + 1) % ROYGBIV.length;
      var mx = sc - Math.floor(sc);
      var dh = ROYGBIV[nxt].h - ROYGBIV[idx].h;
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      return { h: ((ROYGBIV[idx].h + dh * mx) % 360 + 360) % 360, s: 100 };
    }
    var speed = ctx.frame * 0.008;
    var brightness = 90 + Math.sin(ctx.frame * 0.04) * 10;
    var c = roygbivAt(speed);
    for (var i = 0; i < ctx.count; i++) {
      ctx.set(i, c.h, c.s, brightness);
    }`,

  'pride-rotate': `
    var ROYGBIV = [{h:0,s:100},{h:30,s:100},{h:55,s:100},{h:120,s:100},{h:210,s:100},{h:260,s:100},{h:290,s:100}];
    var offset = Math.floor(ctx.frame * 0.08);
    for (var i = 0; i < ctx.count; i++) {
      var col = i % ctx.cols;
      var idx = ((col + offset) % ROYGBIV.length + ROYGBIV.length) % ROYGBIV.length;
      ctx.set(i, ROYGBIV[idx].h, ROYGBIV[idx].s, 100);
    }`,

  'pride-ring': `
    var ROYGBIV = [{h:0,s:100},{h:30,s:100},{h:55,s:100},{h:120,s:100},{h:210,s:100},{h:260,s:100},{h:290,s:100}];
    function roygbivAt(pos) {
      var p = ((pos % 1) + 1) % 1;
      var sc = p * ROYGBIV.length;
      var idx = Math.floor(sc) % ROYGBIV.length;
      var nxt = (idx + 1) % ROYGBIV.length;
      var mx = sc - Math.floor(sc);
      var dh = ROYGBIV[nxt].h - ROYGBIV[idx].h;
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      return { h: ((ROYGBIV[idx].h + dh * mx) % 360 + 360) % 360, s: 100 };
    }
    var speed = ctx.frame * 0.012;
    for (var i = 0; i < ctx.count; i++) {
      var c = roygbivAt(i / ctx.count + speed);
      ctx.set(i, c.h, c.s, 100);
    }`
};

export const SCENE_SOURCES: Record<string, string> = {
  civic: `ctx.fill(220, 100, 100);`,

  pride: `
    for (var i = 0; i < ctx.count; i++) {
      ctx.set(i, Math.round(i / ctx.count * 360), 100, 100);
    }`,

  gold: `ctx.fill(45, 100, 100);`,

  white: `ctx.fill(0, 0, 100);`,

  solstice: `
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      ctx.set(i, 40 + row * 5 + col * 4, 100, 100);
    }`,

  ocean: `
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      ctx.set(i, 180 + row * 8 + col * 3, 100, 100);
    }`,

  sunset: `
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      ctx.set(i, 10 + row * 5, 100, 100);
    }`,

  heart: `
    var bitmap = [
      [0,1,0,0,0,1,0],[1,1,1,0,1,1,1],[1,1,1,1,1,1,1],
      [0,1,1,1,1,1,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0],[0,0,0,0,0,0,0]
    ];
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      var on = ctx.cols === 7 && ctx.rows >= 7 && bitmap[row] && bitmap[row][col];
      if (on) ctx.set(i, 0, 100, 100);
      else ctx.set(i, 0, 0, 2);
    }`,

  sf: `
    var bitmap = [
      [0,1,1,0,1,1,1],[1,0,0,0,1,0,0],[1,0,0,0,1,0,0],
      [0,1,1,0,1,1,0],[0,0,1,0,1,0,0],[0,0,1,0,1,0,0],[1,1,0,0,1,0,0]
    ];
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      var on = ctx.cols === 7 && ctx.rows >= 7 && bitmap[row] && bitmap[row][col];
      if (on) ctx.set(i, 45, 95, 85);
      else ctx.set(i, 220, 80, 8);
    }`,


  forest: `
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      ctx.set(i, 120 + row * 6 + col * 2, 100, 70 + row * 5);
    }`,

  fire: `
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var invRow = (ctx.cols - 1) - row;
      ctx.set(i, 10 + invRow * 6, 100, 70 + invRow * 5);
    }`,

  night: `
    var starCount = Math.max(2, Math.floor(ctx.count / 7));
    var step = ctx.count / starCount;
    var stars = [];
    for (var k = 0; k < starCount; k++) stars.push(Math.round(k * step));
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      var isStar = false;
      for (var s = 0; s < stars.length; s++) { if (stars[s] === i) { isStar = true; break; } }
      if (isStar) ctx.set(i, 200 + (row + col) * 10, 30, 100);
      else ctx.set(i, 240, 80, 30 + row * 5);
    }`,

  checker: `
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      var isLight = (row + col) % 2 === 0;
      if (isLight) ctx.set(i, 0, 0, 80);
      else ctx.set(i, 220, 80, 60);
    }`,

  off: `ctx.fill(0, 0, 0);`
};
