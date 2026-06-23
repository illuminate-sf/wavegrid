'use client';

import { useCallback, useRef } from 'react';

interface DropsConfig {
  spectrumStart: number;
  spectrumEnd: number;
  speed: number;
  decay: number;
  width: number;
}

export function useDrops(
  _numCannons: number,
  _gridColumns: number,
  config: DropsConfig,
  loadPattern: (code: string) => Promise<void>
) {
  const configRef = useRef(config);
  configRef.current = config;

  const addDrop = useCallback((originIndex: number) => {
    const cfg = configRef.current;
    const code = `var meta = { name: 'Drop' };
var origin = ${originIndex};
var specStart = ${cfg.spectrumStart};
var specEnd = ${cfg.spectrumEnd};
var speed = ${cfg.speed};
var decay = ${cfg.decay};
var ringWidth = ${cfg.width};
function render(ctx) {
  ctx.fade(0.8);
  var oRow = Math.floor(origin / ctx.cols);
  var oCol = origin % ctx.cols;
  var radius = ctx.t * (0.3 + speed * 0.15) * 8;
  var maxR = Math.max(ctx.cols, ctx.rows) * 1.5;
  var decayRate = 0.6 + (10 - decay) * 0.06;
  for (var i = 0; i < ctx.count; i++) {
    var xy = ctx.xy(i);
    var dist = Math.sqrt((xy[1] - oRow) * (xy[1] - oRow) + (xy[0] - oCol) * (xy[0] - oCol));
    var delta = Math.abs(dist - radius);
    if (delta > ringWidth) continue;
    var ringFalloff = 1 - (delta / ringWidth);
    var ageFalloff = Math.pow(decayRate, ctx.t * 4);
    var v = ringFalloff * ageFalloff;
    if (v < 0.01) continue;
    var specRange = specEnd - specStart;
    var h = (specStart + (dist / maxR) * specRange + 360) % 360;
    ctx.setHSV(i, h, 90, v * 100);
  }
}`;
    loadPattern(code);
  }, [loadPattern]);

  return { addDrop };
}

export function DropsControls({
  config,
  onChange
}: {
  config: DropsConfig;
  onChange: (c: DropsConfig) => void;
}) {
  const spectrumRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<'start' | 'end' | null>(null);
  const rafRef = useRef(0);

  const drawSpectrum = useCallback(() => {
    const canvas = spectrumRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    for (let x = 0; x < w; x++) {
      const hue = (x / w) * 360;
      ctx.fillStyle = `hsl(${hue}, 90%, 50%)`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, []);

  const spectrumRefCallback = useCallback((el: HTMLCanvasElement | null) => {
    (spectrumRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
    if (el) {
      requestAnimationFrame(drawSpectrum);
    }
  }, [drawSpectrum]);

  const hueFromPointer = useCallback((clientX: number) => {
    const canvas = spectrumRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pos * 360);
  }, []);

  const handleSpectrumDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const hue = hueFromPointer(e.clientX);
    const dStart = Math.abs(hue - config.spectrumStart);
    const dEnd = Math.abs(hue - config.spectrumEnd);
    const which = dStart < dEnd ? 'start' : 'end';
    draggingRef.current = which;
    if (which === 'start') {
      onChange({ ...config, spectrumStart: hue });
    } else {
      onChange({ ...config, spectrumEnd: hue });
    }
  }, [config, onChange, hueFromPointer]);

  const handleSpectrumMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const which = draggingRef.current;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const hue = hueFromPointer(e.clientX);
      if (which === 'start') {
        onChange({ ...config, spectrumStart: hue });
      } else {
        onChange({ ...config, spectrumEnd: hue });
      }
    });
  }, [config, onChange, hueFromPointer]);

  const handleSpectrumUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const handleSliderChange = useCallback((key: 'speed' | 'decay' | 'width', val: number) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      onChange({ ...config, [key]: val });
    });
  }, [config, onChange]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium mb-2" style={{ color: '#888898', letterSpacing: '0.05em' }}>
          Spectrum
        </p>
        <div
          className="relative"
          style={{ touchAction: 'none' }}
          onPointerDown={handleSpectrumDown}
          onPointerMove={handleSpectrumMove}
          onPointerUp={handleSpectrumUp}
          onPointerCancel={handleSpectrumUp}
        >
          <canvas
            ref={spectrumRefCallback}
            width={200}
            height={44}
            className="w-full rounded-md"
            style={{ height: 44 }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              left: `calc(${(config.spectrumStart / 360) * 100}% - 10px)`,
              top: -4,
              bottom: -4,
              width: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                width: 6,
                height: '100%',
                background: '#fff',
                borderRadius: 3,
                boxShadow: '0 0 8px rgba(0,0,0,0.6), 0 0 2px rgba(255,255,255,0.4)'
              }}
            />
          </div>
          <div
            className="absolute pointer-events-none"
            style={{
              left: `calc(${(config.spectrumEnd / 360) * 100}% - 10px)`,
              top: -4,
              bottom: -4,
              width: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                width: 6,
                height: '100%',
                background: '#fff',
                borderRadius: 3,
                boxShadow: '0 0 8px rgba(0,0,0,0.6), 0 0 2px rgba(255,255,255,0.4)'
              }}
            />
          </div>
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `${(Math.min(config.spectrumStart, config.spectrumEnd) / 360) * 100}%`,
              width: `${(Math.abs(config.spectrumEnd - config.spectrumStart) / 360) * 100}%`,
              background: 'rgba(255,255,255,0.12)',
              borderTop: '2px solid rgba(255,255,255,0.4)',
              borderBottom: '2px solid rgba(255,255,255,0.4)'
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs font-mono" style={{ color: '#888898', fontSize: 9 }}>{config.spectrumStart}&deg;</span>
          <span className="text-xs font-mono" style={{ color: '#888898', fontSize: 9 }}>{config.spectrumEnd}&deg;</span>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {[
          { label: 'Speed', key: 'speed' as const, min: 1, max: 10, val: config.speed },
          { label: 'Decay', key: 'decay' as const, min: 1, max: 10, val: config.decay },
          { label: 'Width', key: 'width' as const, min: 1, max: 5, val: config.width }
        ].map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#888898' }}>{s.label}</span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              value={s.val}
              onChange={(e) => handleSliderChange(s.key, Number(e.target.value))}
              style={{ width: 80 }}
            />
            <span className="text-sm font-mono" style={{ color: '#888898', minWidth: 18, textAlign: 'right' }}>
              {s.val}
            </span>
          </div>
        ))}
      </div>

      <p className="text-sm" style={{ color: 'rgba(136,136,152,0.5)' }}>
        Tap on the grid to create ripples
      </p>
    </div>
  );
}
