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
