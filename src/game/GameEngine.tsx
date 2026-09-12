import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { Entity, GameState, T } from '../game/types';
import { tileAt } from '../game/engine';
import { LEVELS } from '../game/levels';
import { BACKDROPS } from '../game/backdrops';
import {
  GEM_MAP,
  GEM_PAL,
  HEART_MAP,
  HEART_PAL,
  PLAYER_MAP,
  PLAYER_PAL,
  Pixel,
  SNAKE_MAPS,
  SNAKE_PAL,
  SPIDER_MAP,
  SPIDER_PAL,
} from '../screen/Sprites';

const STATUS_H = 30;
const HUD_H = 30;
const TILE = 24; // backdrop native pixels per tile

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

interface ScreenSize {
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Status bar (inside the LCD)
// ---------------------------------------------------------------------------
function StatusBar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const bars = [4, 7, 10, 13, 15];

  return (
    <View style={styles.statusBar}>
      <View style={styles.statusLeft}>
        <View style={styles.signalRow}>
          {bars.map((h, i) => (
            <View key={i} style={[styles.signalBar, { height: h }]} />
          ))}
        </View>
        <Text style={styles.statusText}>RUSH</Text>
      </View>
      <Text style={styles.clock}>{`${hh}:${mm}`}</Text>
      <View style={styles.statusRight}>
        <View style={styles.battery}>
          <View style={styles.batteryFill} />
        </View>
        <View style={styles.batteryTip} />
        <Text style={styles.batteryText}>88</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Static fixtures drawn above the terrain backdrop
// ---------------------------------------------------------------------------
function ChestSprite({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.72, height: size * 0.66, backgroundColor: '#8a5a24', borderWidth: 2, borderColor: '#4c2f10', borderRadius: 2 }}>
        <View style={[styles.abs, { height: size * 0.34, left: 2, right: 2, backgroundColor: '#a06a2c', borderBottomWidth: 2, borderBottomColor: '#6e441a' }]} />
        <View style={[styles.abs, { width: 4, top: 0, bottom: 0, left: '46%', backgroundColor: '#6e441a' }]} />
        <View style={[styles.abs, { width: 6, height: 7, top: '42%', left: '44%', backgroundColor: '#e6c944', borderRadius: 1 }]} />
      </View>
    </View>
  );
}

function ExitSprite({ size, open }: { size: number; open: boolean }) {
  if (open) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.abs, { left: '18%', top: '12%', width: '64%', height: '76%', backgroundColor: '#3f1b52', borderWidth: 2, borderColor: '#b06ff0' }]} />
        <View style={[styles.abs, { left: '36%', top: '40%', width: '28%', height: '14%', backgroundColor: '#d6b0f5' }]} />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.abs, { left: '20%', top: '16%', width: '60%', height: '68%', backgroundColor: '#20222b', borderWidth: 2, borderColor: '#3a3d49' }]} />
      <View style={[styles.dot, { left: '30%', top: '30%', backgroundColor: '#c0392b' }]} />
      <View style={[styles.dot, { left: '62%', top: '30%', backgroundColor: '#c0392b' }]} />
      <View style={[styles.dot, { left: '46%', top: '60%', backgroundColor: '#8c8f99' }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Entity sprites (drawn above terrain)
// ---------------------------------------------------------------------------
function Boulder({ size }: { size: number }) {
  const d = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: '#98a0a8', borderWidth: 2, borderColor: '#53585f' }}>
        <View style={{ position: 'absolute', left: '20%', top: '13%', width: '40%', height: '20%', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.35)' }} />
        <View style={{ position: 'absolute', right: '14%', bottom: '12%', width: '28%', height: '15%', borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.28)' }} />
      </View>
    </View>
  );
}

function Crate({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.8, height: size * 0.8, backgroundColor: '#a06a2c', borderWidth: 2, borderColor: '#5f3f1a', borderRadius: 2 }}>
        <View style={{ position: 'absolute', top: 2, bottom: 0, left: '32%', width: 2, backgroundColor: '#6e441a' }} />
        <View style={{ position: 'absolute', top: 2, bottom: 0, left: '64%', width: 2, backgroundColor: '#6e441a' }} />
        <View style={{ position: 'absolute', left: 2, right: 2, top: '46%', height: 2, backgroundColor: '#6e441a' }} />
      </View>
    </View>
  );
}

