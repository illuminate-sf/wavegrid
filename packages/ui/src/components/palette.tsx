'use client';

const TILE = 72;
const TILE_RADIUS = 16;
const LABEL_SIZE = 10;

const sceneGradients: Record<string, string> = {
  civic: 'linear-gradient(135deg, #1a3a8a, #2563eb, #60a5fa)',
  pride: 'linear-gradient(135deg, #e33, #f90, #ee0, #3a5, #35e, #a3e)',
  gold: 'linear-gradient(135deg, #b8860b, #ffd700, #f0c040)',
  white: 'linear-gradient(135deg, #ccc, #fff, #ddd)',
  solstice: 'linear-gradient(135deg, #c2410c, #ea580c, #f97316)',
  ocean: 'linear-gradient(135deg, #0e4580, #0891b2, #22d3ee)',
  sunset: 'linear-gradient(135deg, #c2185b, #e65100, #f9a825)',
  heart: 'radial-gradient(circle at 50% 40%, #ef4444, #b91c1c, #1a1a25)',
  sf: 'linear-gradient(135deg, #1a3a8a, #ffd700, #1a3a8a)',
  smiley: 'radial-gradient(circle at 50% 45%, #facc15, #ca8a04, #1a1a25)',
  forest: 'linear-gradient(to top, #14532d, #22c55e, #86efac)',
  fire: 'linear-gradient(to top, #fbbf24, #f97316, #b91c1c)',
  night: 'linear-gradient(135deg, #0f172a, #1e3a5f, #0f172a)',
  checker: 'repeating-conic-gradient(#ccc 0% 25%, #3b82f6 0% 50%) 50% / 36px 36px',
  off: 'linear-gradient(135deg, #1a1a25, #0e0e14)'
};

const animGradients: Record<string, string> = {
  wave: 'linear-gradient(135deg, #1e40af, #3b82f6)',
  breathe: 'linear-gradient(135deg, #4338ca, #6366f1)',
  rainbow: 'linear-gradient(135deg, #e33, #ee0, #3a5, #35e)',
  pacman: 'linear-gradient(135deg, #ca8a04, #facc15)',
  spiral: [
    'radial-gradient(circle at 50% 50%, #05070d 0 16%, rgba(5, 7, 13, 0.72) 17%, transparent 27%)',
    'repeating-conic-gradient(from 18deg at 50% 50%, #05070d 0deg 18deg, #e40303 20deg, #ff8c00 29deg, #ffed00 38deg, #008026 47deg, #24408e 56deg, #732982 66deg, #05070d 78deg 120deg)'
  ].join(', '),
  rain: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
  heartbeat: 'linear-gradient(135deg, #b91c1c, #ef4444)',
  'pride-scroll': 'linear-gradient(90deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)',
  'pride-flow': 'linear-gradient(180deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)',
  'pride-diagonal': 'linear-gradient(135deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)',
  'pride-breathe': 'radial-gradient(circle, #ff8c00, #e40303, #750787)',
  'pride-rotate': 'linear-gradient(90deg, #e40303, #ffed00, #008026, #004dff, #750787, #e40303)'
};

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
  onSelect: (name: string) => void;
}) {
  return (
    <div className="flex gap-2.5 flex-wrap">
      {Object.keys(sceneGradients).map((name) => (
        <Tile
          key={name}
          name={name}
          gradient={sceneGradients[name]}
          active={active === name}
          onClick={() => onSelect(name)}
        />
      ))}
    </div>
  );
}

export function AnimationPalette({
  active,
  onSelect
}: {
  active: string | null;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="flex gap-2.5 flex-wrap">
      {Object.keys(animGradients).map((name) => (
        <Tile
          key={name}
          name={name}
          gradient={animGradients[name]}
          active={active === name}
          onClick={() => onSelect(name)}
        />
      ))}
    </div>
  );
}
