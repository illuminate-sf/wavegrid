'use client';

import { useCallback, useState } from 'react';

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

const PRESETS: { name: string; code: string }[] = [
  {
    name: 'Color Cycle',
    code: `({
  render(ctx) {
    ctx.fill(ctx.t * 30 % 360, 100, 80);
  },
  meta: { name: 'color-cycle' }
})`
  },
  {
    name: 'Noise Field',
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
  }
];

export function PatternsTab({
  send
}: {
  send: (msg: Record<string, unknown>) => void;
}) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(() => {
    try {
      setError(null);
      setStatus('running');
      send({ type: 'evalPattern', code, params: {} });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [send, code]);

  const handleStop = useCallback(() => {
    send({ type: 'stopPattern' });
    setStatus('idle');
  }, [send]);

  const handlePreset = useCallback((preset: typeof PRESETS[number]) => {
    setCode(preset.code);
    setError(null);
    setStatus('running');
    send({ type: 'evalPattern', code: preset.code, params: {} });
  }, [send]);

  return (
    <div className="flex flex-col gap-4">
      {/* Presets */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => handlePreset(p)}
            className="transition-all"
            style={{
              padding: '6px 12px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 500,
              background: '#12121a',
              border: '1px solid #1a1a25',
              color: '#888898'
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Code editor */}
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

      {/* Controls */}
      <div className="flex gap-2 items-center">
        <button
          onClick={handleRun}
          style={{
            padding: '10px 24px',
            borderRadius: 20,
            fontSize: 14,
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
            padding: '10px 24px',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 600,
            background: '#1a1a2e',
            border: '1px solid #333',
            color: '#f87171'
          }}
        >
          Stop
        </button>
        {status === 'running' && (
          <span style={{ fontSize: 12, color: '#4ade80' }}>Pattern active</span>
        )}
        {error && (
          <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>
        )}
      </div>
    </div>
  );
}
