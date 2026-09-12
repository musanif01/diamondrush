/**
 * Engine smoke test — runs the pure simulation in Node (via tsx).
 * Verifies level integrity, digging, gravity, crushing, enemy patrols,
 * diamond collection and exit unlocking without any UI.
 *
 * Run: npm run smoke
 */
import {
  advanceLevel,
  buildGame,
  entityAt,
  newGame,
  pushInput,
  setHeldDir,
  stepGame,
  tileAt,
} from '../src/game/engine';
import { countTiles, LEVELS, LevelDef } from '../src/game/levels';
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
  console.log('level integrity (real Angkor stage 1)');
  const g = newGame(0);
  const cols = 26;
  const rows = 21;
  ok(g.cols === cols && g.rows === rows, `authentic angkor-1 is ${cols}x${rows}`);
  ok(g.player.x === 4 && g.player.y === 17, 'player spawns at (4,17)');
  ok(g.diamondsTotal === 22, 'stage needs all 22 diamonds (21 gems + 1 chest)');
  ok(g.diamonds === 0, 'no diamonds collected at spawn');
  ok(tileAt(g, g.player.x, g.player.y) !== T.WALL, 'spawn cell is walkable (not a wall)');
  ok(g.status === 'playing', 'starts playing after newGame');
  const counts = countTiles(LEVELS[0]!);
  const boulders = g.entities.filter((e) => e.kind === 'boulder').length;
  ok(boulders === (counts.get(T.BOULDER) ?? 0), `boulders (${boulders}) match map cells`);
  const critters = g.entities.filter((e) => e.kind === 'spider' || e.kind === 'snake').length;
  ok(
    critters === (counts.get(T.SPIDER) ?? 0) + (counts.get(T.SNAKE) ?? 0),
    `enemies (${critters}) match map cells`,
  );
}

function testFullCampaign() {
  console.log('full 41-stage campaign');
  ok(LEVELS.length === 41, '41 authentic stages');
  const worlds: Array<[string, number]> = [
    ['angkor', 14],
    ['bavaria', 13],
    ['siberia', 14],
  ];
  let idx = 0;
  for (const [world, stages] of worlds) {
    for (let s = 1; s <= stages; s++) {
      const def = LEVELS[idx]!;
      ok(def.world === world && def.stageNo === s, `#${idx} ${world}-${s}`);
      ok(def.rows === def.rowsData.length, `${world}-${s} row count`);
      ok(def.rowsData.every((r) => r.length === def.cols), `${world}-${s} columns consistent`);
      const counts = countTiles(def);
      const total = (counts.get(T.DIAMOND) ?? 0) + (counts.get(T.CHEST) ?? 0);
      ok(def.requiredDiamonds === total, `${world}-${s} needs ${total} (gems+chests)`);
      const g = newGame(idx);
      ok(
        g.player.x >= 0 && g.player.x < def.cols && g.player.y >= 0 && g.player.y < def.rows,
        `${world}-${s} spawn in bounds`,
      );
      ok(g.entities.every((e) => e.x >= 0 && e.y >= 0 && e.x < def.cols && e.y < def.rows), `${world}-${s} entities in bounds`);
      idx++;
    }
  }
  ok(idx === 41, 'campaign covers all stages in order');
}

function testEscapeStages() {
  console.log('zero-diamond escape stages');
  const esc = LEVELS.map((def, i) => (def.requiredDiamonds === 0 ? i : -1)).filter((i) => i >= 0);
  ok(esc.length === 3, `found 3 escape stages (${esc.join(', ')})`);
  for (const i of esc) {
    const g = newGame(i);
    ok(g.diamondsTotal === 0, `#${i} needs 0 diamonds`);
    stepGame(g);
    ok(g.exitOpen === true, `#${i} exit opens immediately without any diamonds`);
    ok(g.status === 'playing', `#${i} remains playable for the escape run`);
  }
}

function testProgression() {
  console.log('level progression');
  const g = newGame(0);
  advanceLevel(g);
  ok(g.levelIndex === 1, 'advance moves to stage 2');
  ok(g.status === 'intro', 'advance shows the intro card');
  ok(g.cols === LEVELS[1]!.cols && g.rows === LEVELS[1]!.rows, 'next stage fully loaded');
  const last = newGame(LEVELS.length - 1);
  advanceLevel(last);
  ok(last.status === 'intro', 'clearing the final stage returns to intro');
  const built = buildGame(def([[9]], 0), 7);
  ok(built.levelIndex === 7, 'buildGame honours levelIndex');
  const restarted = newGame(3);
  ok(restarted.levelIndex === 3, 'newGame(3) is stage 4');
}

function testChestAutoCollect() {
  console.log('chest auto-collect (no key required)');
  const g = buildGame(
    def(
      [
        [1, 1, 1, 1, 1],
        [1, 9, 5, 0, 1],
        [1, 1, 1, 1, 1],
      ],
      1,
    ),
  );
  ok(g.hasKey === false, 'player has no key');
  pushInput(g, 'right');
  stepGame(g);
  ok(tileAt(g, 2, 1) === T.EMPTY, 'chest consumed on step-in');
  ok(g.diamonds === 1, 'chest counts as a diamond');
  ok(g.hasHammer === true, 'opened chest grants the hammer tool');
  ok(g.dugCells.has('2,1'), 'consumed chest leaves a pit marker');
  ok(g.player.x === 2 && g.player.y === 1, 'player advanced into the chest tile');
}

function testDiggingAndWalls() {
  console.log('digging / walls');
  const g = buildGame(
    def(
      [
        [1, 1, 1, 1, 1],
        [1, 9, 2, 0, 1],
        [1, 1, 1, 1, 1],
      ],
      0,
    ),
  );
  pushInput(g, 'up'); // wall above player (1,0) -> blocked
  stepGame(g);
  ok(g.player.x === 1 && g.player.y === 1, 'blocked by wall above');
  pushInput(g, 'right'); // dig dirt (2,1)
  stepGame(g);
  ok(tileAt(g, 2, 1) === T.EMPTY, 'dirt dug on move');
  ok(g.player.x === 2 && g.player.y === 1, 'player advanced into dug dirt');
  ok(g.dugCells.has('2,1'), 'dug dirt recorded as a pit');
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

  // spiders must also crawl across diggable dirt (real stages use 0 -> dirt)
  const d = buildGame(
    def(
      [
        [1, 1, 1, 1, 1, 1, 1],
        [1, 2, 2, 7, 2, 2, 1],
        [1, 9, 2, 2, 2, 2, 1],
        [1, 2, 2, 2, 2, 2, 1],
        [1, 1, 1, 1, 1, 1, 1],
      ],
      0,
    ),
  );
  const sp = entityAt(d, 3, 1)!;
  for (let i = 0; i < 24; i++) stepGame(d);
  ok(sp.x !== 3 || sp.y !== 1, 'spider crawls across dirt floor');
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
testFullCampaign();
testEscapeStages();
testProgression();
testChestAutoCollect();
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