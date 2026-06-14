'use client';

import { useCallback, useState } from 'react';

import { AudioTab } from '@/components/audio-tab';
import { ColorPicker, Slider } from '@/components/controls';
import { GridDisplay } from '@/components/grid-display';
import { AnimationPalette, ScenePalette } from '@/components/palette';
import { useSocket } from '@/lib/use-socket';

const NUM_CANNONS = parseInt(process.env.NEXT_PUBLIC_NUM_CANNONS || '49', 10);
const GRID_COLUMNS = parseInt(process.env.NEXT_PUBLIC_GRID_COLUMNS || '7', 10);
const GRID_ROWS = Math.ceil(NUM_CANNONS / GRID_COLUMNS);
const SIMULATOR_URL = process.env.NEXT_PUBLIC_SIMULATOR_URL || 'ws://localhost:3000';

type Tab = 'paint' | 'scenes' | 'animations' | 'audio';

export default function Home() {
  const { connected, grid, send } = useSocket(SIMULATOR_URL);

  const [tab, setTab] = useState<Tab>('paint');
  const [hue, setHue] = useState(220);
  const [sat, setSat] = useState(90);
  const [bright, setBright] = useState(80);
  const [smoothness, setSmoothness] = useState(50);
  const [attack, setAttack] = useState(80);
  const [masterBright, setMasterBright] = useState(100);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [activeAnim, setActiveAnim] = useState<string | null>(null);

  const handleCannon = useCallback(
    (index: number, h: number, s: number, b: number) => {
      send({ type: 'cannon', index, h, s, b });
    },
    [send]
  );

  const handleScene = useCallback(
    (name: string) => {
      setActiveScene(name);
      setActiveAnim(null);
      send({ type: 'scene', name });
    },
    [send]
  );

  const handleAnim = useCallback(
    (name: string) => {
      setActiveAnim(name);
      send({ type: 'animation', name });
    },
    [send]
  );

  const handleAnimStop = useCallback(() => {
    setActiveAnim(null);
    send({ type: 'animation', name: 'stop' });
  }, [send]);

  const handleSmooth = useCallback(
    (pct: number) => {
      setSmoothness(pct);
      const alpha = Math.pow(10, -2.7 * (pct / 100));
      send({ type: 'smoothness', value: alpha });
    },
    [send]
  );

  const handleAttack = useCallback(
    (pct: number) => {
      setAttack(pct);
      const value = 0.05 + (pct / 100) * 0.95;
      send({ type: 'attack', value });
    },
    [send]
  );

  const handleMasterBright = useCallback(
    (pct: number) => {
      setMasterBright(pct);
      send({ type: 'master_brightness', value: pct / 100 });
    },
    [send]
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'paint', label: 'Paint' },
    { key: 'scenes', label: 'Scenes' },
    { key: 'animations', label: 'Animations' },
    { key: 'audio', label: 'Audio' }
  ];

  return (
    <div className="flex flex-col h-screen bg-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 bg-surface border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-wide text-text-2">Wavegrid</h1>
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-danger'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
        </div>
        <div className="flex items-center gap-4">
          <Slider
            label="Brightness"
            value={masterBright}
            displayValue={`${masterBright}%`}
            onChange={handleMasterBright}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Grid */}
        <div className="flex-1 flex items-center justify-center p-6 min-w-0">
          <GridDisplay
            grid={grid.length > 0 ? grid : Array.from({ length: NUM_CANNONS }, () => ({ h: 220, s: 90, b: 80 }))}
            columns={GRID_COLUMNS}
            currentHue={hue}
            currentSat={sat}
            currentBright={bright}
            onCannon={handleCannon}
          />
        </div>

        {/* Right: Controls */}
        <aside className="w-80 bg-surface border-l border-border overflow-y-auto shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                  tab === t.key
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-text-2 hover:text-text'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-5">
            {/* Envelope controls */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-text-2 uppercase tracking-wider">Envelope</h3>
              <Slider
                label="Smooth"
                value={smoothness}
                displayValue={`${smoothness}%`}
                onChange={handleSmooth}
              />
              <Slider
                label="Attack"
                value={attack}
                displayValue={`${attack}%`}
                onChange={handleAttack}
              />
            </div>

            <div className="h-px bg-border" />

            {/* Tab content */}
            {tab === 'paint' && (
              <div className="space-y-4">
                <h3 className="text-xs font-medium text-text-2 uppercase tracking-wider">Color</h3>
                <ColorPicker
                  hue={hue}
                  saturation={sat}
                  brightness={bright}
                  onHueChange={setHue}
                  onSatChange={setSat}
                  onBrightChange={setBright}
                />
                <p className="text-xs text-text-2/60">
                  Tap or drag on the grid to paint cannons with the selected color.
                </p>
              </div>
            )}

            {tab === 'scenes' && (
              <div className="space-y-4">
                <h3 className="text-xs font-medium text-text-2 uppercase tracking-wider">Scenes</h3>
                <ScenePalette active={activeScene} onSelect={handleScene} />
                <p className="text-xs text-text-2/60">
                  Scenes set all {NUM_CANNONS} cannons to a preset color palette.
                </p>
              </div>
            )}

            {tab === 'animations' && (
              <div className="space-y-4">
                <h3 className="text-xs font-medium text-text-2 uppercase tracking-wider">Animations</h3>
                <AnimationPalette
                  active={activeAnim}
                  onSelect={handleAnim}
                  onStop={handleAnimStop}
                />
                <p className="text-xs text-text-2/60">
                  Animations continuously update the grid. Smooth and attack sliders control how they feel.
                </p>
              </div>
            )}

            {tab === 'audio' && (
              <div className="space-y-4">
                <h3 className="text-xs font-medium text-text-2 uppercase tracking-wider">Audio Reactive</h3>
                <AudioTab
                  numCannons={NUM_CANNONS}
                  gridColumns={GRID_COLUMNS}
                  send={send}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <p className="text-[10px] text-text-2/40 text-center">
              {GRID_COLUMNS}x{GRID_ROWS} Grid &middot; {NUM_CANNONS} cannons
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
