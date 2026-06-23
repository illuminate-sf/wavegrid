'use client';

import type { SnippetPattern } from '@/lib/patterns';
import { ANIMATIONS, SCENES } from '@/lib/patterns';

const TILE = 72;
const TILE_RADIUS = 16;
const LABEL_SIZE = 10;

function Tile({
  name,
  gradient,
  active,
  onClick
}: {
  name: string;
  gradient: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden transition-transform active:scale-93"
      style={{
        width: TILE,
        height: TILE,
        borderRadius: TILE_RADIUS,
        background: gradient,
        border: active ? '2.5px solid #fff' : '2.5px solid transparent'
      }}
    >
      <span
        className="absolute bottom-1 left-0 right-0 text-center text-white font-semibold"
        style={{
          fontSize: LABEL_SIZE,
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          letterSpacing: '0.03em'
        }}
      >
        {name}
      </span>
    </button>
  );
}

export function ScenePalette({
  active,
  onSelect
}: {
  active: string | null;
  onSelect: (pattern: SnippetPattern) => void;
}) {
  return (
    <div className="flex gap-2.5 flex-wrap">
      {SCENES.map((p) => (
        <Tile
          key={p.name}
          name={p.name}
          gradient={p.gradient}
          active={active === p.name}
          onClick={() => onSelect(p)}
        />
      ))}
    </div>
  );
}

export function AnimationPalette({
  active,
  onSelect,
  onStop
}: {
  active: string | null;
  onSelect: (pattern: SnippetPattern) => void;
  onStop: () => void;
}) {
  return (
    <div className="flex gap-2.5 flex-wrap">
      {ANIMATIONS.map((p) => (
        <Tile
          key={p.name}
          name={p.name}
          gradient={p.gradient}
          active={active === p.name}
          onClick={() => onSelect(p)}
        />
      ))}
      <button
        onClick={onStop}
        className="transition-transform active:scale-93 flex items-center justify-center"
        style={{
          width: TILE,
          height: TILE,
          borderRadius: TILE_RADIUS,
          background: '#1a1a25',
          border: '1px solid #333'
        }}
      >
        <span style={{ fontSize: 12, color: '#d44', fontWeight: 600 }}>Stop</span>
      </button>
    </div>
  );
}
