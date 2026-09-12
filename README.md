# Diamond Rush — Nokia feature-phone remake (React Native / Expo)

A faithful remake of the classic 2006 J2ME **Diamond Rush**, played inside an
authentic Nokia-style keypad handset. Pure TypeScript — the chiptune sound
effects and the pixel-art sprites are generated in code, and the terrain for
every stage is **decoded straight from the original game's ROM world data**
(worlds `w0/w1/w2.bin`).

The full campaign is real: **41 authentic stages across 3 worlds**
(14 × Angkor Wat → 13 × Bavaria → 14 × Siberia), rendered 24 px/tile using
terrain-backdrop PNGs extracted from the original assets, with camera scrolling,
digging, gravity, enemy patrols and level progression.

## Run it

```bash
npm install
npm start          # Expo SDK 53 — works in Expo Go (iOS / Android / web)
npm run web        # or: expo start --web (browser)
```

Verification scripts:

```bash
npm run typecheck  # tsc --noEmit
npm run smoke      # headless engine + full-campaign tests in Node (tsx)
```

Production bundle check (catches missing asset requires):

```bash
npx expo export --platform web --output-dir dist-web
```

## Controls (maps to a real 3310/6300 layout)

| Key | Action |
| --- | --- |
| D-Pad / `2 4 6 8` | Move (hold for auto-run) |
| OK / `5` | Start / continue / confirm |
| LSK `Menu` | Pause |
| RSK `Inv` | Inventory overlay / retry from pause |
| Green `Call` | Pause / resume |
| Red `End` | Quit to title |
| `0` | Hard restart level |

## Gameplay flow

1. **Intro card** shows the stage name (`ANGKOR WAT · STAGE 1`, …) over a dimmed
   photo of the stage terrain → press `5` to start.
2. Dig through the ground, dodge/roll boulders, dodge spiders & snakes.
3. Collect **diamonds** (and **chests**, which count as diamonds and grant the
   hammer tool) — once `diamonds >= diamondsTotal` the exit unseals.
4. Walk into the exit → **LEVEL CLEAR** → press `5` to advance to the next stage.
   Clearing the final stage (siberia-14) returns to the title.
5. **Escape stages** (angkor-9, bavaria-10, siberia-11) contain zero diamonds, so
   the exit opens on the very first tick — a pure escape run.

## The real-world data pipeline

`src/game/pix/real_worlds.ts` holds 41 `RealStage` entries extracted from the
original game worlds (world 0 = Angkor, world 1 = Bavaria, world 2 = Siberia).
Each carries `{ world, stage, w, h, b64, spawn, diamondsTotal }`.

### Raw cell format (documented for future work)

- Payload is **plain row-major, one byte per cell** — `b64` decodes to exactly
  `w * h` bytes (byte-length == `w*h` is the integrity check; true for all 41).
