import { T, TileCode } from './types';
import { REAL_STAGES, RealStage } from './pix/real_worlds';

/**
 * Playable level definition. `rowsData` uses the shared tile legend:
 *   1 wall | 2 dirt | 3 boulder | 4 diamond | 5 chest
 *   6 crate | 7 spider | 8 exit door | 9 player start
 * Code 9 (player start) is expanded at parse time.
 *
 * Real stages come from the original ROM dumps; their raw tile code 0 is
 * diggable dirt (T.DIRT), not empty air — boulders rest on it and the player
 * carves tunnels by walking. Hand-made levels may still use code 0 for air.
 */
export interface LevelDef {
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  rowsData: number[][];
  requiredDiamonds: number; // claim X diamonds to open the exit
  seed: number;
  /** source world id ("angkor" | "bavaria" | "siberia") */
  world?: string;
  /** 1-based stage number within its world */
  stageNo?: number;
  /** backdrop key into src/game/backdrops.ts (rendered 24px/tile) */
  backdrop?: string;
  /** authentic level label for the title card (e.g. "STAGE 1") */
  stageLabel?: string;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Minimal pure-TS base64 decoder (no Buffer/atob dependency for RN). */
function decodeBase64(input: string): Uint8Array {
  const chars = input.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of chars) {
    if (ch === '=') break;
    buffer = (buffer << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

/** Row-major rebuild of a real stage's terrain. Raw code 0 -> diggable dirt. */
function decodeStage(stage: RealStage): number[][] {
  const raw = decodeBase64(stage.b64);
  const rows: number[][] = [];
  for (let y = 0; y < stage.h; y++) {
    const r: number[] = [];
    for (let x = 0; x < stage.w; x++) {
      const c = raw[y * stage.w + x] ?? 0;
      r.push(c === 0 ? T.DIRT : c);
    }
    rows.push(r);
  }
  return rows;
}

const WORLD_NAME: Record<string, string> = {
  angkor: 'ANGKOR WAT',
  bavaria: 'BAVARIA',
  siberia: 'SIBERIA',
};

const REAL_LEVELS: LevelDef[] = REAL_STAGES.map((s, i) => ({
  name: WORLD_NAME[s.world] ?? s.world.toUpperCase(),
  subtitle: `STAGE ${s.stage}`,
  cols: s.w,
  rows: s.h,
  rowsData: decodeStage(s),
  requiredDiamonds: s.diamondsTotal,
  seed: 19960409 + i,
  world: s.world,
  stageNo: s.stage,
  backdrop: `${s.world}-${s.stage}`,
  stageLabel: `STAGE ${s.stage}`,
}));

/** Full campaign: 41 authentic stages in original order (angkor -> bavaria -> siberia). */
export const LEVELS: LevelDef[] = REAL_LEVELS;

/** Static grid tiles (walls & fixtures). Dynamic objects return EMPTY. */
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