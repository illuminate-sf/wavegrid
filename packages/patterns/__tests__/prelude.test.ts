import { generatePrelude } from '../src/prelude';

describe('generatePrelude', () => {
  it('generates prelude with correct grid dimensions', () => {
    const prelude = generatePrelude({ cols: 7, rows: 7, count: 49 });
    expect(prelude).toContain('var COLS=7, ROWS=7, COUNT=COLS*ROWS;');
    expect(prelude).toContain('function buildCtx');
    expect(prelude).toContain('function __runRender');
    expect(prelude).toContain('function __fbJSON');
  });

  it('supports custom grid dimensions', () => {
    const prelude = generatePrelude({ cols: 10, rows: 5, count: 50 });
    expect(prelude).toContain('var COLS=10, ROWS=5, COUNT=COLS*ROWS;');
  });

  it('includes all ctx API methods', () => {
    const prelude = generatePrelude({ cols: 7, rows: 7, count: 49 });
    const apiMethods = [
      'setRGB', 'setHSV', 'setXY', 'fill', 'clear', 'fade',
      'getRGB', 'getHSV', 'xy:', 'uv:', 'polar:', 'index:',
      'noise:', 'lerp:', 'smoothstep:', 'rand:', 'randInt:',
      'hsv:', 'rgb2hsv:', 'clamp:', 'fract:',
    ];
    for (const method of apiMethods) {
      expect(prelude).toContain(method);
    }
  });

  it('includes ease functions', () => {
    const prelude = generatePrelude({ cols: 7, rows: 7, count: 49 });
    expect(prelude).toContain('ease:{');
    expect(prelude).toContain('inSine');
    expect(prelude).toContain('outQuad');
    expect(prelude).toContain('inOutSine');
  });
});
