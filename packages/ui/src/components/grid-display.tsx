'use client';

import { useCallback, useRef, useState } from 'react';

import { hsbToHex } from '@/lib/color';
import type { CannonColor } from '@/lib/use-socket';

interface GridDisplayProps {
  grid: CannonColor[];
  columns: number;
  currentHue: number;
  currentSat: number;
  currentBright: number;
  onCannon: (index: number, h: number, s: number, b: number) => void;
}

export function GridDisplay({
  grid,
  columns,
  currentHue,
  currentSat,
  currentBright,
  onCannon
}: GridDisplayProps) {
  const [painting, setPainting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCellIndex = useCallback(
    (clientX: number, clientY: number): number => {
      if (!containerRef.current) return -1;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cellW = rect.width / columns;
      const rows = Math.ceil(grid.length / columns);
      const cellH = rect.height / rows;
      const col = Math.floor(x / cellW);
      const row = Math.floor(y / cellH);
      if (col < 0 || col >= columns || row < 0 || row >= rows) return -1;
      const idx = row * columns + col;
      return idx < grid.length ? idx : -1;
    },
    [columns, grid.length]
  );

  const paint = useCallback(
    (clientX: number, clientY: number) => {
      const idx = getCellIndex(clientX, clientY);
      if (idx >= 0) {
        onCannon(idx, currentHue, currentSat, currentBright);
      }
    },
    [getCellIndex, onCannon, currentHue, currentSat, currentBright]
  );

  const handleStart = (x: number, y: number) => {
    setPainting(true);
    paint(x, y);
  };

  const handleMove = (x: number, y: number) => {
    if (painting) paint(x, y);
  };

  const rows = Math.ceil(grid.length / columns);

  return (
    <div
      ref={containerRef}
      className="grid gap-1 w-full max-w-lg aspect-square select-none touch-none"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={() => setPainting(false)}
      onMouseLeave={() => setPainting(false)}
      onTouchStart={(e) => {
        const t = e.touches[0];
        handleStart(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        handleMove(t.clientX, t.clientY);
      }}
      onTouchEnd={() => setPainting(false)}
    >
      {grid.map((c, i) => {
        const hex = c.b < 1 ? '#111' : hsbToHex(c.h, c.s, Math.max(5, c.b * 0.5));
        return (
          <div
            key={i}
            className="rounded-lg border border-border/50 transition-colors duration-75"
            style={{
              background: hex,
              boxShadow: c.b > 20 ? `0 0 ${c.b * 0.15}px ${hex}` : 'none'
            }}
          />
        );
      })}
    </div>
  );
}
