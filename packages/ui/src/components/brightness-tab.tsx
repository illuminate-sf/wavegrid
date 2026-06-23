'use client';

import { useCallback, useState } from 'react';

export type BrightnessMode = 'off' | 'breathe' | 'ripple' | 'wave' | 'fire' | 'shimmer';

interface BrightnessConfig {
  mode: BrightnessMode;
  speed: number;
  intensity: number;
}

const MODES: { key: BrightnessMode; label: string }[] = [
  { key: 'off', label: 'Off' },
  { key: 'breathe', label: 'Breathe' },
  { key: 'ripple', label: 'Ripple' },
  { key: 'wave', label: 'Wave' },
  { key: 'fire', label: 'Fire' },
  { key: 'shimmer', label: 'Shimmer' }
];

const MODE_GRADIENTS: Record<BrightnessMode, string> = {
  off: 'linear-gradient(135deg, #1a1a25, #0e0e14)',
  breathe: 'linear-gradient(135deg, #1a1a4a, #3a3a8a)',
  ripple: 'linear-gradient(135deg, #0e3060, #1a6090)',
  wave: 'linear-gradient(135deg, #0a4040, #1a8080)',
  fire: 'linear-gradient(135deg, #8a2000, #cc6600, #ffaa00)',
  shimmer: 'linear-gradient(135deg, #3a2a5a, #6a4a9a)'
};

const MODE_PATTERNS: Record<Exclude<BrightnessMode, 'off'>, (speed: number, intensity: number) => string> = {
  breathe: (speed, intensity) => `var meta = { name: 'Breathe FX' };
function render(ctx) {
  var spd = ${speed / 5};
  var mix = ${intensity / 100};
  var mod = 0.5 + 0.5 * Math.sin(ctx.t * spd * 1.5);
  var v = (1 - mix) + mod * mix;
  for (var i = 0; i < ctx.count; i++) ctx.setHSV(i, 220, 60, v * 80);
}`,
  ripple: (speed, intensity) => `var meta = { name: 'Ripple FX' };
function render(ctx) {
  var spd = ${speed / 5};
  var mix = ${intensity / 100};
  var cx = (ctx.cols-1)/2, cy = (ctx.rows-1)/2;
  for (var i = 0; i < ctx.count; i++) {
    var xy = ctx.xy(i);
    var dist = Math.sqrt((xy[1]-cy)*(xy[1]-cy) + (xy[0]-cx)*(xy[0]-cx));
    var mod = 0.5 + 0.5 * Math.sin(dist * 1.2 - ctx.t * spd * 2);
    var v = (1 - mix) + mod * mix;
    ctx.setHSV(i, 200 + dist * 8, 70, v * 90);
  }
}`,
  wave: (speed, intensity) => `var meta = { name: 'Wave FX' };
function render(ctx) {
  var spd = ${speed / 5};
  var mix = ${intensity / 100};
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var mod = 0.5 + 0.5 * Math.sin(uv[0] * Math.PI * 2 - ctx.t * spd * 1.8);
    var v = (1 - mix) + mod * mix;
    ctx.setHSV(i, 200 + uv[0] * 40, 70, v * 90);
  }
}`,
  fire: (speed, intensity) => `var meta = { name: 'Fire FX' };
function render(ctx) {
  var spd = ${speed / 5};
  var mix = ${intensity / 100};
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var heat = ctx.noise(uv[0] * 3, uv[1] * 2 - ctx.t * spd * 2, ctx.t * spd * 0.5);
    heat *= (1 - uv[1]);
    var v = ctx.clamp(heat * 2 * mix + (1-mix), 0, 1);
    var r = ctx.clamp(v * 3, 0, 1) * 255;
    var g = ctx.clamp(v * 3 - 1, 0, 1) * 255;
    var b = ctx.clamp(v * 3 - 2, 0, 1) * 255;
    ctx.setRGB(i, r, g, b);
  }
}`,
  shimmer: (speed, intensity) => `var meta = { name: 'Shimmer FX' };
function render(ctx) {
  var spd = ${speed / 5};
  var mix = ${intensity / 100};
  for (var i = 0; i < ctx.count; i++) {
    var noise = ctx.noise(i * 0.3, ctx.t * spd * 2, 0);
    var mod = 0.5 + 0.5 * noise;
    var v = (1 - mix) + mod * mix;
    ctx.setHSV(i, 260 + noise * 30, 60, v * 85);
  }
}`
};

export function useBrightnessAnimation(
  loadPattern: (code: string) => Promise<void>,
  stopPattern: () => Promise<void>
) {
  const [config, setConfig] = useState<BrightnessConfig>({
    mode: 'off',
    speed: 5,
    intensity: 60
  });

  const setMode = useCallback((mode: BrightnessMode) => {
    setConfig((c) => ({ ...c, mode }));
    if (mode === 'off') {
      stopPattern();
    } else {
      const gen = MODE_PATTERNS[mode];
      loadPattern(gen(config.speed, config.intensity));
    }
  }, [config.speed, config.intensity, loadPattern, stopPattern]);

  const setSpeed = useCallback((speed: number) => {
    setConfig((c) => {
      const next = { ...c, speed };
      if (next.mode !== 'off') {
        const gen = MODE_PATTERNS[next.mode];
        loadPattern(gen(speed, next.intensity));
      }
      return next;
    });
  }, [loadPattern]);

  const setIntensity = useCallback((intensity: number) => {
    setConfig((c) => {
      const next = { ...c, intensity };
      if (next.mode !== 'off') {
        const gen = MODE_PATTERNS[next.mode];
        loadPattern(gen(next.speed, intensity));
      }
      return next;
    });
  }, [loadPattern]);

  return { config, setMode, setSpeed, setIntensity };
}

export function BrightnessTab({
  config,
  onMode,
  onSpeed,
  onIntensity
}: {
  config: { mode: BrightnessMode; speed: number; intensity: number };
  onMode: (m: BrightnessMode) => void;
  onSpeed: (v: number) => void;
  onIntensity: (v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2.5 flex-wrap">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => onMode(m.key)}
            className="relative overflow-hidden transition-transform active:scale-93"
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: MODE_GRADIENTS[m.key],
              border: config.mode === m.key ? '2.5px solid #fff' : '2.5px solid transparent'
            }}
          >
            <span
              className="absolute bottom-1 left-0 right-0 text-center text-white font-semibold"
              style={{
                fontSize: 10,
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                letterSpacing: '0.03em'
              }}
            >
              {m.label}
            </span>
          </button>
        ))}
      </div>

      {config.mode !== 'off' && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-medium"
              style={{ color: '#888898', letterSpacing: '0.05em', minWidth: 56 }}
            >
              Speed
            </span>
            <input
              type="range"
              className="flex-1"
              min={1}
              max={10}
              value={config.speed}
              onChange={(e) => onSpeed(Number(e.target.value))}
            />
            <span
              className="text-sm font-mono"
              style={{ color: '#e8e8f0', minWidth: 28, textAlign: 'right' }}
            >
              {config.speed}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-medium"
              style={{ color: '#888898', letterSpacing: '0.05em', minWidth: 56 }}
            >
              Mix
            </span>
            <input
              type="range"
              className="flex-1"
              min={0}
              max={100}
              value={config.intensity}
              onChange={(e) => onIntensity(Number(e.target.value))}
            />
            <span
              className="text-sm font-mono"
              style={{ color: '#e8e8f0', minWidth: 36, textAlign: 'right' }}
            >
              {config.intensity}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
