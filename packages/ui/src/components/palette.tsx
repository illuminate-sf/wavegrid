'use client';

const defaultSceneColors: Record<string, string> = {
  civic: 'bg-blue-600',
  pride: 'bg-gradient-to-r from-red-500 via-yellow-400 to-purple-500',
  gold: 'bg-amber-500',
  white: 'bg-white',
  solstice: 'bg-orange-500',
  ocean: 'bg-cyan-600',
  sunset: 'bg-orange-600',
  off: 'bg-neutral-800'
};

const defaultAnimColors: Record<string, string> = {
  wave: 'bg-blue-500',
  breathe: 'bg-indigo-500',
  rainbow: 'bg-gradient-to-r from-red-500 via-green-400 to-blue-500',
  pacman: 'bg-yellow-400',
  spiral: 'bg-purple-500',
  rain: 'bg-sky-600',
  heartbeat: 'bg-red-500'
};

export function ScenePalette({ active, onSelect }: { active: string | null; onSelect: (name: string) => void }) {
  const scenes = Object.keys(defaultSceneColors);
  return (
    <div className="flex flex-wrap gap-2">
      {scenes.map((name) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className={`px-3 py-1.5 rounded-full text-xs capitalize border transition-all ${
            active === name
              ? 'border-accent text-white ring-1 ring-accent'
              : 'border-border text-text-2 hover:border-text-2'
          }`}
        >
          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${defaultSceneColors[name] || 'bg-neutral-500'}`} />
          {name}
        </button>
      ))}
    </div>
  );
}

export function AnimationPalette({ active, onSelect, onStop }: { active: string | null; onSelect: (name: string) => void; onStop: () => void }) {
  const anims = Object.keys(defaultAnimColors);
  return (
    <div className="flex flex-wrap gap-2">
      {anims.map((name) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className={`px-3 py-1.5 rounded-full text-xs capitalize border transition-all ${
            active === name
              ? 'border-success text-white ring-1 ring-success'
              : 'border-border text-text-2 hover:border-text-2'
          }`}
        >
          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${defaultAnimColors[name] || 'bg-neutral-500'}`} />
          {name}
        </button>
      ))}
      <button
        onClick={onStop}
        className="px-3 py-1.5 rounded-full text-xs border border-danger/50 text-danger hover:border-danger"
      >
        Stop
      </button>
    </div>
  );
}
