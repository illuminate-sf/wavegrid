'use client';

import { useCallback } from 'react';

import type { PlaylistState } from '@/lib/use-socket';

import { ControlGrid, ControlGroup } from './control-grid';

interface PlaylistStep {
  type: 'animation' | 'scene' | 'evalPattern';
  name?: string;
  code?: string;
  duration: number;
}

interface SequenceDef {
  name: string;
  description: string;
  gradient: string;
  steps: PlaylistStep[];
  transition: 'cut' | 'fade';
  transitionDuration: number;
}

// ── Preset Sequences ──────────────────────────────────────────────────

const SEQUENCES: SequenceDef[] = [
  {
    name: 'Pride Show',
    description: 'Static flags + flowing animations — alternating calm and motion',
    gradient: 'linear-gradient(135deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)',
    transition: 'fade',
    transitionDuration: 2,
    steps: [
      { type: 'scene', name: 'pride', duration: 120 },
      { type: 'animation', name: 'pride-flow', duration: 180 },
      { type: 'animation', name: 'rainbow', duration: 120 },
      { type: 'animation', name: 'pride-ring', duration: 120 },
      { type: 'scene', name: 'pride', duration: 90 },
      { type: 'animation', name: 'pride-breathe', duration: 120 },
      { type: 'animation', name: 'pride-rotate', duration: 120 },
      { type: 'scene', name: 'pride', duration: 90 },
      { type: 'animation', name: 'rainbow', duration: 180 }
    ]
  },
  {
    name: 'Heart Night',
    description: 'Romantic vibes — hearts, breathing, and city love',
    gradient: 'linear-gradient(135deg, #ff0040, #cc0030, #ff6080)',
    transition: 'fade',
    transitionDuration: 3,
    steps: [
      { type: 'scene', name: 'heart', duration: 180 },
      { type: 'animation', name: 'heart-breathe', duration: 300 },
      { type: 'animation', name: 'i-heart-sf', duration: 180 },
      { type: 'animation', name: 'heart-breathe', duration: 300 },
      { type: 'scene', name: 'heart', duration: 120 }
    ]
  },
  {
    name: 'SF Showcase',
    description: 'City pride — SF scenes, hearts, and rainbows',
    gradient: 'linear-gradient(135deg, #c8a000, #ff6060, #4060ff)',
    transition: 'fade',
    transitionDuration: 3,
    steps: [
      { type: 'scene', name: 'sf', duration: 180 },
      { type: 'animation', name: 'i-heart-sf', duration: 240 },
      { type: 'animation', name: 'rainbow', duration: 120 },
      { type: 'scene', name: 'gold', duration: 120 },
      { type: 'animation', name: 'wave', duration: 180 },
      { type: 'scene', name: 'sf', duration: 120 }
    ]
  },
  {
    name: 'Ambient',
    description: 'Chill background — slow waves, breathing, rain',
    gradient: 'linear-gradient(135deg, #1a3a5c, #2a5a3c, #3a2a5c)',
    transition: 'fade',
    transitionDuration: 4,
    steps: [
      { type: 'animation', name: 'wave', duration: 300 },
      { type: 'animation', name: 'breathe', duration: 240 },
      { type: 'animation', name: 'rain', duration: 300 },
      { type: 'animation', name: 'spiral', duration: 240 },
      { type: 'animation', name: 'wave', duration: 300 }
    ]
  },
  {
    name: 'High Energy',
    description: 'Fast cuts — short bursts of variety',
    gradient: 'linear-gradient(135deg, #ff4400, #ffcc00, #00ff88, #0088ff)',
    transition: 'cut',
    transitionDuration: 0,
    steps: [
      { type: 'animation', name: 'pride-ring', duration: 60 },
      { type: 'animation', name: 'rainbow', duration: 45 },
      { type: 'animation', name: 'heart-breathe', duration: 60 },
      { type: 'animation', name: 'pride-rotate', duration: 60 },
      { type: 'animation', name: 'spiral', duration: 60 },
      { type: 'animation', name: 'wave', duration: 45 },
      { type: 'animation', name: 'pride-flow', duration: 60 },
      { type: 'animation', name: 'pacman', duration: 45 }
    ]
  }
];

// ── Helpers ───────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m${s > 0 ? ' ' + s + 's' : ''}` : `${s}s`;
}

function totalDuration(steps: PlaylistStep[]): number {
  return steps.reduce((a, s) => a + s.duration, 0);
}

function stepLabel(step: PlaylistStep): string {
  if (step.type === 'evalPattern') return 'Custom Pattern';
  return step.name ?? 'Unknown';
}

// ── Component ─────────────────────────────────────────────────────────

