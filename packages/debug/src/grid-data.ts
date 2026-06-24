/**
 * Physical grid data for the 7×7 Laser Space Cannon array.
 * Each cell contains its position name, FB4 serial, and default projector index.
 * Green = PC1 (columns 1–3), Blue = PC2 (columns 4–7).
 */

export interface CannonCell {
  /** Position name e.g. "A1" */
  name: string;
  /** Row letter A–G */
  row: string;
  /** Column number 1–7 */
  col: number;
  /** FB4 serial number e.g. "SE 44377" */
  serial: string;
  /** Default projector index in BEYOND e.g. 19 */
  projectorIndex: number;
  /** Which PC controls this cannon: 1 or 2 */
  pc: 1 | 2;
  /** Grid array index (0-based, row-major) */
  gridIndex: number;
}

/**
 * Full 7×7 grid data from the physical installation.
 * Row-major order: A1, A2, A3, A4, A5, A6, A7, B1, B2, ...
 */
export const GRID_DATA: CannonCell[] = [
  // Row A
  { name: 'A1', row: 'A', col: 1, serial: 'SE 44377', projectorIndex: 19, pc: 1, gridIndex: 0 },
  { name: 'A2', row: 'A', col: 2, serial: 'SE 66597', projectorIndex: 20, pc: 1, gridIndex: 1 },
  { name: 'A3', row: 'A', col: 3, serial: 'XE 77236', projectorIndex: 18, pc: 1, gridIndex: 2 },
  { name: 'A4', row: 'A', col: 4, serial: 'XE 46186', projectorIndex: 28, pc: 2, gridIndex: 3 },
  { name: 'A5', row: 'A', col: 5, serial: 'SE 66608', projectorIndex: 27, pc: 2, gridIndex: 4 },
  { name: 'A6', row: 'A', col: 6, serial: 'SE 62164', projectorIndex: 26, pc: 2, gridIndex: 5 },
  { name: 'A7', row: 'A', col: 7, serial: 'SE 66604', projectorIndex: 25, pc: 2, gridIndex: 6 },

  // Row B
  { name: 'B1', row: 'B', col: 1, serial: 'XE 46175', projectorIndex: 17, pc: 1, gridIndex: 7 },
  { name: 'B2', row: 'B', col: 2, serial: 'XE 78226', projectorIndex: 16, pc: 1, gridIndex: 8 },
  { name: 'B3', row: 'B', col: 3, serial: 'XE 77243', projectorIndex: 15, pc: 1, gridIndex: 9 },
  { name: 'B4', row: 'B', col: 4, serial: 'SE 66596', projectorIndex: 24, pc: 2, gridIndex: 10 },
  { name: 'B5', row: 'B', col: 5, serial: 'SE 44385', projectorIndex: 23, pc: 2, gridIndex: 11 },
  { name: 'B6', row: 'B', col: 6, serial: 'SE 62153', projectorIndex: 22, pc: 2, gridIndex: 12 },
  { name: 'B7', row: 'B', col: 7, serial: 'XE 77272', projectorIndex: 21, pc: 2, gridIndex: 13 },

  // Row C
  { name: 'C1', row: 'C', col: 1, serial: 'SE 44379', projectorIndex: 21, pc: 1, gridIndex: 14 },
  { name: 'C2', row: 'C', col: 2, serial: 'XE 77244', projectorIndex: 14, pc: 1, gridIndex: 15 },
  { name: 'C3', row: 'C', col: 3, serial: 'XE 78229', projectorIndex: 13, pc: 1, gridIndex: 16 },
  { name: 'C4', row: 'C', col: 4, serial: 'XE 46177', projectorIndex: 19, pc: 2, gridIndex: 17 },
  { name: 'C5', row: 'C', col: 5, serial: 'XE 46193', projectorIndex: 20, pc: 2, gridIndex: 18 },
  { name: 'C6', row: 'C', col: 6, serial: 'SE 66601', projectorIndex: 18, pc: 2, gridIndex: 19 },
  { name: 'C7', row: 'C', col: 7, serial: 'XE 77240', projectorIndex: 17, pc: 2, gridIndex: 20 },

  // Row D
  { name: 'D1', row: 'D', col: 1, serial: 'XE 78227', projectorIndex: 12, pc: 1, gridIndex: 21 },
  { name: 'D2', row: 'D', col: 2, serial: 'XE 77246', projectorIndex: 11, pc: 1, gridIndex: 22 },
  { name: 'D3', row: 'D', col: 3, serial: 'XE 78222', projectorIndex: 10, pc: 1, gridIndex: 23 },
  { name: 'D4', row: 'D', col: 4, serial: 'XE 46189', projectorIndex: 16, pc: 2, gridIndex: 24 },
  { name: 'D5', row: 'D', col: 5, serial: 'SE 62151', projectorIndex: 15, pc: 2, gridIndex: 25 },
  { name: 'D6', row: 'D', col: 6, serial: 'SE 62161', projectorIndex: 14, pc: 2, gridIndex: 26 },
  { name: 'D7', row: 'D', col: 7, serial: 'SE 62165', projectorIndex: 13, pc: 2, gridIndex: 27 },

  // Row E
  { name: 'E1', row: 'E', col: 1, serial: 'SE 62159', projectorIndex: 9, pc: 1, gridIndex: 28 },
  { name: 'E2', row: 'E', col: 2, serial: 'SE 62160', projectorIndex: 8, pc: 1, gridIndex: 29 },
  { name: 'E3', row: 'E', col: 3, serial: 'XE 46195', projectorIndex: 7, pc: 1, gridIndex: 30 },
  { name: 'E4', row: 'E', col: 4, serial: 'XE 46179', projectorIndex: 12, pc: 2, gridIndex: 31 },
  { name: 'E5', row: 'E', col: 5, serial: 'XE 46196', projectorIndex: 11, pc: 2, gridIndex: 32 },
  { name: 'E6', row: 'E', col: 6, serial: 'XE 46199', projectorIndex: 10, pc: 2, gridIndex: 33 },
  { name: 'E7', row: 'E', col: 7, serial: 'XE 78224', projectorIndex: 9, pc: 2, gridIndex: 34 },

  // Row F
  { name: 'F1', row: 'F', col: 1, serial: 'SE 44380', projectorIndex: 6, pc: 1, gridIndex: 35 },
  { name: 'F2', row: 'F', col: 2, serial: 'XE 46191', projectorIndex: 1, pc: 1, gridIndex: 36 },
  { name: 'F3', row: 'F', col: 3, serial: 'XE 46188', projectorIndex: 2, pc: 1, gridIndex: 37 },
  { name: 'F4', row: 'F', col: 4, serial: 'XE 77245', projectorIndex: 1, pc: 2, gridIndex: 38 },
  { name: 'F5', row: 'F', col: 5, serial: 'SE 66610', projectorIndex: 6, pc: 2, gridIndex: 39 },
  { name: 'F6', row: 'F', col: 6, serial: 'SE 44381', projectorIndex: 8, pc: 2, gridIndex: 40 },
  { name: 'F7', row: 'F', col: 7, serial: 'XE 46172', projectorIndex: 4, pc: 2, gridIndex: 41 },

  // Row G
  { name: 'G1', row: 'G', col: 1, serial: 'SE 66615', projectorIndex: 5, pc: 1, gridIndex: 42 },
  { name: 'G2', row: 'G', col: 2, serial: 'XE 46192', projectorIndex: 3, pc: 1, gridIndex: 43 },
  { name: 'G3', row: 'G', col: 3, serial: 'XE 78223', projectorIndex: 4, pc: 1, gridIndex: 44 },
  { name: 'G4', row: 'G', col: 4, serial: 'SE 16544', projectorIndex: 7, pc: 2, gridIndex: 45 },
  { name: 'G5', row: 'G', col: 5, serial: 'SE 66612', projectorIndex: 5, pc: 2, gridIndex: 46 },
  { name: 'G6', row: 'G', col: 6, serial: 'XE 46187', projectorIndex: 2, pc: 2, gridIndex: 47 },
  { name: 'G7', row: 'G', col: 7, serial: 'XE 46183', projectorIndex: 3, pc: 2, gridIndex: 48 }
];

export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export const COLS = [1, 2, 3, 4, 5, 6, 7] as const;
export const TOTAL_CANNONS = 49;
