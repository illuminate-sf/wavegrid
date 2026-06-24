import { CannonTarget, DEFAULT_GRID_COLUMNS, setCannonTarget } from './grid';

export type AnimationFn = (grid: CannonTarget[], tick: number, attack: number, gridColumns?: number) => void;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function smooth(value: number): number {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
}

const PRIDE_COLORS = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'];

function wrapUnit(value: number): number {
  return ((value % 1) + 1) % 1;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map(part => `${part}${part}`).join('')
    : value.padEnd(6, '0').slice(0, 6);
  const number = Number.parseInt(normalized, 16);

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255
  };
}

function prideColorAt(position: number, time: number): { h: number; s: number } {
  const scaled = wrapUnit(position + time * 0.025) * PRIDE_COLORS.length;
  const index = Math.floor(scaled);
  const nextIndex = (index + 1) % PRIDE_COLORS.length;
  const mix = scaled - index;
  const from = hexToRgb(PRIDE_COLORS[index]);
  const to = hexToRgb(PRIDE_COLORS[nextIndex]);
  const r = Math.round(from.r + (to.r - from.r) * mix);
  const g = Math.round(from.g + (to.g - from.g) * mix);
  const b = Math.round(from.b + (to.b - from.b) * mix);

  return rgbToHsb(r, g, b);
}

function rgbToHsb(r: number, g: number, b: number): { h: number; s: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }

  return {
    h: (h + 360) % 360,
    s: max === 0 ? 0 : (delta / max) * 100
  };
}

export const animations: Record<string, AnimationFn> = {
  wave: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    for (let i = 0; i < grid.length; i++) {
      const col = i % cols;
      const hue = (tick * 2 + col * 40) % 360;
      const bright = 60 + Math.sin(tick * 0.05 + col * 0.8) * 20;
      setCannonTarget(grid, i, hue, 85, bright, attack);
    }
  },

  breathe: (grid, tick, attack) => {
    const brightness = 40 + Math.sin(tick * 0.03) * 35;
    for (let i = 0; i < grid.length; i++) {
      setCannonTarget(grid, i, 220, 80, brightness, attack);
    }
  },

  rainbow: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    for (let i = 0; i < grid.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const hue = (tick * 1.5 + (row + col) * 25) % 360;
      setCannonTarget(grid, i, hue, 90, 80, attack);
    }
  },

  pacman: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    const perimeter = getPerimeterIndices(grid.length, cols);
    const pos = Math.floor(tick * 0.3) % perimeter.length;
    for (let i = 0; i < grid.length; i++) {
      setCannonTarget(grid, i, 220, 60, 15, attack);
    }
    const pacIdx = perimeter[pos];
    setCannonTarget(grid, pacIdx, 55, 95, 95, 1.0);
    for (let t = 1; t <= 3; t++) {
      const trailPos = (pos - t + perimeter.length) % perimeter.length;
      const trailIdx = perimeter[trailPos];
      setCannonTarget(grid, trailIdx, 55, 80, 70 - t * 18, 1.0);
    }
  },

  spiral: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    const rows = Math.ceil(grid.length / cols);
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const maxDistance = Math.max(1, Math.hypot(cx, cy));
    const time = tick / 60;

    for (let i = 0; i < grid.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const dx = col - cx;
      const dy = row - cy;
      const phase = Math.atan2(dy, dx);
      const distance = Math.hypot(dx, dy) / maxDistance;
      const arms = Math.cos(phase * 3 - time * 1.55 + distance * 6.2);
      const tail = Math.cos(phase * 3 - time * 1.55 + distance * 6.2 - 0.72);
      const coreVoid = smooth((distance - 0.16) / 0.18);
      const intensity = (smooth((arms - 0.18) / 0.82) * 0.78 + smooth((tail - 0.2) / 0.8) * 0.24) * coreVoid;
      const color = prideColorAt(0.78 + phase / (Math.PI * 2) + time * 0.1 + tail * 0.08, time);

      setCannonTarget(grid, i, color.h, color.s, intensity * 100, attack);
    }
  },

  rain: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    const rows = Math.ceil(grid.length / cols);
    for (let i = 0; i < grid.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const phase = (tick * 0.15 + col * 2.3 + col * col * 0.7) % rows;
      const dist = Math.abs(row - phase);
      const bright = dist < 1.5 ? 90 - dist * 30 : 10;
      setCannonTarget(grid, i, 200 + col * 8, 70, bright, attack);
    }
  },

  heartbeat: (grid, tick, attack) => {
    const phase = tick % 120;
    let brightness: number;
    if (phase < 10) brightness = 40 + phase * 5;
    else if (phase < 20) brightness = 90 - (phase - 10) * 5;
    else if (phase < 30) brightness = 40 + (phase - 20) * 4;
    else if (phase < 40) brightness = 80 - (phase - 30) * 4;
    else brightness = 40;

    for (let i = 0; i < grid.length; i++) {
      setCannonTarget(grid, i, 0, 90, brightness, attack);
    }
  }
};

function getPerimeterIndices(numCannons: number, cols: number): number[] {
  const rows = Math.ceil(numCannons / cols);
  const indices: number[] = [];
  for (let c = 0; c < cols; c++) indices.push(c);
  for (let r = 1; r < rows; r++) indices.push(r * cols + (cols - 1));
  for (let c = cols - 2; c >= 0; c--) indices.push((rows - 1) * cols + c);
  for (let r = rows - 2; r >= 1; r--) indices.push(r * cols);
  return indices.filter(i => i < numCannons);
}

export function getAnimationNames(): string[] {
  return Object.keys(animations);
}
