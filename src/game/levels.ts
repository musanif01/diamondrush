import { T, TileCode } from './types';

/**
 * Stage 1 — "Bavaria Ruins"
 * 14 columns x 16 rows. Encoded with the shared tile legend:
 *   0 empty | 1 wall | 2 dirt | 3 boulder | 4 diamond | 5 chest
 *   6 crate | 7 spider | 8 exit door | 10 rusty key | 11 leaves | 12 snake
 * Code 9 (player start) is expanded at parse time.
 */
export interface LevelDef {
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  rowsData: number[][];
  requiredDiamonds: number; // claim X diamonds to open the exit
  seed: number;
}

const L1: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 9, 2, 2, 0, 2, 2, 4, 2, 2, 2, 2, 2, 1],
  [1, 0, 2, 2, 4, 3, 3, 2, 2, 2, 4, 2, 2, 1],
  [1, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 0, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 1],
  [1, 2, 2, 2, 4, 2, 2, 2, 3, 2, 2, 2, 4, 1],
  [1, 2, 3, 2, 7, 0, 0, 0, 0, 0, 2, 2, 2, 1],
  [1, 2, 6, 2, 2, 2, 2, 2, 2, 2, 4, 2, 2, 1],
  [1, 2, 2, 2, 0, 2, 3, 2, 2, 2, 2, 2, 2, 1],
  [1, 0, 2, 2, 2, 0, 2, 2, 2, 3, 2, 2, 4, 1],
  [1, 2, 10, 2, 2, 12, 2, 2, 2, 2, 2, 2, 6, 1],
  [1, 2, 2, 3, 2, 0, 2, 5, 2, 2, 3, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 4, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 1, 1, 1, 2, 2, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 1, 1, 8, 1, 1, 1, 1, 1, 1, 1],
];

const L1_DEF: LevelDef = {
  name: 'BAVARIA RUINS',
  subtitle: 'STAGE 1',
  cols: 14,
  rows: 16,
  rowsData: L1,
  requiredDiamonds: 8,
  seed: 19960409,
};

export const LEVELS: LevelDef[] = [L1_DEF];

/** Map a raw code to a static grid tile. Dynamic objects return EMPTY. */
const GRID_MAP: Record<number, TileCode> = {
  [T.EMPTY]: T.EMPTY,
  [T.WALL]: T.WALL,
  [T.DIRT]: T.DIRT,
  [T.CHEST]: T.CHEST,
  [T.EXIT]: T.EXIT,
  [T.KEY]: T.KEY,
  [T.LEAVES]: T.LEAVES,
  // everything else prepared for entity expansion
  [T.BOULDER]: T.EMPTY,
  [T.DIAMOND]: T.EMPTY,
  [T.CRATE]: T.EMPTY,
  [T.SPIDER]: T.EMPTY,
  [T.SNAKE]: T.EMPTY,
  [T.PLAYER]: T.EMPTY,
};

export function checkLevelIntegrity(def: LevelDef): void {
  if (def.rows !== def.rowsData.length) {
    throw new Error(`${def.name}: rows mismatch`);
  }
  for (const row of def.rowsData) {
    if (row.length !== def.cols) {
      throw new Error(`${def.name}: column mismatch`);
    }
  }
}

export function countTiles(def: LevelDef): Map<number, number> {
  const counts = new Map<number, number>();
  for (const row of def.rowsData) {
    for (const cell of row) {
      counts.set(cell, (counts.get(cell) ?? 0) + 1);
    }
  }
  return counts;
}

/** Static map tile for a raw code (EMPTY for dynamic objects). */
export function staticTile(raw: number): TileCode {
  return GRID_MAP[raw] ?? T.EMPTY;
}