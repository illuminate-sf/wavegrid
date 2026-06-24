import { GRID_DATA, ROWS, COLS, TOTAL_CANNONS } from '../src/grid-data';

describe('grid-data', () => {
  it('has exactly 49 cannons', () => {
    expect(GRID_DATA).toHaveLength(TOTAL_CANNONS);
    expect(TOTAL_CANNONS).toBe(49);
  });

  it('has 7 rows and 7 columns', () => {
    expect(ROWS).toHaveLength(7);
    expect(COLS).toHaveLength(7);
  });

  it('each cell has required fields', () => {
    for (const cell of GRID_DATA) {
      expect(cell.name).toMatch(/^[A-G][1-7]$/);
      expect(cell.row).toMatch(/^[A-G]$/);
      expect(cell.col).toBeGreaterThanOrEqual(1);
      expect(cell.col).toBeLessThanOrEqual(7);
      expect(cell.serial).toMatch(/^(SE|XE) \d+$/);
      expect(cell.projectorIndex).toBeGreaterThanOrEqual(0);
      expect(cell.pc).toBeGreaterThanOrEqual(1);
      expect(cell.pc).toBeLessThanOrEqual(2);
      expect(cell.gridIndex).toBeGreaterThanOrEqual(0);
      expect(cell.gridIndex).toBeLessThan(49);
    }
  });

  it('grid indices are sequential 0–48', () => {
    const indices = GRID_DATA.map(c => c.gridIndex);
    expect(indices).toEqual(Array.from({ length: 49 }, (_, i) => i));
  });

  it('columns 1–3 are PC1, columns 4–7 are PC2', () => {
    for (const cell of GRID_DATA) {
      if (cell.col <= 3) expect(cell.pc).toBe(1);
      else expect(cell.pc).toBe(2);
    }
  });

  it('names match row + col', () => {
    for (const cell of GRID_DATA) {
      expect(cell.name).toBe(`${cell.row}${cell.col}`);
    }
  });
});
