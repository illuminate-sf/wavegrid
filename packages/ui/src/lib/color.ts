/** Convert HSB (0-360, 0-100, 0-100) to CSS hsl() string */
export function hsbToHsl(h: number, s: number, b: number): string {
  const l = (b / 100) * (1 - s / 200);
  const sl = l === 0 || l === 1 ? 0 : ((b / 100 - l) / Math.min(l, 1 - l)) * 100;
  return `hsl(${h}, ${sl}%, ${l * 100}%)`;
}

/** Convert HSB to hex string */
export function hsbToHex(h: number, s: number, b: number): string {
  const l = (b / 100) * (1 - s / 200);
  const sl = l === 0 || l === 1 ? 0 : (b / 100 - l) / Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - sl * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(color * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Convert HSB (0-360, 0-100, 0-100) to RGB (0-255) */
export function hsbToRgb(h: number, s: number, b: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  b = Math.max(0, Math.min(100, b)) / 100;
  const c = b * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = b - c;
  let r = 0, g = 0, bl = 0;
  if (h < 60)        { r = c; g = x; bl = 0; }
  else if (h < 120)  { r = x; g = c; bl = 0; }
  else if (h < 180)  { r = 0; g = c; bl = x; }
  else if (h < 240)  { r = 0; g = x; bl = c; }
  else if (h < 300)  { r = x; g = 0; bl = c; }
  else               { r = c; g = 0; bl = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((bl + m) * 255)];
}

/** Convert hex color to RGB */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}
