/**
 * Core type & constant definitions for the Diamond Rush engine.
 * Pure TS — no React Native imports so the engine stays unit-testable in Node.
 */

// ---------------------------------------------------------------------------
// Tile codes (level matrix encoding). Matches the original game conventions:
//   0 Empty | 1 Wall | 2 Dirt | 3 Boulder | 4 Diamond | 5 Chest | 9 Player
// Extended: 6 Crate | 7 Spider | 8 Exit | 10 Key | 11 Leaves | 12 Snake
// ---------------------------------------------------------------------------
export const T = {
  EMPTY: 0,
  WALL: 1,
  DIRT: 2,
  BOULDER: 3,
  DIAMOND: 4,
  CHEST: 5,
  CRATE: 6,
  SPIDER: 7,
  EXIT: 8,
  PLAYER: 9,
  KEY: 10,
  LEAVES: 11,
  SNAKE: 12,
} as const;

export type TileCode = (typeof T)[keyof typeof T];

// ---------------------------------------------------------------------------
// Dynamic entities (things that move / fall / animate on top of the grid)
// ---------------------------------------------------------------------------
export type EntityKind =
  | 'player'
  | 'boulder'
  | 'diamond'
  | 'crate'
  | 'spider'
  | 'snake';

export interface Entity {
  id: number;
  kind: EntityKind;
  x: number;
  y: number;
  /** move cadence counter (enemies step every N ticks) */
  ticks: number;
  /** patrol direction: -1 | 1 */
  dir: number;
  /** patrol axis */
  axis: 'h' | 'v';
  /** animation frame (walks / leg cycles) */
  frame: number;
  /** fell this tick (used for crush detection) */
  fell: boolean;
  /** moved this tick (used by renderer to tween) */
  moved: boolean;
  /** fell/pushed/moved but rendered w/o smoothing */
  teleport: boolean;
  /** marked for removal at tick end */
  dead: boolean;
  /** spawn damage immunity ticks (player) */
  invuln: number;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
export type GameStatus =
  | 'intro'
  | 'playing'
  | 'paused'
  | 'dying'
  | 'gameover'
  | 'levelclear';

export interface GameState {
  levelIndex: number;
  grid: TileCode[][];
  cols: number;
  rows: number;

  entities: Entity[];
  player: Entity;
  startX: number;
  startY: number;

  status: GameStatus;
  clock: number;
  statusTicks: number; // counter used while paused-transient states (dying)

  // inventory / scoring
  score: number;
  lives: number;
  diamonds: number;
  diamondsTotal: number;
  exitOpen: boolean;
  hasKey: boolean;
  hasHammer: boolean;
  /** "x,y" cells the player carved out to EMPTY (drawn as dark pits). */
  dugCells: Set<string>;

  // input
  heldDir: 'up' | 'down' | 'left' | 'right' | null;
  inputQueue: Dir[];
  playerDelay: number;

  // one-shot UI flags (consumed by the renderer)
  doorUnlockFlash: number;
  hurtFlash: number;
  collectFlash: number;

  // transient sound events, drained on each tick
  events: GameEvent[];
}

export type Dir = 'up' | 'down' | 'left' | 'right';

export type GameEvent =
  | 'key'
  | 'dig'
  | 'push'
  | 'roll'
  | 'pick'
  | 'keygot'
  | 'chest'
  | 'break'
  | 'door'
  | 'death'
  | 'win'
  | 'start'
  | 'thud'
  | 'bump';

// ---------------------------------------------------------------------------
// Tuning knobs (vintage ~20-25 Hz J2ME feel)
// ---------------------------------------------------------------------------
export const TICK_MS = 50;
export const PLAYER_DELAY_TICKS = 3; // player moves every 3rd tick (~6.7 cells/s)
export const ENEMY_DELAY_TICKS = 3;
export const DEATH_TICKS = 24; // ~1.2 s death sting before respawn
export const SPAWN_INVULN_TICKS = 30; // ~1.5 s damage immunity after respawn

export const SCORE = {
  DIRT: 1,
  DIAMOND: 25,
  KEY: 100,
  CHEST: 200,
  ENEMY_CRUSH: 100,
  BOULDER_BREAK: -5,
} as const;

/** Direction vectors */
const DIR_VEC: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function vec(d: Dir): { dx: number; dy: number } {
  return DIR_VEC[d];
}