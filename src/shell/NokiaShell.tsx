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
  /** overrides shown by the shell between the softkey labels */
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
  size?: number;
  wide?: boolean;
  pill?: boolean;
  dim?: boolean;
}

function KeyButton({ keyId, children, color, size = 52, wide, pill, dim }: KeyButtonProps) {
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

  return (
    <Pressable
      onPressIn={fire}
      onPressOut={release}
      style={({ pressed }) => [
        styles.key,
        {
          width: wide ? size + 26 : size,
          height: pill ? size * 0.78 : size,
          borderRadius: pill ? size : size / 2,
          backgroundColor: dim ? '#20242a' : color ?? '#2c3239',
          transform: [{ scale: pressed ? 0.94 : 1 }, { translateY: pressed ? 2 : 0 }],
        },
      ]}
    >
      {({ pressed }) => (
        <View style={{ alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 }}>
          {children}
        </View>
      )}
    </Pressable>
  );
}

function KeyLabel({ text, sub }: { text?: string; sub?: string }) {
  return (
    <Text style={styles.keyLabel}>
      {text}
      {sub && (
        <Text style={styles.keySub}>
          {'\u2009'}({sub})
        </Text>
      )}
    </Text>
  );
}

function NumKey({ d, sub, k }: { d: string; sub?: string; k: PhoneKey }) {
  return (
    <KeyButton keyId={k} size={54}>
      <Cover />
      <Text style={styles.numLabel}>{d}</Text>
      {sub ? <Text style={styles.numSub}>{sub}</Text> : null}
    </KeyButton>
  );
}

/** Blurred emboss backdrop so digits read like printed plastic keys */
function Cover() {
  return <View pointerEvents="none" style={styles.keyBump} />;
}

// ---------------------------------------------------------------------------
// The shell
// ---------------------------------------------------------------------------
export function NokiaShell({ children, onKeyPress, onKeyRelease }: NokiaShellProps) {
  return (
    <View style={styles.root}>
      <FitScale naturalW={SHELL_W} naturalH={908}>
        <KeyContext.Provider value={{ press: onKeyPress, release: onKeyRelease }}>
        <View style={styles.shell}>
          {/* top band: grill + wordmark */}
          <View style={styles.topBand}>
            <View style={styles.grill}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.grillSlot} />
              ))}
            </View>
            <Text style={styles.brand}>NOKIA</Text>
          </View>

          {/* screen bezel */}
          <View style={styles.bezel}>
            <View style={styles.bezelInner}>{children}</View>
          </View>

          {/* keypad */}
          <View style={styles.pad}>
            {/* row 1 — softkeys + up */}
            <View style={styles.padRow}>
              <KeyButton keyId="lsk" wide pill size={44}>
                <KeyLabel text="Menu" />
              </KeyButton>
              <KeyButton keyId="up" size={50}>
                <MaterialIcons name="keyboard-arrow-up" size={30} color="#cfd6e0" />
              </KeyButton>
              <KeyButton keyId="rsk" wide pill size={44}>
                <KeyLabel text="Inv" />
              </KeyButton>
            </View>

            {/* row 2 — left / ok / right */}
            <View style={styles.padRow}>
              <KeyButton keyId="left" size={50}>
                <MaterialIcons name="keyboard-arrow-left" size={30} color="#cfd6e0" />
              </KeyButton>
              <KeyButton keyId="ok" size={54} color="#3b444f">
                <View style={styles.okDot} />
              </KeyButton>
              <KeyButton keyId="right" size={50}>
                <MaterialIcons name="keyboard-arrow-right" size={30} color="#cfd6e0" />
              </KeyButton>
            </View>

            {/* row 3 — call / down / end */}
            <View style={styles.padRow}>
              <KeyButton keyId="call" size={56} color="#2f8f57">
                <MaterialIcons name="call" size={22} color="#0c2c1a" />
                <Text style={styles.callLabel}>SEND</Text>
              </KeyButton>
              <KeyButton keyId="down" size={50}>
                <MaterialIcons name="keyboard-arrow-down" size={30} color="#cfd6e0" />
              </KeyButton>
              <KeyButton keyId="end" size={56} color="#b0352e">
                <MaterialIcons name="call-end" size={20} color="#2b0d0b" />
                <Text style={styles.endLabel}>END</Text>
              </KeyButton>
            </View>

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
    backgroundColor: '#090b0e',
    overflow: 'hidden',
  },
  shell: {
    width: SHELL_W,
    height: 908,
    backgroundColor: '#31373f',
    borderColor: '#4a525e',
    borderWidth: 2,
    borderRadius: 40,
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    // metal rim
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  topBand: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  grill: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 2,
  },
  grillSlot: {
    width: 7,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#13161a',
  },
  brand: {
    marginTop: 4,
    color: '#9aa3b0',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  bezel: {
    width: 304,
    backgroundColor: '#0b0d10',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#04060a',
    shadowColor: '#000',
    shadowOpacity: 0.9,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 6,
  },
  bezelInner: {
    width: 290,
    backgroundColor: '#05070a',
    borderRadius: 6,
    overflow: 'hidden',
  },
  pad: {
    marginTop: 12,
    width: 304,
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
  key: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0e1115',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  keyBump: {
    position: 'absolute',
    left: 6,
    top: 3,
    right: 6,
    height: '42%',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  keyLabel: {
    color: '#e7ebf1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  keySub: {
    color: '#8a94a3',
    fontSize: 10,
    fontWeight: '600',
  },
  numLabel: {
    color: '#f2f5f9',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  numSub: {
    position: 'absolute',
    top: 6,
    right: 12,
    color: '#87909c',
    fontSize: 11,
    fontWeight: '700',
  },
  okDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#8b95a3',
    borderWidth: 2,
    borderColor: '#eef1f6',
  },
  callLabel: {
    color: '#0c2c1a',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  endLabel: {
    color: '#2b0d0b',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
});