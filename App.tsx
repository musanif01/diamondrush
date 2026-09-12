import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GameEngine } from './src/game/GameEngine';
import { useGameLoop } from './src/game/useGameLoop';
import { NokiaShell, PhoneKey } from './src/shell/NokiaShell';
import { Dir } from './src/game/types';
import { sfx } from './src/game/sound';

const MOVE_KEYS: Partial<Record<PhoneKey, Dir>> = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  '2': 'up',
  '4': 'left',
  '6': 'right',
  '8': 'down',
};

export default function App() {
  const loop = useGameLoop();
  const [showInv, setShowInv] = useState(false);

  const press = useCallback(
    (key: PhoneKey) => {
      const move = MOVE_KEYS[key];
      if (move) {
        loop.pressDir(move);
        return;
      }
      switch (key) {
        case 'ok':
        case '5':
          if (showInv) {
            setShowInv(false);
            sfx.play('menu');
          } else {
            loop.onAction();
          }
          break;
        case 'lsk':
          setShowInv(false);
          loop.onMenu();
          break;
        case 'rsk':
          setShowInv((v) => !v);
          sfx.play('menu');
          break;
        case 'call':
          setShowInv(false);
          loop.onCall();
          break;
        case 'end':
          setShowInv(false);
          loop.onEnd();
          break;
        case '0':
          setShowInv(false);
          loop.onRestart();
          break;
        default:
          break;
      }
    },
    [loop, showInv],
  );

  const release = useCallback(
    (key: PhoneKey) => {
      const move = MOVE_KEYS[key];
      if (move) loop.releaseDir(move);
    },
    [loop],
  );

  return (
    <View style={stylesRoot.container}>
      <StatusBar style="light" />
      <NokiaShell onKeyPress={press} onKeyRelease={release}>
        <GameEngine game={loop.game} showInventory={showInv} />
      </NokiaShell>
    </View>
  );
}

const stylesRoot = {
  container: { flex: 1, backgroundColor: '#090b0e' },
};