'use client';

import { useCallback } from 'react';

import { ControlGrid, ControlGroup } from './control-grid';

// ── Pattern source code (sent as strings via evalPattern) ──────────────

const PRIDE_COLORS_CODE = `
var COLORS = [
  [0, 100, 90],
  [30, 100, 90],
  [55, 100, 90],
  [120, 100, 80],
  [210, 100, 80],
  [290, 100, 80]
];
`;

const TRANS_COLORS_CODE = `
var COLORS = [
  [197, 63, 98],
  [346, 31, 96],
  [0, 0, 100],
  [346, 31, 96],
  [197, 63, 98]
];
`;

function lerpColorCode(): string {
  return `
function lerpColor(a, b, t) {
  var dh = b[0] - a[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return [
    ((a[0] + dh * t) % 360 + 360) % 360,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}
function colorAt(pos) {
  var p = ((pos % 1) + 1) % 1;
  var scaled = p * COLORS.length;
  var idx = Math.floor(scaled);
  var mix = scaled - idx;
  var a = COLORS[idx % COLORS.length];
  var b = COLORS[(idx + 1) % COLORS.length];
  return lerpColor(a, b, mix);
}
`;
}

interface PatternDef {
  name: string;
  gradient: string;
  code: string;
}

function makeFlowPattern(colorsCode: string): string {
  return `({\n${colorsCode}\n${lerpColorCode()}\nrender: function(ctx) {\n  var speed = ctx.t * 0.012;\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var c = colorAt(uv[1] + speed);\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'flow' }\n})`;
}

function makeBreathePattern(colorsCode: string): string {
  return `({\n${colorsCode}\n${lerpColorCode()}\nrender: function(ctx) {\n  var speed = ctx.t * 0.008;\n  var brightness = 70 + Math.sin(ctx.t * 0.6) * 20;\n  var c = colorAt(speed);\n  for (var i = 0; i < ctx.count; i++) {\n    ctx.set(i, c[0], c[1], brightness);\n  }\n},\nmeta: { name: 'breathe' }\n})`;
}

function makeRotatePattern(colorsCode: string): string {
  return `({\n${colorsCode}\n${lerpColorCode()}\nrender: function(ctx) {\n  var offset = ctx.t * 0.5;\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var c = colorAt(uv[0] + offset);\n    ctx.set(i, c[0], c[1], 90);\n  }\n},\nmeta: { name: 'rotate' }\n})`;
}

function makeRingPattern(colorsCode: string): string {
  return `({\n${colorsCode}\n${lerpColorCode()}\nrender: function(ctx) {\n  var speed = ctx.t * 0.012;\n  for (var i = 0; i < ctx.count; i++) {\n    var c = colorAt(i / ctx.count + speed);\n    ctx.set(i, c[0], c[1], 90);\n  }\n},\nmeta: { name: 'ring' }\n})`;
}

function makeWavePattern(colorsCode: string): string {
  return `({\n${colorsCode}\n${lerpColorCode()}\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var phase = Math.sin(uv[0] * Math.PI * 2 - ctx.t * 2);\n    var c = colorAt(uv[1] + ctx.t * 0.02);\n    var b = Math.max(5, c[2] * (0.5 + 0.5 * phase));\n    ctx.set(i, c[0], c[1], b);\n  }\n},\nmeta: { name: 'wave' }\n})`;
}

function makeStripesPattern(colorsCode: string): string {
  return `({\n${colorsCode}\nrender: function(ctx) {\n  var rows = ctx.rows;\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var bandIdx = Math.floor(uv[1] * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'stripes' }\n})`;
}

const PRIDE_STATIC: PatternDef[] = [
  {
    name: 'Rainbow',
    gradient: 'linear-gradient(180deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)',
    code: `({\n${PRIDE_COLORS_CODE}\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var bandIdx = Math.floor(uv[1] * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'pride-rainbow' }\n})`
  },
  {
    name: 'Columns',
    gradient: 'linear-gradient(90deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)',
    code: `({\n${PRIDE_COLORS_CODE}\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var bandIdx = Math.floor(uv[0] * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'pride-columns' }\n})`
  },
  {
    name: 'Diagonal',
    gradient: 'linear-gradient(135deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)',
    code: `({\n${PRIDE_COLORS_CODE}\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var d = (uv[0] + uv[1]) / 2;\n    var bandIdx = Math.floor(d * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'pride-diagonal' }\n})`
  },
  {
    name: 'Solid Red',
    gradient: 'linear-gradient(135deg, #e40303, #cc0000)',
    code: `({ render: function(ctx) { ctx.fill(0, 100, 90); }, meta: { name: 'pride-red' } })`
  },
  {
    name: 'Solid Gold',
    gradient: 'linear-gradient(135deg, #ffed00, #ccb800)',
    code: `({ render: function(ctx) { ctx.fill(55, 100, 90); }, meta: { name: 'pride-gold' } })`
  },
  {
    name: 'Solid Purple',
    gradient: 'linear-gradient(135deg, #750787, #5a0566)',
    code: `({ render: function(ctx) { ctx.fill(290, 100, 80); }, meta: { name: 'pride-purple' } })`
  }
];

