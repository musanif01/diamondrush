import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  LayoutChangeEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { sfx } from '../game/sound';

export type PhoneKey =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'ok'
  | 'lsk'
  | 'rsk'
  | 'call'
  | 'end'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '0'
  | '*'
  | '#';

export interface NokiaShellProps {
  /** LCD content (the game / title screen) */
  children: ReactNode;
  /** fired with haptics + UI click on every physical key press */
  onKeyPress: (key: PhoneKey) => void;
  /** fired on key release — used for directional auto-run */
  onKeyRelease?: (key: PhoneKey) => void;
}

const SHELL_W = 336;

interface KeyBus {
  press: (key: PhoneKey) => void;
  release?: (key: PhoneKey) => void;
}

const KeyContext = createContext<KeyBus>({ press: () => {} });
const useKeyBus = () => useContext(KeyContext);

// ---------------------------------------------------------------------------
// Fit-to-screen wrapper with calligraphic proportions preserved
// ---------------------------------------------------------------------------
function FitScale({ naturalW, naturalH, children }: { naturalW: number; naturalH: number; children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (scale > 1) setScale(1);
  }, [scale]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const s = Math.min(1, width / naturalW, height / naturalH);
    setScale(Math.max(0.4, s));
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onLayout={onLayout}>
      <View style={{ width: naturalW * scale, height: naturalH * scale, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: naturalW, height: naturalH, transform: [{ scale }], alignItems: 'center' }}>
          {children}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Physical key
// ---------------------------------------------------------------------------
interface KeyButtonProps {
  keyId: PhoneKey;
  children?: ReactNode;
  color?: string;
  textColor?: string;
  size?: number;
  wide?: boolean;
  pill?: boolean;
  chrome?: boolean;
  edge?: boolean;
}

function KeyButton({ keyId, children, color, textColor = '#1d232b', size = 50, wide, pill, chrome, edge }: KeyButtonProps) {
  const bus = useKeyBus();
  const fire = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    sfx.play('key');
    bus.press(keyId);
  };
  const release = () => {
    if (bus.release) bus.release(keyId);
  };
  const bg = chrome ? '#8d939c' : edge ? '#aab0b8' : color ?? '#dde1e6';

  return (
    <Pressable
      onPressIn={fire}
      onPressOut={release}
      style={({ pressed }) => [
        styles.key,
        {
          width: wide ? size + 34 : size,
          height: pill ? size * 0.8 : size,
          borderRadius: pill ? size : Math.min(size / 2, 15),
          backgroundColor: bg,
          borderColor: chrome ? '#171a1f' : '#6f7680',
          transform: [{ scale: pressed ? 0.94 : 1 }, { translateY: pressed ? 2 : 0 }],
        },
      ]}
    >
      {({ pressed }) => (
        <View style={{ alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 }}>
          {chrome && <View pointerEvents="none" style={styles.chromeInner} />}
          {children}
        </View>
      )}
    </Pressable>
  );
}

function KeyLabel({ text }: { text: string }) {
  return <Text style={styles.keyLabel}>{text}</Text>;
}

function NumKey({ d, sub, k }: { d: string; sub?: string; k: PhoneKey }) {
  return (
    <KeyButton keyId={k} size={52}>
      <Text style={styles.numLabel}>{d}</Text>
      {sub ? <Text style={styles.numSub}>{sub}</Text> : null}
    </KeyButton>
  );
}

