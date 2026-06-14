'use client';

export interface SymmetryState {
  h: boolean;
  v: boolean;
  radial: boolean;
  kaleidoscope: boolean;
}

const modes: { key: keyof SymmetryState; icon: string; label: string }[] = [
  { key: 'h', icon: '↔', label: 'Horizontal' },
  { key: 'v', icon: '↕', label: 'Vertical' },
  { key: 'radial', icon: '✦', label: 'Radial' },
  { key: 'kaleidoscope', icon: '❋', label: 'Kaleidoscope' }
];

export function SymmetryControls({
  symmetry,
  onChange
}: {
  symmetry: SymmetryState;
  onChange: (s: SymmetryState) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: '#888898', letterSpacing: '0.05em' }}>
        MIRROR
      </p>
      <div className="flex gap-2">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => onChange({ ...symmetry, [m.key]: !symmetry[m.key] })}
            className="flex flex-col items-center gap-1 transition-all"
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: symmetry[m.key] ? 'rgba(74,124,255,0.15)' : '#12121a',
              border: `1px solid ${symmetry[m.key] ? '#4a7cff' : '#1a1a25'}`,
              color: symmetry[m.key] ? '#4a7cff' : '#888898',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: 22 }}>{m.icon}</span>
            <span style={{ fontSize: 8, letterSpacing: '0.03em' }}>{m.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs" style={{ color: 'rgba(136,136,152,0.5)' }}>
        Paint with symmetry — each stroke mirrors across the selected axes
      </p>
    </div>
  );
}
