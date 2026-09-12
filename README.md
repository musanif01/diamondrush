# Diamond Rush — Nokia feature-phone remake (React Native / Expo)

A functional prototype that re-creates the classic 2006 J2ME **Diamond Rush**
inside an authentic Nokia-style keypad handset. Pure TypeScript, no sprite
assets, no audio files — both the chiptune sound effects and the pixel art
are generated in code.

## Run it

```bash
npm install
npm start          # Expo SDK 53 — works in Expo Go (iOS / Android / web)
```

Other scripts:

```bash
npm run typecheck  # tsc --noEmit
npm run smoke      # run the engine unit tests headlessly in Node
```

## Controls (maps to a real 3310/6300 layout)

| Key | Action |
| --- | --- |
| D-Pad / `2 4 6 8` | Move (hold for auto-run) |
| OK / `5` | Start / confirm / use tool |
| LSK `Menu` | Pause |
| RSK `Inv` | Inventory overlay / retry from pause |
| Green `Call` | Pause / resume |
| Red `End` | Quit to title |
| `0` | Hard restart level |

## Architecture

```
App.tsx                          – composition + phone-key-to-action mapping
src/shell/NokiaShell.tsx         – hardware frame, bezel, tactile keypad (haptics+clicks)
src/screen/Sprites.tsx           – procedural pixel-art bitmaps (player, spider, gem…)
src/game/GameEngine.tsx          – LCD renderer: status bar, grid, entities, HUD, CRT, overlays
src/game/useGameLoop.ts          – 20 Hz tick loop, input cadence, sound-event drain
src/game/engine.ts               – pure simulation: physics, collisions, enemies, door
src/game/types.ts                – tile legend, entity model, tuning constants
src/game/levels.ts               – Stage 1 "Bavaria Ruins" (14x16) + level contract
src/game/synth.ts                – 8-bit WAV synthesis → data: URIs (square/tri/noise)
src/game/sound.ts                – expo-av chiptune player (silent-safe)
scripts/smoke.ts                 – headless engine verification
```

### Engine highlights

- **Tile legend** matches the original: `0 empty · 1 wall · 2 dirt · 3 boulder ·
  4 diamond · 5 chest · 9 player start`, extended with `6 crate · 7 spider ·
  8 exit · 10 key · 11 leaves · 12 snake`.
- **Gravity & rolling**: boulders/diamonds/crates fall 1 cell/tick; boulders
  tumble sideways when they hang over an open ledge. Falling objects crush the
  player or squash enemies (diamonds grant the score instead).
- **Crush/push physics**: one-block pushes when the destination is clear; digs
  tear through dirt/leaves instantly.
- **Collectibles & tools**: gather all required diamonds to unseal the exit
  door; the rusty key opens a chest containing the hammer, which shatters
  boulders.
- **Enemies** patrol horizontal/vertical corridors and reverse at walls.
- Vintage pacing: ~20 Hz tick, player cadence ≈ 6–7 cells/s, tweened for
  smooth grid-to-grid motion.

## Requirements met

| Spec | Implementation |
| --- | --- |
| Retro frame, 240x320-class LCD, status bar | `NokiaShell.tsx` + `GameEngine.tsx` status bar (signal/battery/clock) |
| CRT / LCD pixel-grid + inner shadow | `Crt` scanline + vignette layer |
| Full tactile keypad (D-Pad, LSK/RSK, Call/End, 12-key) | `NokiaShell.tsx` with `expo-haptics` |
| Tile engine & mechanics | `engine.ts`, grid-driven, 60 FPS tween rendering |
| Tick physics 20-30 Hz | `useGameLoop.ts` at `TICK_MS = 50` |
| Chiptune SFX | `synth.ts` + `expo-av` (`dig`, `push`, `pick`, `door`, `death`, `win`, …) |
| Componentized TS (3 deliverables) | `NokiaShell.tsx`, `GameEngine.tsx`, `useGameLoop.ts` |