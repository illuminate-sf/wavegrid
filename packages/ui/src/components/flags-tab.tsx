'use client';

import { useCallback, useState } from 'react';

import type { SnippetPattern } from '@/lib/patterns';
import { FLAG_PATTERNS, makeFlagWithEffect } from '@/lib/patterns';

type FlagEffect = 'none' | 'spin' | 'ripple' | 'wave';

const EFFECTS: { key: FlagEffect; label: string }[] = [
  { key: 'none', label: 'Static' },
  { key: 'spin', label: 'Spin' },
  { key: 'ripple', label: 'Ripple' },
  { key: 'wave', label: 'Wave' }
];

export function useFlagAnimation(
  loadPattern: (code: string, speed?: number) => Promise<void>
) {
  const [activeFlag, setActiveFlag] = useState<string | null>(null);
  const [effect, setEffect] = useState<FlagEffect>('none');
  const [purpleBlack, setPurpleBlack] = useState(false);
  const [lastFlagCode, setLastFlagCode] = useState<string | null>(null);

  const selectFlag = useCallback((pattern: SnippetPattern) => {
    setActiveFlag(pattern.name);
    setLastFlagCode(pattern.code);
    const code = makeFlagWithEffect(pattern.code, effect);
    loadPattern(code);
  }, [effect, loadPattern]);

  const applyEffect = useCallback((e: FlagEffect) => {
    setEffect(e);
    if (lastFlagCode) {
      const code = makeFlagWithEffect(lastFlagCode, e);
      loadPattern(code);
    }
  }, [lastFlagCode, loadPattern]);

  const stop = useCallback(() => {
    setActiveFlag(null);
    setLastFlagCode(null);
  }, []);

  return { activeFlag, effect, setEffect: applyEffect, purpleBlack, setPurpleBlack, selectFlag, stop };
}

export function FlagsTab({
  activeFlag,
  effect,
  purpleBlack,
  onSelectFlag,
  onEffect,
  onPurpleBlack
}: {
  activeFlag: string | null;
  effect: FlagEffect;
  purpleBlack: boolean;
  onSelectFlag: (pattern: SnippetPattern) => void;
  onEffect: (e: FlagEffect) => void;
  onPurpleBlack: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Flag swatches */}
      <div className="flex gap-2.5 flex-wrap">
        {FLAG_PATTERNS.map((flag) => (
          <button
            key={flag.name}
            onClick={() => onSelectFlag(flag)}
            className="relative overflow-hidden transition-transform active:scale-93"
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: flag.gradient,
              border: activeFlag === flag.name ? '2.5px solid #fff' : '2.5px solid transparent'
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
              {flag.name}
            </span>
          </button>
        ))}
      </div>

      {/* Effect toggles */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-sm font-medium" style={{ color: '#888898', letterSpacing: '0.05em' }}>FX</span>
        {EFFECTS.map((fx) => (
          <button
            key={fx.key}
            onClick={() => onEffect(fx.key)}
            className="transition-all"
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
              background: effect === fx.key ? '#1a1a2e' : 'transparent',
              border: effect === fx.key ? '1px solid #333' : '1px solid #1a1a25',
              color: effect === fx.key ? '#e8e8f0' : '#666'
            }}
          >
            {fx.label}
          </button>
        ))}
      </div>

      {/* Dark purple toggle */}
      <button
        onClick={() => onPurpleBlack(!purpleBlack)}
        className="flex items-center gap-2 transition-all"
        style={{
          padding: '8px 16px',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 500,
          background: purpleBlack ? '#2a1a3e' : 'transparent',
          border: purpleBlack ? '1px solid #5a3a7e' : '1px solid #1a1a25',
          color: purpleBlack ? '#c8a0f0' : '#666'
        }}
      >
        <span style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: purpleBlack ? '#7b2ff7' : '#222',
          border: '1px solid #444'
        }} />
        Black &rarr; Purple
      </button>
    </div>
  );
}