function EntitySprite({ e, size, blink }: { e: Entity; size: number; blink: boolean }) {
  switch (e.kind) {
    case 'player':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: blink ? 0.35 : 1 }}>
          <Pixel map={PLAYER_MAP} pal={PLAYER_PAL} size={size * 0.92} />
        </View>
      );
    case 'boulder':
      return <Boulder size={size} />;
    case 'crate':
      return <Crate size={size} />;
    case 'diamond':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Pixel map={GEM_MAP} pal={GEM_PAL} size={size * 0.66} />
        </View>
      );
    case 'spider':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Pixel map={SPIDER_MAP} pal={SPIDER_PAL} size={size * 0.94} />
        </View>
      );
    case 'snake': {
      const map = SNAKE_MAPS[e.frame % 2] ?? SNAKE_MAPS[0]!;
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scaleX: e.dir < 0 ? -1 : 1 }],
          }}
        >
          <Pixel map={map} pal={SNAKE_PAL} size={size * 0.98} />
        </View>
      );
    }
  }
}

/** Wraps an entity in a tweened Animated position between grid cells. */
const MovingSprite = memo(function MovingSprite({ e, size, blink }: { e: Entity; size: number; blink: boolean }) {
  const pos = useRef(new Animated.ValueXY({ x: e.x * size, y: e.y * size })).current;
  const last = useRef({ x: e.x, y: e.y });

  useEffect(() => {
    if (last.current.x === e.x && last.current.y === e.y) return;
    last.current = { x: e.x, y: e.y };
    if (e.teleport) {
      pos.setValue({ x: e.x * size, y: e.y * size });
    } else {
      Animated.timing(pos, { toValue: { x: e.x * size, y: e.y * size }, duration: 42, useNativeDriver: false }).start();
    }
  }, [e.x, e.y, e.teleport, size]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: size,
        height: size,
        transform: pos.getTranslateTransform(),
      }}
    >
      <EntitySprite e={e} size={size} blink={blink} />
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function Hud({ game }: { game: GameState }) {
  const lives = Math.max(0, game.lives);
  const hearts = [];
  for (let i = 0; i < Math.min(lives, 3); i++) {
    hearts.push(<Pixel key={i} map={HEART_MAP} pal={HEART_PAL} size={11} />);
  }
  const score = game.score.toString().padStart(6, '0');

  return (
    <View style={styles.hud}>
      <View style={styles.hudLeft}>{hearts}</View>
      <View style={styles.hudCenter}>
        <Pixel map={GEM_MAP} pal={GEM_PAL} size={12} />
        <Text style={[styles.hudGemText, game.exitOpen && { color: '#ffce3a' }]}>
          {` ${game.diamonds}/${game.diamondsTotal}`}
        </Text>
      </View>
      <Text style={styles.hudScore}>{score}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// CRT / pixel-grid effect
// ---------------------------------------------------------------------------
function Crt() {
  return (
    <View pointerEvents="none" style={styles.crt}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <View key={i} style={[styles.scanline, { top: `${(i + 1) * 12.5}%` }]} />
      ))}
      <View style={styles.crtVignette} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------
function Overlay({ dark, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.overlay, dark && { backgroundColor: 'rgba(0,0,0,0.72)' }]}>
      {children}
    </View>
  );
}

function IntroOverlay({ game }: { game: GameState }) {
  const blink = game.clock % 2 === 0;
  const stage = LEVELS[game.levelIndex];
  return (
    <Overlay dark>
      <Text style={[styles.flicker, styles.title]}>DIAMOND RUSH</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pixel map={GEM_MAP} pal={GEM_PAL} size={16} />
        <Text style={styles.subtitle}>{`${stage?.name ?? ''} · ${stage?.stageLabel ?? ''}`}</Text>
      </View>
      <Text style={styles.blurb}>COLLECT ALL DIAMONDS. AVOID THE CRUSHES.</Text>
      <Text style={styles.blurb}>LSK = MENU · RSK = INVENTORY</Text>
      <Text style={styles.blurb}>OK = USE / START · END = EXIT</Text>
      <Text style={[styles.prompt, { opacity: blink ? 0.2 : 1 }]}>PRESS 5 OR OK</Text>
    </Overlay>
  );
}

function PauseOverlay() {
  return (
    <Overlay dark>
      <Text style={styles.pauseText}>PAUSED</Text>
      <Text style={styles.hint}>CALL OR 5 TO RESUME</Text>
      <Text style={styles.hint}>0 = RETRY LEVEL</Text>
      <Text style={styles.hint}>END FOR TITLE</Text>
    </Overlay>
  );
}

function GameOverOverlay({ game }: { game: GameState }) {
  const blink = game.clock % 2 === 0;
  return (
    <Overlay dark>
      <Text style={styles.overLose}>GAME OVER</Text>
      <Text style={styles.subtitle}>SCORE {game.score.toString().padStart(6, '0')}</Text>
      <Text style={[styles.prompt, { opacity: blink ? 0.2 : 1 }]}>PRESS 5 TO RETRY</Text>
    </Overlay>
  );
}