const PRIDE_PATTERNS: PatternDef[] = [
  {
    name: 'Flow',
    gradient: 'linear-gradient(180deg, #e40303 0%, #ff8c00 20%, #ffed00 40%, #008026 60%, #004dff 80%, #750787 100%)',
    code: makeFlowPattern(PRIDE_COLORS_CODE)
  },
  {
    name: 'Breathe',
    gradient: 'radial-gradient(circle, #ff8c00, #e40303, #750787)',
    code: makeBreathePattern(PRIDE_COLORS_CODE)
  },
  {
    name: 'Rotate',
    gradient: 'linear-gradient(90deg, #e40303, #ffed00, #008026, #004dff, #750787, #e40303)',
    code: makeRotatePattern(PRIDE_COLORS_CODE)
  },
  {
    name: 'Ring',
    gradient: 'conic-gradient(#e40303, #ff8c00, #ffed00, #008026, #004dff, #750787, #e40303)',
    code: makeRingPattern(PRIDE_COLORS_CODE)
  },
  {
    name: 'Wave',
    gradient: 'linear-gradient(135deg, #e40303 0%, #008026 50%, #750787 100%)',
    code: makeWavePattern(PRIDE_COLORS_CODE)
  }
];

const TRANS_STATIC: PatternDef[] = [
  {
    name: 'Flag',
    gradient: 'linear-gradient(180deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: `({\n${TRANS_COLORS_CODE}\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var bandIdx = Math.floor(uv[1] * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'trans-flag' }\n})`
  },
  {
    name: 'Columns',
    gradient: 'linear-gradient(90deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: `({\n${TRANS_COLORS_CODE}\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var bandIdx = Math.floor(uv[0] * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'trans-columns' }\n})`
  },
  {
    name: 'Solid Blue',
    gradient: 'linear-gradient(135deg, #5BCEFA, #3aa8d8)',
    code: `({ render: function(ctx) { ctx.fill(197, 63, 98); }, meta: { name: 'trans-blue' } })`
  },
  {
    name: 'Solid Pink',
    gradient: 'linear-gradient(135deg, #F5A9B8, #d88a9a)',
    code: `({ render: function(ctx) { ctx.fill(346, 31, 96); }, meta: { name: 'trans-pink' } })`
  }
];

const TRANS_PATTERNS: PatternDef[] = [
  {
    name: 'Stripes',
    gradient: 'linear-gradient(180deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: makeStripesPattern(TRANS_COLORS_CODE)
  },
  {
    name: 'Flow',
    gradient: 'linear-gradient(180deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: makeFlowPattern(TRANS_COLORS_CODE)
  },
  {
    name: 'Breathe',
    gradient: 'radial-gradient(circle, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: makeBreathePattern(TRANS_COLORS_CODE)
  },
  {
    name: 'Rotate',
    gradient: 'linear-gradient(90deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: makeRotatePattern(TRANS_COLORS_CODE)
  },
  {
    name: 'Ring',
    gradient: 'conic-gradient(#5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: makeRingPattern(TRANS_COLORS_CODE)
  },
  {
    name: 'Wave',
    gradient: 'linear-gradient(135deg, #5BCEFA, #FFFFFF, #F5A9B8)',
    code: makeWavePattern(TRANS_COLORS_CODE)
  }
];

function PatternTile({
  pattern,
  active,
  onClick
}: {
  pattern: PatternDef;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden transition-transform active:scale-93"
      style={{
        width: 72,
        height: 72,
        borderRadius: 16,
        background: pattern.gradient,
        border: active ? '2.5px solid #fff' : '2.5px solid transparent'
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
        {pattern.name}
      </span>
    </button>
  );
}

export function PrideTab({
  send,
  activePattern,
  onPatternSelect
}: {
  send: (msg: Record<string, unknown>) => void;
  activePattern: string | null;
  onPatternSelect: (id: string) => void;
}) {
  const handleSelect = useCallback((groupPrefix: string, pattern: PatternDef) => {
    const id = `${groupPrefix}-${pattern.name}`;
    onPatternSelect(id);
    send({ type: 'evalPattern', code: pattern.code, params: {} });
  }, [send, onPatternSelect]);

  return (
    <ControlGrid minCellWidth={200}>
      <ControlGroup label="Pride — Static">
        <div className="flex gap-2.5 flex-wrap">
          {PRIDE_STATIC.map((p) => (
            <PatternTile
              key={`pride-s-${p.name}`}
              pattern={p}
              active={activePattern === `pride-s-${p.name}`}
              onClick={() => handleSelect('pride-s', p)}
            />
          ))}
        </div>
      </ControlGroup>

      <ControlGroup label="Pride — Animated">
        <div className="flex gap-2.5 flex-wrap">
          {PRIDE_PATTERNS.map((p) => (
            <PatternTile
              key={`pride-${p.name}`}
              pattern={p}
              active={activePattern === `pride-${p.name}`}
              onClick={() => handleSelect('pride', p)}
            />
          ))}
        </div>
      </ControlGroup>

      <ControlGroup label="Trans — Static">
        <div className="flex gap-2.5 flex-wrap">
          {TRANS_STATIC.map((p) => (
            <PatternTile
              key={`trans-s-${p.name}`}
              pattern={p}
              active={activePattern === `trans-s-${p.name}`}
              onClick={() => handleSelect('trans-s', p)}
            />
          ))}
        </div>
      </ControlGroup>

      <ControlGroup label="Trans — Animated">
        <div className="flex gap-2.5 flex-wrap">
          {TRANS_PATTERNS.map((p) => (
            <PatternTile
              key={`trans-${p.name}`}
              pattern={p}
              active={activePattern === `trans-${p.name}`}
              onClick={() => handleSelect('trans', p)}
            />
          ))}
        </div>
      </ControlGroup>
    </ControlGrid>
  );
}
