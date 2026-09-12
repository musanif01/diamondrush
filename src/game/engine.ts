import {
  Dir,
  Entity,
  EntityKind,
  GameEvent,
  GameState,
  SCORE,
  T,
  TileCode,
  DEATH_TICKS,
  ENEMY_DELAY_TICKS,
  PLAYER_DELAY_TICKS,
  SPAWN_INVULN_TICKS,
  vec,
} from './types';
import { LevelDef, LEVELS, checkLevelIntegrity, staticTile } from './levels';

let nextId = 1;
const newId = (): number => nextId++;

// ---------------------------------------------------------------------------
// Grid helpers (pure)
// ---------------------------------------------------------------------------
function inBounds(g: GameState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < g.cols && y < g.rows;
}

export function tileAt(g: GameState, x: number, y: number): TileCode {
  if (!inBounds(g, x, y)) return T.WALL;
  return g.grid[y]?.[x] ?? T.WALL;
}

export function entityAt(g: GameState, x: number, y: number): Entity | undefined {
  for (const e of g.entities) {
    if (!e.dead && e.x === x && e.y === y) return e;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Level construction
// ---------------------------------------------------------------------------
function buildEntity(
  kind: EntityKind,
  x: number,
  y: number,
  opts?: Partial<Entity>,
): Entity {
  return {
    id: newId(),
    kind,
    x,
    y,
    ticks: 0,
    dir: 1,
    axis: kind === 'snake' ? 'v' : 'h',
    frame: 0,
    fell: false,
    moved: false,
    dead: false,
    invuln: 0,
    teleport: false,
    ...opts,
  };
}

export function buildGame(def: LevelDef): GameState {
  checkLevelIntegrity(def);
  const grid: TileCode[][] = def.rowsData.map((row) =>
    row.map((raw) => staticTile(raw)),
  );
  const entities: Entity[] = [];
  let startX = -1;
  let startY = -1;
  let diamondsTotal = 0;

  for (let y = 0; y < def.rows; y++) {
    for (let x = 0; x < def.cols; x++) {
      const raw = def.rowsData[y]?.[x] ?? T.EMPTY;
      switch (raw) {
        case T.BOULDER:
          entities.push(buildEntity('boulder', x, y));
          break;
        case T.DIAMOND:
          entities.push(buildEntity('diamond', x, y));
          diamondsTotal++;
          break;
        case T.CHEST:
          diamondsTotal++;
          break;
        case T.CRATE:
          entities.push(buildEntity('crate', x, y));
          break;
        case T.SPIDER:
          entities.push(buildEntity('spider', x, y, { axis: 'h', ticks: ENEMY_DELAY_TICKS }));
          break;
        case T.SNAKE:
          entities.push(buildEntity('snake', x, y, { axis: 'v', ticks: ENEMY_DELAY_TICKS }));
          break;
        case T.PLAYER:
          startX = x;
          startY = y;
          break;
      }
    }
  }

  const player = buildEntity('player', startX, startY, { teleport: true });
  entities.push(player);

  return {
    levelIndex: 0,
    grid,
    cols: def.cols,
    rows: def.rows,
    entities,
    player,
    startX,
    startY,
    status: 'playing',
    clock: 0,
    statusTicks: 0,
    score: 0,
    lives: 3,
    diamonds: 0,
    diamondsTotal,
    exitOpen: false,
    hasKey: false,
    hasHammer: false,
    heldDir: null,
    inputQueue: [],
    playerDelay: 0,
    doorUnlockFlash: 0,
    hurtFlash: 0,
    collectFlash: 0,
    events: [],
  };
}

export function newGame(levelIndex = 0): GameState {
  nextId = 1;
  const def = LEVELS[levelIndex];
  if (!def) throw new Error(`no level ${levelIndex}`);
  return buildGame(def);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
function emit(g: GameState, ev: GameEvent): void {
  g.events.push(ev);
  if (g.events.length > 8) g.events.shift();
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
export function pushInput(g: GameState, dir: Dir): void {
  if (g.status !== 'playing') return;
  if (g.inputQueue.length < 8) g.inputQueue.push(dir);
}

export function setHeldDir(g: GameState, dir: Dir | null): void {
  g.heldDir = dir;
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------
function moveAnimation(g: GameState, e: Entity, x: number, y: number): void {
  e.x = x;
  e.y = y;
  e.moved = true;
}

function movePlayerTo(g: GameState, x: number, y: number, dir: Dir): void {
  const p = g.player;
  moveAnimation(g, p, x, y);
  p.frame = (p.frame + 1) % 4;
  void dir;
}

function dig(g: GameState, x: number, y: number): void {
  if ((g.grid[y]?.[x] ?? T.EMPTY) === T.EMPTY) return;
  (g.grid[y] as TileCode[])[x] = T.EMPTY;
  g.score += SCORE.DIRT;
  emit(g, 'dig');
}

function attemptPlayerMove(g: GameState, dir: Dir): void {
  const { dx, dy } = vec(dir);
  const p = g.player;
  const tx = p.x + dx;
  const ty = p.y + dy;

  if (!inBounds(g, tx, ty)) return;

  const tile = tileAt(g, tx, ty);
  const ent = entityAt(g, tx, ty);

  // ---- static fixtures block -------------------------------------------
  if (tile === T.WALL || (tile === T.EXIT && !g.exitOpen)) return;

  // ---- enemies ----------------------------------------------------------
  if (ent && (ent.kind === 'spider' || ent.kind === 'snake')) {
    emit(g, 'bump');
    return;
  }

  // ---- exit door --------------------------------------------------------
  if (tile === T.EXIT && g.exitOpen) {
    movePlayerTo(g, tx, ty, dir);
    completeLevel(g);
    return;
  }

  // ---- collectibles -----------------------------------------------------
  if (tile === T.KEY) {
    (g.grid[ty] as TileCode[])[tx] = T.EMPTY;
    g.hasKey = true;
    g.score += SCORE.KEY;
    g.collectFlash = g.clock;
    movePlayerTo(g, tx, ty, dir);
    emit(g, 'keygot');
    return;
  }

  if (tile === T.CHEST) {
    (g.grid[ty] as TileCode[])[tx] = T.EMPTY;
    g.hasHammer = true;
    g.diamonds++;
    g.score += SCORE.CHEST;
    g.collectFlash = g.clock;
    movePlayerTo(g, tx, ty, dir);
    emit(g, 'chest');
    return;
  }

  if (tile === T.DIRT || tile === T.LEAVES) {
    dig(g, tx, ty);
    movePlayerTo(g, tx, ty, dir);
    return;
  }

  // ---- dynamic objects --------------------------------------------------
  if (ent) {
    if (ent.kind === 'boulder' || ent.kind === 'crate') {
      if (g.hasHammer) {
        ent.dead = true;
        g.score += SCORE.BOULDER_BREAK;
        movePlayerTo(g, tx, ty, dir);
        emit(g, 'break');
        return;
      }
      // try pushing
      const px = tx + dx;
      const py = ty + dy;
      if (inBounds(g, px, py) && tileAt(g, px, py) === T.EMPTY && !entityAt(g, px, py)) {
        moveAnimation(g, ent, px, py);
        movePlayerTo(g, tx, ty, dir);
        emit(g, 'push');
        return;
      }
      return; // blocked
    }
    if (ent.kind === 'diamond') {
      ent.dead = true;
      g.diamonds++;
      g.score += SCORE.DIAMOND;
      g.collectFlash = g.clock;
      movePlayerTo(g, tx, ty, dir);
      emit(g, 'pick');
      return;
    }
    emit(g, 'thud');
    return;
  }

  // ---- open cell --------------------------------------------------------
  movePlayerTo(g, tx, ty, dir);
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------
function advanceEnemy(g: GameState, e: Entity): void {
  if (e.ticks-- > 0) {
    e.frame = (e.frame + 1) % 4;
    return;
  }
  e.ticks = ENEMY_DELAY_TICKS;

  const dx = e.axis === 'h' ? e.dir : 0;
  const dy = e.axis === 'v' ? e.dir : 0;
  const nx = e.x + dx;
  const ny = e.y + dy;

  if (inBounds(g, nx, ny) && tileAt(g, nx, ny) === T.EMPTY && !entityAt(g, nx, ny)) {
    moveAnimation(g, e, nx, ny);
    e.frame = (e.frame + 1) % 4;
  } else {
    e.dir *= -1;
  }

  // contact damage
  if (e.x === g.player.x && e.y === g.player.y) {
    killPlayer(g, 'contact');
  }
}

// ---------------------------------------------------------------------------
// Gravity & rolling
// ---------------------------------------------------------------------------
const FALLING: EntityKind[] = ['boulder', 'diamond', 'crate'];

function applyGravity(g: GameState): void {
  const falling = g.entities
    .filter((e) => !e.dead && FALLING.includes(e.kind))
    .sort((a, b) => b.y - a.y); // bottom-up so stacked objects resolve cleanly

  for (const e of falling) {
    e.fell = false;
    const by = e.y + 1;
    if (by >= g.rows) continue;

    const belowTile = tileAt(g, e.x, by);
    const belowEnt = entityAt(g, e.x, by);

    // fall straight down (through creatures — crush resolution happens after)
    const clears = belowTile === T.EMPTY && (!belowEnt || belowEnt.kind === 'player' || belowEnt.kind === 'spider' || belowEnt.kind === 'snake');
    if (clears) {
      moveAnimation(g, e, e.x, by);
      e.fell = true;
      if (e.kind === 'boulder') emit(g, 'roll');
      continue;
    }

    // boulders roll over ledges: below must be solid, and the diagonal
    // drop-out (side + one down) must be open air on both cells
    if (e.kind === 'boulder') {
      for (const side of [-1, 1]) {
        const sx = e.x + side;
        if (!inBounds(g, sx, e.y)) continue;
        if (tileAt(g, sx, e.y) !== T.EMPTY) continue;
        if (entityAt(g, sx, e.y)) continue;
        if (tileAt(g, sx, by) !== T.EMPTY) continue;
        if (entityAt(g, sx, by)) continue;
        moveAnimation(g, e, sx, e.y);
        emit(g, 'roll');
        break;
      }
    }
  }
}

/** Anything that moved down this tick (or landed) may crush what it now shares a cell with. */
function applyCrush(g: GameState): void {
  for (const e of g.entities) {
    if (e.dead || !FALLING.includes(e.kind) || !e.fell) continue;
    const victim = g.entities.find(
      (o) => !o.dead && o !== e && o.x === e.x && o.y === e.y,
    );
    if (!victim) continue;

    if (victim.kind === 'player') {
      if (e.kind === 'diamond') {
        victim.dead = true;
        g.diamonds++;
        g.score += SCORE.DIAMOND;
        g.collectFlash = g.clock;
        emit(g, 'pick');
      } else {
        killPlayer(g, 'crush');
      }
      continue;
    }
    if (victim.kind === 'spider' || victim.kind === 'snake') {
      victim.dead = true;
      g.score += SCORE.ENEMY_CRUSH;
      emit(g, 'break');
    }
  }
}

// ---------------------------------------------------------------------------
// Door & win
// ---------------------------------------------------------------------------
function checkDoor(g: GameState): void {
  if (!g.exitOpen && g.diamonds >= g.diamondsTotal) {
    g.exitOpen = true;
    g.doorUnlockFlash = g.clock;
    emit(g, 'door');
  }
}

function completeLevel(g: GameState): void {
  g.status = 'levelclear';
  emit(g, 'win');
}

// ---------------------------------------------------------------------------
// Death & respawn
// ---------------------------------------------------------------------------
function killPlayer(g: GameState, cause: 'crush' | 'contact'): void {
  if (g.player.invuln > 0) return;
  g.lives -= 1;
  g.player.invuln = SPAWN_INVULN_TICKS;
  g.status = 'dying';
  g.statusTicks = DEATH_TICKS;
  g.inputQueue.length = 0;
  g.heldDir = null;
  g.hurtFlash = g.clock;
  emit(g, 'death');
  void cause;
}

function respawnOrGameOver(g: GameState): void {
  if (g.lives <= 0) {
    g.status = 'gameover';
    g.statusTicks = 0;
    return;
  }
  const p = g.player;
  p.x = g.startX;
  p.y = g.startY;
  p.teleport = true;
  p.invuln = SPAWN_INVULN_TICKS;
  p.frame = 0;
  g.status = 'playing';
}

// ---------------------------------------------------------------------------
// Public control surface
// ---------------------------------------------------------------------------
export function pauseGame(g: GameState): void {
  if (g.status === 'playing' || g.status === 'dying') g.status = 'paused';
}

export function resumeGame(g: GameState): void {
  if (g.status === 'paused') g.status = 'playing';
}

export function restart(g: GameState): void {
  const fresh = newGame(g.levelIndex);
  Object.assign(g, fresh);
  emit(g, 'start');
}

export function toIntro(g: GameState): void {
  restart(g);
  g.status = 'intro';
  g.inputQueue.length = 0;
  g.heldDir = null;
}

export function beginGame(g: GameState): void {
  g.status = 'playing';
  g.playerDelay = 0;
  emit(g, 'start');
}

// ---------------------------------------------------------------------------
// Master tick
// ---------------------------------------------------------------------------
export function stepGame(g: GameState): void {
  g.clock++;
  g.events.length = 0;

  if (g.status === 'paused' || g.status === 'gameover' || g.status === 'levelclear' || g.status === 'intro') {
    return;
  }

  if (g.status === 'dying') {
    g.statusTicks--;
    if (g.statusTicks <= 0) respawnOrGameOver(g);
    return;
  }

  if (g.player.invuln > 0) g.player.invuln--;
  g.player.teleport = false;

  // --- player movement with cadence --------------------------------------
  if (g.playerDelay > 0) {
    g.playerDelay--;
  } else {
    let dir: Dir | undefined;
    if (g.inputQueue.length > 0) {
      dir = g.inputQueue.shift();
    } else if (g.heldDir) {
      dir = g.heldDir;
    }
    if (dir) {
      attemptPlayerMove(g, dir);
      if (g.inputQueue.length > 0 || g.heldDir) g.playerDelay = PLAYER_DELAY_TICKS;
    }
  }

  // --- enemies -----------------------------------------------------------
  for (const e of g.entities) {
    if (!e.dead && (e.kind === 'spider' || e.kind === 'snake')) {
      advanceEnemy(g, e);
    }
  }

  // --- gravity -----------------------------------------------------------
  applyGravity(g);

  // --- crush / squish ----------------------------------------------------
  applyCrush(g);

  // --- exit door ---------------------------------------------------------
  checkDoor(g);

  // --- sweep corpses -----------------------------------------------------
  g.entities = g.entities.filter((e) => !e.dead);
}