function ClearOverlay({ game }: { game: GameState }) {
  const blink = game.clock % 2 === 0;
  return (
    <Overlay dark>
      <Text style={styles.overWin}>LEVEL CLEAR!</Text>
      <Text style={styles.subtitle}>{`SCORE  ${game.score.toString().padStart(6, '0')}`}</Text>
      <Text style={styles.subtitle}>{`DIAMONDS  ${game.diamonds}/${game.diamondsTotal}`}</Text>
      <Text style={[styles.prompt, { opacity: blink ? 0.2 : 1 }]}>PRESS 5 TO CONTINUE</Text>
    </Overlay>
  );
}

function InventoryOverlay({ game }: { game: GameState }) {
  return (
    <View style={styles.inventorySheet}>
      <Text style={styles.invTitle}>INVENTORY</Text>
      <View style={styles.invRow}>
        <Text style={styles.invKeyColor}>{game.hasKey ? 'KEY' : 'NO KEY'}  </Text>
        <Text style={styles.invVal}>{game.hasKey ? 'RUSTY KEY FOUND' : '\u2014'}</Text>
      </View>
      <View style={styles.invRow}>
        <Text style={styles.invKeyColor}>{game.hasHammer ? 'TOOL' : 'NO TOOL'}</Text>
        <Text style={styles.invVal}>{game.hasHammer ? 'HAMMER' : '\u2014'}</Text>
      </View>
      <View style={styles.invRow}>
        <Text style={styles.invKeyColor}>DIAMONDS</Text>
        <Text style={styles.invVal}>{`${game.diamonds}/${game.diamondsTotal}`}</Text>
      </View>
      <Text style={styles.hint}>OK OR RSK TO CLOSE</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Scrollable playfield — authentic backdrop + camera + entities
// ---------------------------------------------------------------------------
export function GameEngine({ game, showInventory }: { game: GameState; showInventory: boolean }) {
  const [size, setSize] = useState<ScreenSize>({ w: 290, h: 387 });

  const cols = game.cols;
  const rows = game.rows;
  const levelW = cols * TILE;
  const levelH = rows * TILE;

  const backdropKey = LEVELS[game.levelIndex]?.backdrop;
  const backdrop = backdropKey ? BACKDROPS[backdropKey] : undefined;

  const vpW = size.w;
  const vpH = Math.max(60, size.h - STATUS_H - HUD_H);
  const maxCamX = Math.max(0, levelW - vpW);
  const maxCamY = Math.max(0, levelH - vpH);

  const camX = Math.min(maxCamX, Math.max(0, game.player.x * TILE + TILE / 2 - vpW / 2));
  const camY = Math.min(maxCamY, Math.max(0, game.player.y * TILE + TILE / 2 - vpH / 2));

  const shake = useRef(new Animated.Value(0)).current;
  const panX = useRef(new Animated.Value(-camX)).current;
  const panY = useRef(new Animated.Value(-camY)).current;

  useEffect(() => {
    panX.setValue(-camX);
    panY.setValue(-camY);
  }, [camX, camY, panX, panY]);

  const prevDoor = useRef(game.doorUnlockFlash);
  const prevHurt = useRef(game.hurtFlash);

  const runShake = (amp: number) => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: amp, duration: 40, useNativeDriver: false }),
      Animated.timing(shake, { toValue: -amp, duration: 40, useNativeDriver: false }),
      Animated.timing(shake, { toValue: amp * 0.6, duration: 40, useNativeDriver: false }),
      Animated.timing(shake, { toValue: -amp * 0.4, duration: 40, useNativeDriver: false }),
      Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: false }),
    ]).start();
  };

  useEffect(() => {
    if (game.doorUnlockFlash !== prevDoor.current) {
      prevDoor.current = game.doorUnlockFlash;
      runShake(3);
    }
    if (game.hurtFlash !== prevHurt.current) {
      prevHurt.current = game.hurtFlash;
      runShake(5);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.doorUnlockFlash, game.hurtFlash]);

  // static fixtures (chests + exit) as overlays on the terrain
  const statics: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = tileAt(game, x, y);
      if (t === T.CHEST) {
        statics.push(
          <View key={`c${x}-${y}`} style={{ position: 'absolute', left: x * TILE, top: y * TILE, width: TILE, height: TILE }}>
            <ChestSprite size={TILE} />
          </View>,
        );
      } else if (t === T.EXIT) {
        statics.push(
          <View key={`x${x}-${y}`} style={{ position: 'absolute', left: x * TILE, top: y * TILE, width: TILE, height: TILE }}>
            <ExitSprite size={TILE} open={game.exitOpen} />
          </View>,
        );
      }
    }
  }

  const falling = game.entities
    .filter((e) => e.kind === 'boulder' || e.kind === 'diamond' || e.kind === 'crate')
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const enemies = game.entities.filter((e) => e.kind === 'spider' || e.kind === 'snake');
  const playerBlink = game.player.invuln > 0;

  return (
    <View style={styles.lcd} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <StatusBar />

      <View style={{ position: 'absolute', top: STATUS_H, left: 0, width: vpW, height: vpH, overflow: 'hidden' }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: levelW,
              height: levelH,
            },
            { transform: [{ translateX: Animated.add(panX, shake) }, { translateY: panY }] },
          ]}
        >
          {backdrop ? (
            <Image source={backdrop} style={{ width: levelW, height: levelH }} resizeMode="stretch" />
          ) : (
            <View style={{ width: levelW, height: levelH, backgroundColor: '#0b0e12' }} />
          )}
          {statics}
          {falling.map((e) => (
            <MovingSprite key={e.id} e={e} size={TILE} blink={false} />
          ))}
          {enemies.map((e) => (
            <MovingSprite key={e.id} e={e} size={TILE} blink={false} />
          ))}
          <MovingSprite key={game.player.id} e={game.player} size={TILE} blink={playerBlink} />
        </Animated.View>

        {game.exitOpen && (
          <View pointerEvents="none" style={[styles.exitBanner, { top: 4 }]}>
            <Text style={styles.exitBannerText}>EXIT OPEN</Text>
          </View>
        )}
      </View>

      <Hud game={game} />
      <Crt />

      {game.status === 'intro' && <IntroOverlay game={game} />}
      {game.status === 'paused' && <PauseOverlay />}
      {game.status === 'dying' && (
        <Overlay>
          <View style={styles.hurt} />
        </Overlay>
      )}
      {game.status === 'gameover' && <GameOverOverlay game={game} />}
      {game.status === 'levelclear' && <ClearOverlay game={game} />}
      {showInventory && <InventoryOverlay game={game} />}
    </View>
  );
}

