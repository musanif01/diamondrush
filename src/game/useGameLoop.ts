import { useCallback, useEffect, useRef, useState } from 'react';
import { Dir, GameEvent, GameState, TICK_MS } from '../game/types';
import {
  advanceLevel,
  beginGame,
  newGame,
  pauseGame,
  pushInput,
  restart,
  resumeGame,
  setHeldDir,
  stepGame,
  toIntro,
} from '../game/engine';
import { sfx } from '../game/sound';
import { SfxName } from '../game/synth';

const EVENT_SOUND: Record<GameEvent, SfxName> = {
  key: 'key',
  dig: 'dig',
  push: 'push',
  roll: 'roll',
  pick: 'pick',
  keygot: 'keygot',
  chest: 'chest',
  break: 'break',
  door: 'door',
  death: 'death',
  win: 'win',
  start: 'start',
  thud: 'thud',
  bump: 'bump',
};

export interface GameLoop {
  game: GameState;
  /** direction pressed (enqueues an immediate step + starts auto-repeat) */
  pressDir: (d: Dir) => void;
  /** direction released (stops auto-repeat) */
  releaseDir: (d: Dir) => void;
  /** OK / 5 — start, restart, use tool */
  onAction: () => void;
  /** Call green key — pause / resume */
  onCall: () => void;
  /** End red key — quit to title */
  onEnd: () => void;
  /** LSK — game menu */
  onMenu: () => void;
  /** RSK — restart level */
  onHint: () => void;
  /** 0 — hard restart */
  onRestart: () => void;
}

/**
 * Drives the pure engine on a vintage ~20 Hz tick. The authoritative state
 * lives in a ref (mutated in place each tick); a cheap `tick` counter nudges
 * React to re-render so the grid reflects the latest physics frame.
 */
export function useGameLoop(): GameLoop {
  const stateRef = useRef<GameState>(newGame());

  useEffect(() => {
    toIntro(stateRef.current);
  }, []);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const g = stateRef.current;
      stepGame(g);
      for (const ev of g.events) {
        sfx.play(EVENT_SOUND[ev]);
      }
      setTick((t) => t + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const pressDir = useCallback((d: Dir) => {
    const g = stateRef.current;
    if (g.status !== 'playing') return;
    pushInput(g, d);
    setHeldDir(g, d);
  }, []);

  const releaseDir = useCallback((d: Dir) => {
    const g = stateRef.current;
    if (g.heldDir === d) setHeldDir(g, null);
  }, []);

  const onAction = useCallback(() => {
    const g = stateRef.current;
    if (g.status === 'intro') {
      beginGame(g);
    } else if (g.status === 'levelclear') {
      advanceLevel(g);
    } else if (g.status === 'gameover' || g.status === 'paused') {
      if (g.status === 'paused') {
        resumeGame(g);
      } else {
        restart(g);
      }
    }
  }, []);

  const onCall = useCallback(() => {
    const g = stateRef.current;
    if (g.status === 'playing' || g.status === 'dying') pauseGame(g);
    else if (g.status === 'paused') resumeGame(g);
  }, []);

  const onMenu = useCallback(() => {
    const g = stateRef.current;
    if (g.status === 'playing' || g.status === 'paused') {
      pauseGame(g);
    }
  }, []);

  const onEnd = useCallback(() => {
    toIntro(stateRef.current);
  }, []);

  const onHint = useCallback(() => {
    const g = stateRef.current;
    if (g.status === 'playing') restart(g);
  }, []);

  const onRestart = useCallback(() => {
    restart(stateRef.current);
  }, []);

  return {
    get game() {
      return stateRef.current;
    },
    pressDir,
    releaseDir,
    onAction,
    onCall,
    onMenu,
    onEnd,
    onHint,
    onRestart,
  };
}