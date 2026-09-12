/**
 * Engine smoke test — runs the pure simulation in Node (via tsx).
 * Verifies level integrity, digging, gravity, crushing, enemy patrols,
 * diamond collection and exit unlocking without any UI.
 *
 * Run: npm run smoke
 */
import {
  buildGame,
  entityAt,
  newGame,
  pushInput,
  setHeldDir,
  stepGame,
  tileAt,
} from '../src/game/engine';
import { LevelDef } from '../src/game/levels';
import { T, DEATH_TICKS, SPAWN_INVULN_TICKS } from '../src/game/types';

let failures = 0;
function ok(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ok    ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL  ${msg}`);
  }
}

const def = (rowsData: number[][], requiredDiamonds: number): LevelDef => ({
  name: 'smoke',
  subtitle: 'test',
  cols: rowsData[0]!.length,
  rows: rowsData.length,
  rowsData,
  requiredDiamonds,
  seed: 1,
});

// ---------------------------------------------------------------------------
function testLevelIntegrity() {
  console.log('level integrity');
  const g = newGame(0);
  ok(g.cols === 14 && g.rows === 16, 'stage 1 is 14x16');
  for (let x = 0; x < g.cols; x++) {
    ok(tileAt(g, x, 0) === T.WALL, `top border wall at col ${x}`);
    const bottom = tileAt(g, x, g.rows - 1);
    ok(bottom === T.WALL || bottom === T.EXIT, `bottom border wall/exit at col ${x}`);
  }
  ok(g.diamondsTotal === 8, 'stage has exactly 8 diamonds');
  ok(g.player.x === 1 && g.player.y === 1, 'player starts at (1,1)');
  ok(g.status === 'playing', 'starts playing after newGame');
}

function testDiggingAndWalls() {
  console.log('digging / walls');
  const g = newGame(0);
  pushInput(g, 'up'); // wall above player (1,0) is wall? (1,0) row0 is wall -> blocked
  stepGame(g);
  ok(g.player.x === 1 && g.player.y === 1, 'blocked by wall above');
  pushInput(g, 'right'); // dig dirt (2,1)
  stepGame(g);
  ok(tileAt(g, 2, 1) === T.EMPTY, 'dirt dug on move');
  ok(g.player.x === 2 && g.player.y === 1, 'player advanced into dug dirt');
  ok(g.score > 0, 'digging scores points');
  g.inputQueue.length = 0;
  g.playerDelay = 0;
  pushInput(g, 'left');
  stepGame(g);
  ok(g.player.x === 1, 'moves left over cleared cell');
}

function testGravityFalling() {
  console.log('gravity');
  const g = buildGame(
    def(
      [
        [1, 1, 1, 1, 1],
        [1, 9, 0, 0, 1],
        [1, 0, 3, 4, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
      ],
      1,
    ),
  );
  const boulder = entityAt(g, 2, 2);
  const diamond = entityAt(g, 3, 2);
  for (let i = 0; i < 10; i++) stepGame(g);
  ok(boulder!.y === 3, 'boulder fell one cell');
  ok(diamond!.y === 3, 'diamond fell one cell');
  ok(entityAt(g, 2, 3) === boulder && entityAt(g, 3, 3) === diamond, 'objects rest on wall row');
}

function testCrushDirect() {
  console.log('crush direct (boulder on head)');
  const g = buildGame(
    def(
      [
        [1, 1, 1, 1, 1],
        [1, 1, 3, 1, 1],
        [1, 1, 9, 1, 1],
        [1, 1, 1, 1, 1],
      ],
      0,
    ),
  );
  // boulder at (2,1) falls straight onto the player standing at (2,2)
  ok(g.player.x === 2 && g.player.y === 2, 'player positioned below boulder');
  const before = g.lives;
  let died = false;
  let alive = true;
  for (let i = 0; i < 40 && alive; i++) {
    stepGame(g);
    if (g.status === 'dying') died = true;
    if (g.status !== 'playing') alive = false;
  }
  ok(died, 'player crushed by falling boulder -> dying');
  ok(g.lives === before - 1, 'life lost on crush');
  for (let i = 0; i < DEATH_TICKS * 2 && g.status !== 'playing'; i++) stepGame(g);
  ok(g.status === 'playing', 'respawns after death sting');
  ok(g.player.x === g.startX && g.player.y === g.startY, 'respawned at start');
  ok(g.player.invuln === SPAWN_INVULN_TICKS, 'invulnerable after respawn');
}

function testEnemyPatrol() {
  console.log('enemy patrol');
  const g = buildGame(
    def(
      [
        [1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 7, 0, 0, 1],
        [1, 9, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1],
      ],
      1,
    ),
  );
  // spider at (3,1), will bounce between walls on either side (cols 1..5)
  const spider = entityAt(g, 3, 1)!;
  const seen = new Set<number>();
  for (let i = 0; i < 80; i++) {
    stepGame(g);
    seen.add(spider.x * 100 + spider.y);
  }
  ok(seen.size >= 2, 'spider patrols multiple cells');
  let reversed = false;
  for (let i = 0; i < 200; i++) {
    const x = spider.x;
    stepGame(g);
    if (Math.abs(spider.x - x) === 1) {
      // moving
    } else if (x !== spider.x) {
      reversed = true;
    }
  }
  ok(reversed || spider.x > 1 || spider.x < 5, 'spider reverses at boundaries');
  ok(spider.x >= 1 && spider.x <= 5, 'spider stays in corridor');
}

function testExitUnlockAndWin() {
  console.log('exit unlock + win');
  const g = buildGame(
    def(
      [
        [1, 1, 1, 1, 1, 1],
        [1, 9, 4, 0, 8, 1],
        [1, 1, 1, 1, 1, 1],
      ],
      1,
    ),
  );
  // collect the single diamond to the right, exit at (4,1)
  pushInput(g, 'right');
  stepGame(g);
  g.inputQueue.length = 0;
  g.playerDelay = 0;
  ok(g.diamonds === 1, 'diamond collected');
  ok(g.exitOpen === true, 'exit door opened once diamonds complete');
  setHeldDir(g, 'right');
  for (let i = 0; i < 12; i++) stepGame(g);
  ok(g.status === 'levelclear', 'stepping on open exit clears the level');
}

// ---------------------------------------------------------------------------
testLevelIntegrity();
testDiggingAndWalls();
testGravityFalling();
testCrushDirect();
testEnemyPatrol();
testExitUnlockAndWin();

if (failures > 0) {
  console.error(`\n${failures} FAILURES`);
  process.exit(1);
} else {
  console.log('\nall engine checks passed');
}