// ---------------------------------------------------------------------------
// The Nokia 6300 — stainless steel bar phone
// ---------------------------------------------------------------------------
export function NokiaShell({ children, onKeyPress, onKeyRelease }: NokiaShellProps) {
  return (
    <View style={styles.root}>
      <FitScale naturalW={SHELL_W} naturalH={896}>
        <KeyContext.Provider value={{ press: onKeyPress, release: onKeyRelease }}>
          <View style={styles.shell}>
            {/* top gloss + branding */}
            <View style={styles.gloss} pointerEvents="none" />
            <View style={styles.topBand}>
              <Text style={styles.brand}>NOKIA</Text>
              <Text style={styles.model}>6300</Text>
            </View>

            {/* screen bezel */}
            <View style={styles.bezel}>
              <View style={styles.bezelChrome} pointerEvents="none" />
              <View style={styles.bezelInner}>{children}</View>
            </View>

            {/* keypad */}
            <View style={styles.pad}>
              {/* softkeys + up */}
              <View style={styles.padRow}>
                <KeyButton keyId="lsk" wide pill size={40} edge>
                  <KeyLabel text="Menu" />
                </KeyButton>
                <KeyButton keyId="up" size={50} chrome>
                  <MaterialIcons name="keyboard-arrow-up" size={27} color="#15181d" />
                </KeyButton>
                <KeyButton keyId="rsk" wide pill size={40} edge>
                  <KeyLabel text="Inv" />
                </KeyButton>
              </View>

              {/* left / ok / right — chrome rocker */}
              <View style={styles.padRow}>
                <KeyButton keyId="left" size={50} chrome>
                  <MaterialIcons name="keyboard-arrow-left" size={27} color="#15181d" />
                </KeyButton>
                <KeyButton keyId="ok" size={58} chrome>
                  <View style={styles.okDisc}>
                    <View style={styles.okDot} />
                  </View>
                </KeyButton>
                <KeyButton keyId="right" size={50} chrome>
                  <MaterialIcons name="keyboard-arrow-right" size={27} color="#15181d" />
                </KeyButton>
              </View>

              {/* call / down / end */}
              <View style={styles.padRow}>
                <KeyButton keyId="call" size={58} color="#3f9a5e">
                  <MaterialIcons name="phone" size={20} color="#0c2c1a" />
                  <Text style={styles.exoLabel}>SEND</Text>
                </KeyButton>
                <KeyButton keyId="down" size={50} chrome>
                  <MaterialIcons name="keyboard-arrow-down" size={27} color="#15181d" />
                </KeyButton>
                <KeyButton keyId="end" size={58} color="#c8504a">
                  <MaterialIcons name="call-end" size={19} color="#33100e" />
                  <Text style={styles.exoLabel}>END</Text>
                </KeyButton>
              </View>

              <View style={styles.divider} />

              {/* number block */}
              <View style={[styles.padRow, styles.numRow]}>
                <NumKey d="1" k="1" />
                <NumKey d="2" sub="\u2191" k="2" />
                <NumKey d="3" k="3" />
              </View>
              <View style={[styles.padRow, styles.numRow]}>
                <NumKey d="4" sub="\u2190" k="4" />
                <NumKey d="5" k="5" />
                <NumKey d="6" sub="\u2192" k="6" />
              </View>
              <View style={[styles.padRow, styles.numRow]}>
                <NumKey d="7" k="7" />
                <NumKey d="8" sub="\u2193" k="8" />
                <NumKey d="9" k="9" />
              </View>
              <View style={[styles.padRow, styles.numRow]}>
                <NumKey d="*" k="*" />
                <NumKey d="0" k="0" />
                <NumKey d="#" k="#" />
              </View>
            </View>
          </View>
        </KeyContext.Provider>
      </FitScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07090b',
    overflow: 'hidden',
  },
  shell: {
    width: SHELL_W,
    height: 896,
    backgroundColor: '#b6bcc4',
    borderColor: '#787f89',
    borderWidth: 2,
    borderRadius: 44,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: '38%',
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  topBand: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  brand: {
    color: '#262b32',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 9,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  model: {
    color: '#5a6069',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 6,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  bezel: {
    width: 304,
    backgroundColor: '#5b6068',
    borderRadius: 14,
    padding: 6,
    marginTop: 2,
  },
  bezelChrome: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    height: '46%',
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bezelInner: {
    width: 290,
    backgroundColor: '#05070a',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#05070a',
  },
  pad: {
    marginTop: 10,
    width: 300,
    gap: 7,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numRow: {
    justifyContent: 'space-evenly',
  },
  divider: {
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.14)',
    marginVertical: 4,
  },
  key: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  chromeInner: {
    position: 'absolute',
    width: '86%',
    height: '46%',
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  keyLabel: {
    color: '#262b32',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  okDisc: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  okDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2c3138',
    borderWidth: 2,
    borderColor: '#10131a',
  },
  numLabel: {
    color: '#1d232b',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  numSub: {
    position: 'absolute',
    top: 5,
    right: 11,
    color: '#4c545e',
    fontSize: 11,
    fontWeight: '800',
  },
  exoLabel: {
    color: '#121812',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 0,
  },
});