export function SequencesTab({
  send,
  playlistState
}: {
  send: (msg: Record<string, unknown>) => void;
  playlistState: PlaylistState | null;
}) {
  const activeSequenceName = playlistState?.active && playlistState.playlist
    ? findActiveSequenceName(playlistState.playlist.steps)
    : null;

  const handlePlay = useCallback((seq: SequenceDef) => {
    send({
      type: 'playlist',
      steps: seq.steps,
      loop: true,
      transition: seq.transition,
      transitionDuration: seq.transitionDuration
    });
  }, [send]);

  const handleStop = useCallback(() => {
    send({ type: 'playlist_stop' });
  }, [send]);

  const handleSkip = useCallback((direction: 'next' | 'back') => {
    send({ type: 'playlist_skip', direction });
  }, [send]);

  return (
    <ControlGrid minCellWidth={280}>
      {/* Transport controls — only show when a sequence is active */}
      {playlistState?.active && (
        <ControlGroup label="Now Playing">
          <div style={{ padding: '8px 0' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
              <button
                onClick={() => handleSkip('back')}
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#1a1a25', border: '1px solid #2a2a35',
                  color: '#fff', fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ⏮
              </button>
              <button
                onClick={handleStop}
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#3a1515', border: '1px solid #5a2525',
                  color: '#ff6666', fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ⏹
              </button>
              <button
                onClick={() => handleSkip('next')}
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#1a1a25', border: '1px solid #2a2a35',
                  color: '#fff', fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ⏭
              </button>
              <div style={{ marginLeft: 8 }}>
                <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600 }}>
                  {activeSequenceName ?? 'Sequence'}
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  Step {(playlistState.currentStep ?? 0) + 1} of {playlistState.playlist?.steps.length ?? '?'}
                  {playlistState.playlist?.steps[playlistState.currentStep] && (
                    <> &middot; {stepLabel(playlistState.playlist.steps[playlistState.currentStep] as PlaylistStep)}</>
                  )}
                </div>
              </div>
            </div>

            {/* Step list with current highlighted */}
            <div style={{ maxHeight: 160, overflowY: 'auto', borderRadius: 8, background: '#0a0a10', padding: 6 }}>
              {playlistState.playlist?.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2"
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    background: idx === playlistState.currentStep ? '#1a2a3a' : 'transparent',
                    color: idx === playlistState.currentStep ? '#8cf' : '#777'
                  }}
                >
                  <span style={{ minWidth: 16 }}>{idx + 1}.</span>
                  <span style={{ flex: 1 }}>{stepLabel(step as PlaylistStep)}</span>
                  <span style={{ color: '#555' }}>{formatDuration(step.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        </ControlGroup>
      )}

      {/* Sequence presets */}
      <ControlGroup label="Sequences">
        <div className="flex flex-col gap-2.5">
          {SEQUENCES.map((seq) => (
            <SequenceCard
              key={seq.name}
              sequence={seq}
              active={activeSequenceName === seq.name}
              onPlay={() => handlePlay(seq)}
            />
          ))}
        </div>
      </ControlGroup>
    </ControlGrid>
  );
}

function SequenceCard({
  sequence,
  active,
  onPlay
}: {
  sequence: SequenceDef;
  active: boolean;
  onPlay: () => void;
}) {
  const total = totalDuration(sequence.steps);
  const mins = Math.round(total / 60);

  return (
    <button
      onClick={onPlay}
      className="text-left transition-transform active:scale-97"
      style={{
        padding: '12px 14px',
        borderRadius: 14,
        background: active
          ? 'linear-gradient(135deg, #1a2a3a, #0a1a2a)'
          : '#0a0a10',
        border: active ? '2px solid #4488cc' : '1.5px solid #1a1a25',
        cursor: 'pointer',
        width: '100%'
      }}
    >
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: sequence.gradient,
            flexShrink: 0
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#eee', fontWeight: 600 }}>
            {sequence.name}
          </div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
            {sequence.description}
          </div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
            {sequence.steps.length} steps &middot; ~{mins} min loop &middot; {sequence.transition}
          </div>
        </div>
        {active && (
          <div style={{ fontSize: 10, color: '#4488cc', fontWeight: 600 }}>
            PLAYING
          </div>
        )}
      </div>
    </button>
  );
}

/** Try to match active playlist steps to a known sequence name. */
function findActiveSequenceName(steps: Array<{ type: string; name?: string; duration: number }>): string | null {
  for (const seq of SEQUENCES) {
    if (seq.steps.length !== steps.length) continue;
    const match = seq.steps.every((s, i) =>
      s.type === steps[i].type && s.name === steps[i].name && s.duration === steps[i].duration
    );
    if (match) return seq.name;
  }
  return null;
}
