import { createGrid, NUM_CANNONS } from '../src/grid';
import { applyScene, scenes } from '../src/scenes';

describe('scenes', () => {
  it('should have multiple scenes defined', () => {
    expect(Object.keys(scenes).length).toBeGreaterThan(3);
  });

  it('should apply civic scene targets', () => {
    const grid = createGrid();
    applyScene(grid, 'civic');

    for (let i = 0; i < NUM_CANNONS; i++) {
      expect(grid[i].targetH).toBe(220);
      expect(grid[i].targetS).toBe(90);
      expect(grid[i].targetB).toBe(80);
    }
  });

  it('should apply off scene', () => {
    const grid = createGrid();
    applyScene(grid, 'off');

    for (let i = 0; i < NUM_CANNONS; i++) {
      expect(grid[i].targetB).toBe(0);
    }
  });

  it('should apply pride scene with gradient hues', () => {
    const grid = createGrid();
    applyScene(grid, 'pride');

    // First cannon should have low hue, last should have high hue
    expect(grid[0].targetH).toBeLessThan(grid[48].targetH);
  });

  it('should not throw for unknown scene', () => {
    const grid = createGrid();
    expect(() => applyScene(grid, 'nonexistent')).not.toThrow();
  });
});
