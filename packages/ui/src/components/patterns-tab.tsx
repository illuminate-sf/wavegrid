'use client';

import { useCallback, useState } from 'react';

import { MiniGridPreview } from './mini-grid-preview';

interface PatternDef {
  name: string;
  gradient: string;
  code: string;
}

const PRESETS: PatternDef[] = [
  // ── Originals ──────────────────────────────────────────────
  {
    name: 'Color Cycle',
    gradient: 'conic-gradient(from 0deg, #e33, #ee0, #3a5, #35e, #e33)',
    code: `({
  render(ctx) {
    ctx.fill(ctx.t * 30 % 360, 100, 80);
  },
  meta: { name: 'color-cycle' }
})`
  },
  {
    name: 'Noise Field',
    gradient: 'linear-gradient(135deg, #1a2a3a, #3a5a2a, #2a1a4a)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const n = ctx.noise(u * 3, v * 3, ctx.t * 0.5);
      ctx.set(i, n * 360, 80, n * 100);
    }
  },
  meta: { name: 'noise-field' }
})`
  },
  {
    name: 'Radial Pulse',
    gradient: 'radial-gradient(circle, #3a7ad8, #1a2a5a, #0a1a3a)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r] = ctx.polar(i);
      const w = Math.sin(r * 6 - ctx.t * 3) * 0.5 + 0.5;
      ctx.set(i, 200 + w * 60, 90, w * 100);
    }
  },
  meta: { name: 'radial-pulse' }
})`
  },
  {
    name: 'Matrix Rain',
    gradient: 'linear-gradient(180deg, #001a00, #00cc00, #001a00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      const phase = (ctx.t * 2 + x * 2.3 + x * x * 0.7) % ctx.rows;
      const dist = Math.abs(y - phase);
      const b = dist < 1.5 ? 90 - dist * 30 : 5;
      ctx.set(i, 120, 90, b);
    }
  },
  meta: { name: 'matrix-rain' }
})`
  },
  {
    name: 'Checkerboard',
    gradient: 'repeating-conic-gradient(#555 0% 25%, #e8e8e8 0% 50%) 50% / 36px 36px',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      const checker = ((x + y + Math.floor(ctx.t * 2)) % 2 === 0);
      ctx.set(i, ctx.t * 20 % 360, 90, checker ? 90 : 10);
    }
  },
  meta: { name: 'checkerboard' }
})`
  },
  {
    name: 'Spiral',
    gradient: 'conic-gradient(from 0deg, #e33, #ee0, #3a5, #35e, transparent)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const spiral = Math.sin(theta * 3 - r * 8 + ctx.t * 2);
      const b = ctx.smoothstep(-0.2, 0.8, spiral) * 100;
      const h = (theta / (Math.PI * 2) * 360 + ctx.t * 30) % 360;
      ctx.set(i, h, 90, b);
    }
  },
  meta: { name: 'spiral' }
})`
  },
  {
    name: 'Lava',
    gradient: 'linear-gradient(135deg, #ff4500, #cc0000, #ff8c00, #ff4500)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const n1 = ctx.noise(u * 2, v * 2, ctx.t * 0.3);
      const n2 = ctx.noise(u * 4, v * 4, ctx.t * 0.5 + 10);
      const h = 10 + n1 * 30;
      const b = 40 + n2 * 60;
      ctx.set(i, h, 100, b);
    }
  },
  meta: { name: 'lava' }
})`
  },
  {
    name: 'Aurora',
    gradient: 'linear-gradient(135deg, #00ff88, #0088ff, #8800ff, #00ff88)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const wave = Math.sin(u * 4 + ctx.t) * 0.2;
      const n = ctx.noise(u * 2, v + wave, ctx.t * 0.2);
      const h = 120 + n * 180;
      const b = Math.max(5, n * 100);
      ctx.set(i, h, 80, b);
    }
  },
  meta: { name: 'aurora' }
})`
  },

  // ── New patterns ───────────────────────────────────────────
  {
    name: 'Fire Flicker',
    gradient: 'linear-gradient(180deg, #ff0000, #cc0000, #ff6600)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const flicker = ctx.noise(u * 5, v * 3, ctx.t * 3);
      const isYellow = flicker > 0.75;
      const h = isYellow ? 45 + flicker * 10 : 0 + flicker * 15;
      const s = isYellow ? 100 : 100;
      const b = 50 + flicker * 50;
      ctx.set(i, h, s, b * (1 - v * 0.3));
    }
  },
  meta: { name: 'fire-flicker' }
})`
  },
  {
    name: 'Ocean Waves',
    gradient: 'linear-gradient(180deg, #001a4d, #0055aa, #00aadd)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const wave1 = Math.sin(u * 8 + ctx.t * 1.5) * 0.3;
      const wave2 = Math.sin(u * 5 - ctx.t * 0.8 + v * 3) * 0.2;
      const depth = v + wave1 + wave2;
      const h = 190 + depth * 30;
      const b = 30 + (1 - depth) * 60;
      ctx.set(i, h, 80, Math.max(10, b));
    }
  },
  meta: { name: 'ocean-waves' }
})`
  },
  {
    name: 'Fireflies',
    gradient: 'linear-gradient(135deg, #0a0a20, #1a1a00, #0a0a20)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const n = ctx.noise(u * 4 + ctx.t * 0.3, v * 4 - ctx.t * 0.2, ctx.t * 2);
      const glow = Math.pow(Math.max(0, n - 0.55) / 0.45, 3);
      ctx.set(i, 55, 100, glow * 100);
    }
  },
  meta: { name: 'fireflies' }
})`
  },
  {
    name: 'Plasma',
    gradient: 'linear-gradient(135deg, #ff00ff, #00ffff, #ff8800, #ff00ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const v1 = Math.sin(u * 10 + ctx.t);
      const v2 = Math.sin(v * 10 + ctx.t * 1.3);
      const v3 = Math.sin((u + v) * 7 + ctx.t * 0.7);
      const v4 = Math.sin(Math.sqrt(u * u + v * v) * 8 - ctx.t * 2);
      const sum = (v1 + v2 + v3 + v4) / 4;
      ctx.set(i, (sum + 1) * 180, 90, 60 + sum * 40);
    }
  },
  meta: { name: 'plasma' }
})`
  },
  {
    name: 'Starfield',
    gradient: 'radial-gradient(circle, #ffffff, #000033, #000000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const twinkle = ctx.noise(theta * 10, r * 5, ctx.t * 4);
      const star = twinkle > 0.7 ? (twinkle - 0.7) / 0.3 : 0;
      ctx.set(i, 220 + star * 40, 20, star * 100);
    }
  },
  meta: { name: 'starfield' }
})`
  },
  {
    name: 'Sunset',
    gradient: 'linear-gradient(180deg, #1a0033, #cc3300, #ff9900, #ffcc00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const shift = Math.sin(u * 3 + ctx.t * 0.3) * 0.1;
      const band = v + shift;
      const h = band < 0.3 ? 270 + band * 100 : band < 0.6 ? 20 - band * 20 : 30 + band * 20;
      const b = 40 + (1 - band) * 60;
      ctx.set(i, h, 90, b);
    }
  },
  meta: { name: 'sunset' }
})`
  },
  {
    name: 'Lightning',
    gradient: 'linear-gradient(180deg, #1a1a3a, #ffffff, #3a3a6a)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const bolt = ctx.noise(u * 2, ctx.t * 8, 0);
      const flash = bolt > 0.85 ? Math.pow((bolt - 0.85) / 0.15, 2) : 0;
      const ambient = ctx.noise(u * 3, v * 3, ctx.t * 0.5) * 15;
      ctx.set(i, 240, flash > 0 ? 10 : 60, ambient + flash * 100);
    }
  },
  meta: { name: 'lightning' }
})`
  },
  {
    name: 'Candy',
    gradient: 'linear-gradient(135deg, #ff69b4, #ff1493, #da70d6, #ff69b4)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const stripe = Math.sin((u + v) * 12 - ctx.t * 2) * 0.5 + 0.5;
      const h = stripe > 0.5 ? 330 : 300;
      ctx.set(i, h, 80, 50 + stripe * 50);
    }
  },
  meta: { name: 'candy' }
})`
  },
  {
    name: 'Deep Sea',
    gradient: 'linear-gradient(180deg, #000022, #003366, #006688)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const n = ctx.noise(u * 2, v * 2, ctx.t * 0.2);
      const caustic = Math.pow(Math.sin(n * 12) * 0.5 + 0.5, 4);
      ctx.set(i, 200 + n * 40, 70, 10 + caustic * 60);
    }
  },
  meta: { name: 'deep-sea' }
})`
  },
  {
    name: 'Neon Grid',
    gradient: 'linear-gradient(135deg, #000000, #ff00ff, #00ffff, #000000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      const gx = Math.abs(Math.sin((x + 0.5) * Math.PI));
      const gy = Math.abs(Math.sin((y + 0.5) * Math.PI));
      const grid = Math.max(gx, gy);
      const pulse = Math.sin(ctx.t * 2) * 0.3 + 0.7;
      const h = x > ctx.cols / 2 ? 180 : 300;
      ctx.set(i, h, 100, grid * pulse * 100);
    }
  },
  meta: { name: 'neon-grid' }
})`
  },
  {
    name: 'Heartbeat',
    gradient: 'radial-gradient(circle, #ff0040, #800020, #200010)',
    code: `({
  render(ctx) {
    const beat = Math.pow(Math.sin(ctx.t * 3) * 0.5 + 0.5, 8);
    for (let i = 0; i < ctx.count; i++) {
      const [r] = ctx.polar(i);
      const wave = Math.max(0, 1 - r * 2) * (0.3 + beat * 0.7);
      ctx.set(i, 350, 90, wave * 100);
    }
  },
  meta: { name: 'heartbeat' }
})`
  },
  {
    name: 'Ice Crystal',
    gradient: 'linear-gradient(135deg, #e0f0ff, #80c0ff, #4080cc, #e0f0ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const facets = Math.cos(theta * 6 + ctx.t) * Math.cos(r * 5 - ctx.t * 0.5);
      const shimmer = ctx.noise(r * 3, theta * 2, ctx.t * 2) * 0.3;
      ctx.set(i, 200 + facets * 20, 40 + shimmer * 30, 50 + (facets + shimmer) * 40);
    }
  },
  meta: { name: 'ice-crystal' }
})`
  },
  {
    name: 'Galaxy',
    gradient: 'radial-gradient(ellipse, #1a0033, #330066, #000011)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const arm = Math.sin(theta * 2 - r * 6 + ctx.t * 0.5);
      const star = ctx.noise(theta * 8, r * 4, ctx.t) > 0.7 ? 1 : 0;
      const h = 260 + arm * 40;
      const b = arm * 0.5 + 0.5;
      ctx.set(i, h, 70 - star * 50, (b * 50 + star * 80));
    }
  },
  meta: { name: 'galaxy' }
})`
  },
  {
    name: 'Emerald Wave',
    gradient: 'linear-gradient(135deg, #004d00, #00cc44, #88ff88, #004d00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const wave = Math.sin(u * 6 + ctx.t * 2) * Math.cos(v * 4 - ctx.t);
      ctx.set(i, 140 + wave * 20, 80, 30 + (wave + 1) * 35);
    }
  },
  meta: { name: 'emerald-wave' }
})`
  },
  {
    name: 'Copper Glow',
    gradient: 'linear-gradient(135deg, #331a00, #cc6600, #ffaa33, #331a00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const n = ctx.noise(u * 3, v * 3, ctx.t * 0.4);
      const h = 25 + n * 15;
      const b = 30 + n * 60 + Math.sin(ctx.t + i * 0.1) * 10;
      ctx.set(i, h, 90, Math.min(100, b));
    }
  },
  meta: { name: 'copper-glow' }
})`
  },
  {
    name: 'Breathing Blue',
    gradient: 'radial-gradient(circle, #0066ff, #003399, #001a4d)',
    code: `({
  render(ctx) {
    const breath = Math.sin(ctx.t * 0.8) * 0.4 + 0.6;
    for (let i = 0; i < ctx.count; i++) {
      const [r] = ctx.polar(i);
      const fade = Math.max(0, 1 - r * 1.5);
      ctx.set(i, 220, 90, fade * breath * 100);
    }
  },
  meta: { name: 'breathing-blue' }
})`
  },
  {
    name: 'Confetti',
    gradient: 'linear-gradient(135deg, #ff0066, #ffcc00, #00ccff, #66ff00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const seed = i * 137.508;
      const t = ctx.t * 2 + seed;
      const flash = Math.sin(t) * Math.sin(t * 1.7) * Math.sin(t * 2.3);
      const on = flash > 0.6;
      const h = (seed * 57.29) % 360;
      ctx.set(i, h, on ? 90 : 0, on ? 90 : 5);
    }
  },
  meta: { name: 'confetti' }
})`
  },
  {
    name: 'Toxic',
    gradient: 'linear-gradient(135deg, #001a00, #33ff00, #99ff00, #001a00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const bubble = ctx.noise(u * 4, v * 4 - ctx.t * 0.5, ctx.t * 0.3);
      const drip = Math.sin(v * 8 + ctx.t * 3 + u * 5) * 0.5 + 0.5;
      const h = 90 + bubble * 40;
      ctx.set(i, h, 100, (bubble * 0.6 + drip * 0.4) * 100);
    }
  },
  meta: { name: 'toxic' }
})`
  },
  {
    name: 'Blood Moon',
    gradient: 'radial-gradient(circle, #cc0000, #660000, #1a0000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const moon = Math.max(0, 1 - r * 2.5);
      const haze = ctx.noise(theta * 3, r * 2, ctx.t * 0.3) * 0.4;
      const h = 0 + haze * 20;
      ctx.set(i, h, 90, (moon + haze * 0.5) * 100);
    }
  },
  meta: { name: 'blood-moon' }
})`
  },
  {
    name: 'Diamonds',
    gradient: 'linear-gradient(45deg, #222, #aaa, #fff, #aaa, #222)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      const cx = x - ctx.cols / 2 + 0.5;
      const cy = y - ctx.rows / 2 + 0.5;
      const d = (Math.abs(cx) + Math.abs(cy)) * 2;
      const ring = Math.sin(d - ctx.t * 3) * 0.5 + 0.5;
      ctx.set(i, 200 + ring * 60, 20, ring * 90);
    }
  },
  meta: { name: 'diamonds' }
})`
  },
  {
    name: 'Magma Flow',
    gradient: 'linear-gradient(180deg, #1a0000, #cc2200, #ff6600, #ffcc00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const flow = ctx.noise(u * 2, v * 2 - ctx.t * 0.4, ctx.t * 0.2);
      const heat = 1 - v + flow * 0.4;
      const h = heat > 0.7 ? 40 : heat > 0.4 ? 15 : 0;
      ctx.set(i, h, 100, Math.min(100, heat * 100));
    }
  },
  meta: { name: 'magma-flow' }
})`
  },
  {
    name: 'Lavender Dream',
    gradient: 'linear-gradient(135deg, #e6ccff, #9966cc, #4d0099, #e6ccff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const drift = Math.sin(u * 3 + ctx.t * 0.5) * Math.cos(v * 2 + ctx.t * 0.3);
      const n = ctx.noise(u * 2, v * 2, ctx.t * 0.2);
      const h = 270 + drift * 20 + n * 15;
      ctx.set(i, h, 50 + n * 30, 40 + drift * 30 + 30);
    }
  },
  meta: { name: 'lavender-dream' }
})`
  },
  {
    name: 'Solar Flare',
    gradient: 'radial-gradient(circle, #ffff00, #ff8800, #ff0000, #330000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const flare = ctx.noise(theta * 4, ctx.t * 3, r * 2);
      const burst = Math.max(0, flare - 0.3) / 0.7;
      const h = 30 + burst * 30;
      const base = Math.max(0, 1 - r * 2);
      ctx.set(i, h, 100, (base + burst * 0.8) * 100);
    }
  },
  meta: { name: 'solar-flare' }
})`
  },
  {
    name: 'Tidal Pool',
    gradient: 'linear-gradient(135deg, #004466, #00aacc, #66dddd, #004466)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const ripple1 = Math.sin(Math.sqrt((u-0.3)*(u-0.3)+(v-0.4)*(v-0.4)) * 15 - ctx.t * 3);
      const ripple2 = Math.sin(Math.sqrt((u-0.7)*(u-0.7)+(v-0.6)*(v-0.6)) * 12 - ctx.t * 2.5);
      const combined = (ripple1 + ripple2) * 0.5;
      ctx.set(i, 180 + combined * 30, 70, 40 + combined * 40);
    }
  },
  meta: { name: 'tidal-pool' }
})`
  },
  {
    name: 'Campfire',
    gradient: 'linear-gradient(180deg, #1a0500, #cc3300, #ff8800, #ffdd00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const heat = (1 - v) * (0.7 + ctx.noise(u * 5, ctx.t * 4, 0) * 0.3);
      const flicker = ctx.noise(u * 8, v * 3, ctx.t * 6) * 0.3;
      const intensity = heat + flicker;
      const h = intensity > 0.8 ? 45 : intensity > 0.5 ? 25 : 5;
      ctx.set(i, h, 100, Math.min(100, intensity * 100));
    }
  },
  meta: { name: 'campfire' }
})`
  },
  {
    name: 'Warp Speed',
    gradient: 'radial-gradient(circle, #ffffff, #4444ff, #000033)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const streak = Math.sin(theta * 20 + r * 3 - ctx.t * 8);
      const b = streak > 0.85 ? 100 : streak > 0.7 ? 40 : 2;
      const s = b > 50 ? 10 : 60;
      ctx.set(i, 230, s, b);
    }
  },
  meta: { name: 'warp-speed' }
})`
  },
  {
    name: 'Peppermint',
    gradient: 'conic-gradient(from 0deg, #ff0000, #ffffff, #ff0000, #ffffff, #ff0000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const stripe = Math.sin(theta * 5 + r * 3 - ctx.t * 1.5) > 0;
      ctx.set(i, stripe ? 0 : 0, stripe ? 100 : 0, stripe ? 80 : 95);
    }
  },
  meta: { name: 'peppermint' }
})`
  },
  {
    name: 'Northern Lights',
    gradient: 'linear-gradient(180deg, #000022, #00aa44, #00ddaa, #aa00ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const curtain = ctx.noise(u * 1.5, ctx.t * 0.3, 0) * 2;
      const shimmer = ctx.noise(u * 6, v * 2 + ctx.t * 0.5, ctx.t * 1.5);
      const visible = Math.abs(v - 0.3 - curtain * 0.2) < 0.25;
      const h = 140 + shimmer * 100;
      ctx.set(i, h, 80, visible ? shimmer * 90 : 2);
    }
  },
  meta: { name: 'northern-lights' }
})`
  },
  {
    name: 'Glitch',
    gradient: 'linear-gradient(90deg, #ff0000, #000000, #00ff00, #000000, #0000ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      const glitchY = Math.floor(ctx.noise(0, y * 0.5, Math.floor(ctx.t * 8)) * 3);
      const offset = glitchY > 1 ? Math.sin(ctx.t * 50 + x) * 3 : 0;
      const band = (y + offset + ctx.t * 2) % 3;
      const h = band < 1 ? 0 : band < 2 ? 120 : 240;
      const flicker = ctx.noise(x, y, ctx.t * 12) > 0.4 ? 1 : 0.2;
      ctx.set(i, h, 100, flicker * 80);
    }
  },
  meta: { name: 'glitch' }
})`
  },
  {
    name: 'Golden Hour',
    gradient: 'linear-gradient(135deg, #cc8800, #ffcc44, #ffee88, #cc8800)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const glow = Math.sin(u * 2 + ctx.t * 0.4) * 0.3 + 0.7;
      const n = ctx.noise(u * 3, v * 3, ctx.t * 0.3);
      const h = 38 + n * 15;
      ctx.set(i, h, 80, glow * (60 + n * 40));
    }
  },
  meta: { name: 'golden-hour' }
})`
  },
  {
    name: 'Cyberpunk',
    gradient: 'linear-gradient(135deg, #ff00ff, #0a0a2a, #00ffff, #0a0a2a)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const line = Math.sin(v * 20 - ctx.t * 4) > 0.8 ? 1 : 0;
      const scan = Math.sin(v * 40 + ctx.t * 10) > 0.95 ? 0.5 : 0;
      const hue = u > 0.5 ? 300 : 180;
      const n = ctx.noise(u * 5, v * 2, ctx.t);
      ctx.set(i, hue + n * 20, 100, (line + scan + n * 0.2) * 100);
    }
  },
  meta: { name: 'cyberpunk' }
})`
  },
  {
    name: 'Zen Garden',
    gradient: 'linear-gradient(135deg, #2a3a2a, #5a7a5a, #8aaa8a, #2a3a2a)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const ripple = Math.sin(u * 12 + Math.sin(v * 4 + ctx.t * 0.3) * 2);
      const h = 130 + ripple * 15;
      const b = 20 + (ripple + 1) * 20;
      ctx.set(i, h, 30, b);
    }
  },
  meta: { name: 'zen-garden' }
})`
  },
  {
    name: 'Volcano',
    gradient: 'linear-gradient(180deg, #000000, #330000, #ff3300, #ffaa00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const eruption = ctx.noise(theta * 3, ctx.t * 2, 0);
      const lava = Math.max(0, eruption - 0.4) / 0.6;
      const core = Math.max(0, 1 - r * 3);
      const h = core > 0.5 ? 30 : 5;
      ctx.set(i, h, 100, (core * 0.6 + lava * 0.8) * 100);
    }
  },
  meta: { name: 'volcano' }
})`
  },
  {
    name: 'Electric Storm',
    gradient: 'linear-gradient(135deg, #1a0033, #6600cc, #cc00ff, #1a0033)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const zap = ctx.noise(u * 3, v * 3, ctx.t * 5);
      const bolt = zap > 0.8 ? Math.pow((zap - 0.8) / 0.2, 2) : 0;
      const ambient = ctx.noise(u * 2, v * 2, ctx.t * 0.3) * 30;
      ctx.set(i, 280 + bolt * 40, 80, ambient + bolt * 100);
    }
  },
  meta: { name: 'electric-storm' }
})`
  }
];

const DEFAULT_CODE = `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const hue = (u * 360 + ctx.t * 60) % 360;
      const bright = 50 + Math.sin(v * Math.PI + ctx.t) * 40;
      ctx.set(i, hue, 100, bright);
    }
  },
  meta: { name: 'custom' }
})`;

function PatternTile({
  pattern,
  active,
  onClick,
  showPreview,
  speed
}: {
  pattern: PatternDef;
  active: boolean;
  onClick: () => void;
  showPreview?: boolean;
  speed?: number;
}) {
  const tileSize = showPreview ? 96 : 72;
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden transition-transform active:scale-93"
      style={{
        width: tileSize,
        height: tileSize,
        borderRadius: 16,
        background: showPreview ? '#0a0a12' : pattern.gradient,
        border: active ? '2.5px solid #fff' : '2.5px solid transparent'
      }}
    >
      {showPreview ? (
        <MiniGridPreview
          source={pattern.code}
          size={tileSize}
          isPattern
          speed={speed}
        />
      ) : null}
      <span
        className="absolute bottom-1 left-0 right-0 text-center text-white font-semibold"
        style={{
          fontSize: 9,
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          letterSpacing: '0.02em'
        }}
      >
        {pattern.name}
      </span>
    </button>
  );
}

function PreviewToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 500,
        background: enabled ? 'rgba(59,130,246,0.15)' : 'transparent',
        color: enabled ? '#fff' : '#888898',
        border: '1px solid ' + (enabled ? '#3b82f6' : '#2a2a35')
      }}
      title={enabled ? 'Hide previews' : 'Show animated previews'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}>
        {enabled ? (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </>
        )}
      </svg>
      Preview
    </button>
  );
}

export function PatternsTab({
  send,
  animSpeed,
  onAnimSpeed
}: {
  send: (msg: Record<string, unknown>) => void;
  animSpeed: number;
  onAnimSpeed: (v: number) => void;
}) {
  const [activePattern, setActivePattern] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSelect = useCallback((pattern: PatternDef) => {
    setActivePattern(pattern.name);
    setCode(pattern.code);
    setError(null);
    setStatus('running');
    send({ type: 'evalPattern', code: pattern.code, params: {} });
  }, [send]);

  const handleRun = useCallback(() => {
    try {
      setError(null);
      setStatus('running');
      setActivePattern(null);
      send({ type: 'evalPattern', code, params: {} });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [send, code]);

  const handleStop = useCallback(() => {
    send({ type: 'stopPattern' });
    setStatus('idle');
    setActivePattern(null);
  }, [send]);

  return (
    <div className="flex flex-col gap-4">
      {/* Speed slider + Preview toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium shrink-0" style={{ color: '#888898' }}>Speed</span>
        <input
          type="range"
          className="flex-1"
          style={{ minWidth: 120, height: 28 }}
          min={0}
          max={1000}
          value={Math.round(Math.log(animSpeed / 0.01) / Math.log(5.0 / 0.01) * 1000)}
          onChange={(e) => {
            const t = parseInt(e.target.value, 10) / 1000;
            onAnimSpeed(0.01 * Math.pow(5.0 / 0.01, t));
          }}
        />
        <span className="text-xs font-mono shrink-0" style={{ color: '#888898', minWidth: 36, textAlign: 'right' }}>
          {animSpeed < 0.1 ? animSpeed.toFixed(3) : animSpeed < 1 ? animSpeed.toFixed(2) : animSpeed.toFixed(1)}x
        </span>
        <button
          onClick={() => onAnimSpeed(1.0)}
          title="Reset to 1.0x"
          style={{
            width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: Math.abs(animSpeed - 1.0) < 0.01 ? 'transparent' : 'rgba(59,130,246,0.15)',
            border: 'none', cursor: 'pointer', opacity: Math.abs(animSpeed - 1.0) < 0.01 ? 0.3 : 1
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888898" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <PreviewToggle enabled={showPreview} onToggle={() => setShowPreview(!showPreview)} />
      </div>

      {/* Pattern tiles */}
      <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 360 : undefined }}>
        {PRESETS.map((p) => (
          <PatternTile
            key={p.name}
            pattern={p}
            active={activePattern === p.name}
            onClick={() => handleSelect(p)}
            showPreview={showPreview}
            speed={animSpeed}
          />
        ))}
      </div>

      {/* Stop button */}
      {status === 'running' && (
        <button
          onClick={handleStop}
          style={{
            padding: '8px 20px',
            borderRadius: 16,
            fontSize: 12,
            fontWeight: 600,
            background: '#1a1a2e',
            border: '1px solid #333',
            color: '#f87171',
            alignSelf: 'flex-start'
          }}
        >
          Stop Pattern
        </button>
      )}

      {/* Editor toggle */}
      <button
        onClick={() => setShowEditor(v => !v)}
        style={{
          padding: '6px 12px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 500,
          background: 'transparent',
          border: '1px solid #1a1a25',
          color: '#555',
          alignSelf: 'flex-start',
          cursor: 'pointer'
        }}
      >
        {showEditor ? 'Hide Editor' : 'Code Editor'}
      </button>

      {/* Code editor (toggled) */}
      {showEditor && (
        <div className="flex flex-col gap-3">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="font-mono text-sm"
            style={{
              width: '100%',
              minHeight: 200,
              padding: 12,
              borderRadius: 12,
              background: '#0a0a10',
              border: '1px solid #1a1a25',
              color: '#c8c8d8',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.5,
              tabSize: 2
            }}
          />
          <div className="flex gap-2 items-center">
            <button
              onClick={handleRun}
              style={{
                padding: '8px 20px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 600,
                background: status === 'running' ? '#1a3a2a' : '#1a1a2e',
                border: status === 'running' ? '1px solid #2a5a3a' : '1px solid #333',
                color: status === 'running' ? '#4ade80' : '#e8e8f0'
              }}
            >
              {status === 'running' ? 'Update' : 'Run'}
            </button>
            <button
              onClick={handleStop}
              style={{
                padding: '8px 20px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 600,
                background: '#1a1a2e',
                border: '1px solid #333',
                color: '#f87171'
              }}
            >
              Stop
            </button>
            {error && (
              <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
