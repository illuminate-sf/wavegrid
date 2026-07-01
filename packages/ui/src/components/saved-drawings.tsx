'use client';

import { useCallback, useRef, useState } from 'react';

import type { SavedDrawing } from '@/lib/use-socket';

import { ControlGroup } from './control-grid';

function hsbToRgb(h: number, s: number, b: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  b = Math.max(0, Math.min(100, b)) / 100;
  const c = b * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = b - c;
  let r = 0, g = 0, bl = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; bl = x; }
  else if (h < 240) { g = x; bl = c; }
  else if (h < 300) { r = x; bl = c; }
  else { r = c; bl = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((bl + m) * 255)
  ];
}

function DrawingThumbnail({ drawing, cols, size = 56 }: { drawing: SavedDrawing; cols: number; size?: number }) {
  const rows = Math.ceil(drawing.grid.length / cols);
  const dotSize = Math.max(2, Math.floor(size / Math.max(cols, rows)) - 1);
  const gap = 1;
  const w = cols * (dotSize + gap) - gap;
  const h = rows * (dotSize + gap) - gap;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {drawing.grid.map((cell, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const [r, g, b] = hsbToRgb(cell.h, cell.s, cell.b);
        return (
          <rect
            key={i}
            x={col * (dotSize + gap)}
            y={row * (dotSize + gap)}
            width={dotSize}
            height={dotSize}
            rx={dotSize > 4 ? 1 : 0}
            fill={`rgb(${r},${g},${b})`}
          />
        );
      })}
    </svg>
  );
}

interface SavedDrawingsProps {
  drawings: SavedDrawing[];
  gridColumns: number;
  send: (msg: Record<string, unknown>) => void;
}

export function SavedDrawings({ drawings, gridColumns, send }: SavedDrawingsProps) {
  const [saveName, setSaveName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    send({ type: 'save_drawing', name: saveName.trim() || undefined });
    setSaveName('');
    setShowInput(false);
  }, [send, saveName]);

  const handleLoad = useCallback((id: string) => {
    send({ type: 'load_drawing', id });
  }, [send]);

  const handleDelete = useCallback((id: string) => {
    send({ type: 'delete_drawing', id });
  }, [send]);

  return (
    <ControlGroup label="Saved Drawings">
      <div className="flex flex-col gap-2">
        {/* Save button / input */}
        <div className="flex gap-2 items-center">
          {showInput ? (
            <>
              <input
                ref={inputRef}
                type="text"
                placeholder="Drawing name..."
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowInput(false); }}
                autoFocus
                className="text-xs font-mono"
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 8,
                  background: '#0a0a10',
                  border: '1px solid #1a1a25',
                  color: '#c8c8d8',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSave}
                style={{
                  padding: '5px 12px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 600,
                  background: '#1a2a3a',
                  border: '1px solid #2a4a5a',
                  color: '#6ac4f0',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
              <button
                onClick={() => setShowInput(false)}
                style={{
                  padding: '5px 8px',
                  borderRadius: 10,
                  fontSize: 11,
                  background: 'transparent',
                  border: '1px solid #1a1a25',
                  color: '#666',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => { setShowInput(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              style={{
                padding: '6px 14px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                background: '#1a1a2e',
                border: '1px solid #333',
                color: '#aaa',
                cursor: 'pointer'
              }}
            >
              + Save Current Drawing
            </button>
          )}
        </div>

        {/* Drawing tiles */}
        {drawings.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {drawings.map((d) => (
              <div
                key={d.id}
                className="flex flex-col items-center gap-1"
                style={{
                  padding: 6,
                  borderRadius: 10,
                  background: '#0e0e18',
                  border: '1px solid #1a1a25',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div onClick={() => handleLoad(d.id)}>
                  <DrawingThumbnail drawing={d} cols={gridColumns} />
                </div>
                <span
                  style={{
                    fontSize: 9,
                    color: '#888',
                    maxWidth: 60,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center'
                  }}
                >
                  {d.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                  title="Delete"
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: 'rgba(255,50,50,0.15)',
                    border: 'none',
                    color: '#f87171',
                    fontSize: 9,
                    lineHeight: '14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    opacity: 0.5
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.5'; }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {drawings.length === 0 && (
          <p style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>
            No saved drawings yet. Paint something and save it!
          </p>
        )}
      </div>
    </ControlGroup>
  );
}
