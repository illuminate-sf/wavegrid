'use client';

import { useCallback, useState } from 'react';

interface PatternDef {
  name: string;
  gradient: string;
  code: string;
}

const PRESETS: PatternDef[] = [
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
  onClick
}: {
  pattern: PatternDef;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden transition-transform active:scale-93"
      style={{
        width: 72,
        height: 72,
        borderRadius: 16,
        background: pattern.gradient,
        border: active ? '2.5px solid #fff' : '2.5px solid transparent'
      }}
    >
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

export function PatternsTab({
  send
}: {
  send: (msg: Record<string, unknown>) => void;
}) {
  const [activePattern, setActivePattern] = useState<string | null>(null);
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
      {/* Pattern tiles */}
      <div className="flex gap-2.5 flex-wrap">
        {PRESETS.map((p) => (
          <PatternTile
            key={p.name}
            pattern={p}
            active={activePattern === p.name}
            onClick={() => handleSelect(p)}
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