const styles = StyleSheet.create({
  lcd: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#05070a',
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STATUS_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 7,
    backgroundColor: '#07090d',
    borderBottomWidth: 1,
    borderBottomColor: '#10141a',
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 14 },
  signalBar: { width: 2.5, marginLeft: 1, backgroundColor: '#37e06e' },
  statusText: { color: '#9aa3b0', fontSize: 9, fontWeight: '700', letterSpacing: 1, fontFamily: 'monospace' },
  clock: { color: '#cfe6d4', fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  battery: {
    width: 26,
    height: 11,
    borderWidth: 1.5,
    borderColor: '#3b824a',
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  batteryFill: { width: '70%', height: '68%', backgroundColor: '#37e06e' },
  batteryTip: { width: 3, height: 5, backgroundColor: '#3b824a', borderTopRightRadius: 1, borderBottomRightRadius: 1 },
  batteryText: { color: '#cfe6d4', fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },

  abs: { position: 'absolute' },
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5 },

  hud: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HUD_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    backgroundColor: '#07090d',
    borderTopWidth: 1,
    borderTopColor: '#10141a',
  },
  hudLeft: { flexDirection: 'row', gap: 1 },
  hudCenter: { flexDirection: 'row', alignItems: 'center' },
  hudGemText: { color: '#37e0c8', fontSize: 13, fontWeight: '800', fontFamily: 'monospace' },
  hudScore: { color: '#cfe6d4', fontSize: 13, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1 },

  exitBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  exitBannerText: {
    color: '#ffce3a',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: 'monospace',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  crt: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  crtVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  flicker: {
    textShadowColor: 'rgba(0,220,140,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  title: {
    color: '#37e0c8',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  subtitle: {
    color: '#cfe6d4',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  blurb: {
    color: '#7a8f86',
    fontSize: 9,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  prompt: {
    marginTop: 8,
    color: '#37e06e',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },

  pauseText: { color: '#ffce3a', fontSize: 20, fontWeight: '900', letterSpacing: 4, fontFamily: 'monospace' },
  hint: { color: '#9aa3b0', fontSize: 10, fontFamily: 'monospace' },

  overLose: { color: '#e0423c', fontSize: 20, fontWeight: '900', letterSpacing: 2, fontFamily: 'monospace' },
  overWin: { color: '#37e06e', fontSize: 18, fontWeight: '900', letterSpacing: 2, fontFamily: 'monospace' },

  inventorySheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '22%',
    backgroundColor: 'rgba(8,12,16,0.96)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1c2733',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 9,
  },
  invTitle: { color: '#37e0c8', fontSize: 14, fontWeight: '900', letterSpacing: 3, fontFamily: 'monospace', marginBottom: 2 },
  invRow: { flexDirection: 'row', gap: 8 },
  invKeyColor: { color: '#ffce3a', fontSize: 11, fontWeight: '800', fontFamily: 'monospace', width: 62 },
  invVal: { color: '#cfe6d4', fontSize: 11, fontFamily: 'monospace' },

  hurt: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(224,66,60,0.18)',
  },
});