- Codes seen in the real data (the ROM's own legend):
  `0  dirt/ground (diggable)` · `1 wall (solid)` · `3 boulder · 4 diamond ·
  5 chest · 7 spider · 8 exit door · 9 player spawn`.
  Codes `2, 6, 10, 11, 12` do not occur in the real stages (kept for the engine
  and hand-made levels).
- `spawn` matches the unique code-9 cell; every stage has exactly one player.
- JSON `spawn`/`diamondsTotal` fields were cross-validated against the bytes:
  `diamondsTotal === count(4) + count(5)` for **all 41 stages**.
- Stage inventory by world: angkor 1–14, bavaria 1–13, siberia 1–14. Zero-diamond
  escape stages: angkor-9, bavaria-10, siberia-11. 317 chests across the
  campaign, no keys.

### Decoding into playable levels

`src/game/levels.ts` decodes each `RealStage` into a `LevelDef`
(`decodeBase64` is a pure-TS base64 decoder — no `Buffer`/`atob`, so it runs in
React Native). `LEVELS` is the full 41-stage campaign in original world order.

Key design decisions (locked in by records + tests, do not regress):

- **Raw code `0` → `T.DIRT` (diggable ground), never empty air.** Boulders and
  gems rest on it, the player carves tunnels by walking, and the level is stable
  at spawn (no boulders tumble on frame 1). Hand-made test levels may still use
  code `0` for open air.
- **Spiders crawl across dirt**, so enemy patrols check `tile !== WALL` rather
  than `tile === EMPTY`. They still reverse at walls and at other entities.
- **Chests auto-open on contact — no key required — and count as +1 diamond**
  (that is why `diamondsTotal` is gems + chests). Opened chests grant the hammer
  tool so boulders/crates can be smashed.
- `requiredDiamonds` (= `diamondsTotal`) is taken from the real `diamondsTotal`
  field, and smoke re-derives it from the grid for every stage.

## Rendering

- **Backdrops**: `assets/levels/{world}-{n}.png` are authentic 24 px/tile terrain
  renders of each original stage (plus `-ground.png` variants, currently
  unused). `src/game/backdrops.ts` maps `"{world}-{n}"` → asset (`BACKDROPS`).
- **Camera**: the playfield is a full-level `Image` at 24 px/tile; a viewport
  (LCD minus status/HUD) follows the player and clamps to the stage bounds, so
  wide (siberia-10, 104 cols) and tall (angkor-6, 75 rows) stages scroll.
- **Statics & sprites**: chests and the exit door are drawn as overlays on the
  terrain; boulders, diamonds, crates, spiders, snakes and the player render as
  tweened `Animated` sprites above the backdrop.
- **Dug pits**: cells carved to EMPTY (digging, consumed chests, hammer breaks)
  are tracked in `GameState.dugCells` and drawn as dark pits over the backdrop,
  restoring the authentic "hole in the ground" look.

## Architecture

```
App.tsx                          – composition + phone-key-to-action mapping
src/shell/NokiaShell.tsx         – hardware frame, bezel, tactile keypad (haptics+clicks)
src/screen/Sprites.tsx           – procedural pixel-art bitmaps (player, spider, gem…)
src/game/GameEngine.tsx          – LCD renderer: status bar, camera viewport, terrain
                                   backdrop, statics, sprites, HUD, CRT, overlays
src/game/useGameLoop.ts          – 20 Hz tick loop, input cadence, sound-event drain;
                                   level-clear → advanceLevel
src/game/engine.ts               – pure simulation: physics, collisions, enemies, door,
                                   advanceLevel(), dugCells, levelIndex
src/game/types.ts                – tile legend, entity model, GameState (incl. dugCells)
src/game/levels.ts               – level contract + full 41-stage campaign decoder
src/game/pix/real_worlds.ts      – 41 original stages (world, size, b64, spawn, totals)
src/game/backdrops.ts            – stage → terrain-PNG asset registry
src/game/synth.ts                – 8-bit WAV synthesis → data: URIs (square/tri/noise)
src/game/sound.ts                – expo-av chiptune player (silent-safe)
scripts/smoke.ts                 – headless engine verification
```

### Engine highlights

- **Tile legend** matches the original: raw code `0 = dirt` for real stages,
  plus `1 wall · 2 dirt · 3 boulder · 4 diamond · 5 chest · 6 crate · 7 spider ·
  8 exit · 9 player start` (and `10 key · 11 leaves · 12 snake` for the engine).
- **Gravity & rolling**: boulders/diamonds/crates fall 1 cell/tick; boulders
  tumble sideways over open ledges. Falling objects crush the player or squash
  enemies (diamonds grant the score instead).
- **Crush/push physics**: one-block pushes when the destination is clear; digs
  tear through dirt/leaves instantly.
- **Collectibles & tools**: gather all required diamonds to unseal the exit;
  chests grant the hammer, which shatters boulders.
- **Enemies** patrol corridors (horizontal spider, vertical snake) and reverse
  at walls; they crawl over diggable dirt.
- Vintage pacing: ~20 Hz tick, player cadence ≈ 6–7 cells/s, tweened
  grid-to-grid motion.

## Testing (scripts/smoke.ts)

- Real-level integrity: angkor-1 geometry, spawn, diamond total, entity counts vs
  grid.
- **Full campaign**: all 41 stages decode, order (angkor→bavaria→siberia),
  row/column consistency, `diamondsTotal == gems+chests`, spawn + entities in
  bounds.
- **Escape stages**: all 3 open their exit on tick 1 and stay playable.
- **Progression**: `advanceLevel` loads next stage as intro, final stage →
  title, `buildGame` honours `levelIndex`.
- Chest auto-collect (no key), digging (incl. dugCells pits), gravity, crush →
  dying → respawn w/ invulnerability, enemy patrol + dirt crawling, exit unlock
  + win.

## History

- `3c38aae` — prototype: Nokia shell, LCD renderer, pure engine, chiptune SFX,
  smoke tests, one hand-made level.
- `106b225` — authentic bavaria-1 backdrop rendering with camera scroll; shell as
  Nokia 6300.
- `9c3b68d` — full 41-stage campaign decodes/orders the real worlds; level
  advancement + intro photo cards; dug-pit visuals; spiders walk on dirt;
  comprehensive campaign smoke tests.