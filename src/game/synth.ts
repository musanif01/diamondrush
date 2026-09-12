/**
 * Procedural 8-bit chiptune synthesis — generates WAV blobs entirely in JS,
 * so no binary audio assets are required. Compatible with `expo-av` via
 * `data:` URIs, works identically on iOS / Android / web.
 */

export type SfxName =
  | 'key'
  | 'dig'
  | 'push'
  | 'roll'
  | 'pick'
  | 'keygot'
  | 'chest'
  | 'break'
  | 'door'
  | 'death'
  | 'win'
  | 'start'
  | 'thud'
  | 'bump'
  | 'menu';

type Shape = 'square' | 'tri' | 'noise' | 'sine';

interface Segment {
  f: number; // start frequency Hz
  d: number; // duration ms
  shape: Shape;
  v: number; // 0..1 volume
  slideTo?: number; // end frequency (glissando)
  gap?: number; // silence ms before this segment
}

const SR = 22050;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function wave(shape: Shape, phase: number, noisePhase: boolean): number {
  switch (shape) {
    case 'square':
      return phase < 0.5 ? 1 : -1;
    case 'tri':
      return 4 * Math.abs(phase - 0.5) - 1;
    case 'sine':
      return Math.sin(phase * Math.PI * 2);
    case 'noise':
      return noisePhase ? 1 : -1;
  }
}

function render(segments: Segment[]): string {
  let total = 0;
  for (const s of segments) {
    total += Math.round((s.gap ?? 0) * SR / 1000) + Math.round(s.d * SR / 1000);
  }
  const samples = new Float32Array(total);
  let idx = 0;
  let noiseSeed = 0x2f6e2b1;

  for (const seg of segments) {
    const gapSamples = Math.round(((seg.gap ?? 0) * SR) / 1000);
    idx += gapSamples;

    const n = Math.round((seg.d * SR) / 1000);
    const phaseInc = (f: number) => f / SR;
    let phase = 0;
    let f = seg.f;
    const f2 = seg.slideTo ?? seg.f;

    for (let i = 0; i < n; i++) {
      const t = i / n;
      // subtle attack / release envelope (chip "click" feel)
      const env =
        t < 0.04 ? t / 0.04 : t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.25) : 1;
      f = f + (f2 - f) / n;
      phase = (phase + phaseInc(f)) % 1;
      if (seg.shape === 'noise') {
        // Xorshift-ish cheap noise
        noiseSeed ^= noiseSeed << 13;
        noiseSeed ^= noiseSeed >>> 17;
        noiseSeed ^= noiseSeed << 5;
        samples[idx + i] = (noiseSeed & 1) * 2 - 1;
      } else {
        samples[idx + i] = wave(seg.shape, phase, false) * env * seg.v;
      }
    }
    idx += n;
  }

  // 8-bit signed PCM, mono
  const data = new Uint8Array(44 + total);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) data[offset + i] = s.charCodeAt(i);
  };
  writeStr(0, 'RIFF');
  const writeU32 = (offset: number, v: number) => {
    data[offset] = v & 0xff;
    data[offset + 1] = (v >>> 8) & 0xff;
    data[offset + 2] = (v >>> 16) & 0xff;
    data[offset + 3] = (v >>> 24) & 0xff;
  };
  writeU32(4, 36 + total);
  writeStr(8, 'WAVEfmt ');
  writeU32(16, 16); // fmt chunk size
  data[20] = 1; // PCM
  data[22] = 1; // mono
  writeU32(24, SR);
  writeU32(28, SR); // byte rate
  data[32] = 1; // block align
  data[33] = 0;
  data[34] = 8; // bits per sample
  writeStr(36, 'data');
  writeU32(40, total);
  for (let i = 0; i < total; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]!));
    data[44 + i] = v < 0 ? 256 + v * 128 : v * 127;
  }

  // base64
  let b64 = '';
  for (let i = 0; i < data.length; i += 3) {
    const b0 = data[i]!;
    const b1 = i + 1 < data.length ? data[i + 1]! : 0;
    const b2 = i + 2 < data.length ? data[i + 2]! : 0;
    b64 += B64[b0 >> 2];
    b64 += B64[((b0 & 3) << 4) | (b1 >> 4)];
    b64 += i + 1 < data.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    b64 += i + 2 < data.length ? B64[b2 & 63] : '=';
  }
  return `data:audio/wav;base64,${b64}`;
}

const SEG = (f: number, d: number, shape: Shape, v: number, slideTo?: number, gap?: number): Segment =>
  ({ f, d, shape, v, slideTo, gap });

const EFFECTS: Record<SfxName, string> = {
  key: render([
    SEG(1180, 22, 'square', 0.25),
  ]),
  dig: render([
    SEG(180, 55, 'square', 0.25, 240),
    SEG(90, 40, 'noise', 0.22, undefined, 10),
  ]),
  push: render([
    SEG(95, 70, 'square', 0.4, 70),
  ]),
  roll: render([
    SEG(150, 30, 'square', 0.18, 260),
    SEG(260, 30, 'square', 0.18, 150),
  ]),
  pick: render([
    SEG(523, 55, 'square', 0.22),
    SEG(659, 55, 'square', 0.22, undefined, 12),
    SEG(784, 80, 'square', 0.22, undefined, 12),
  ]),
  keygot: render([
    SEG(523, 50, 'tri', 0.28),
    SEG(784, 50, 'tri', 0.28, 1046, 15),
  ]),
  chest: render([
    SEG(392, 60, 'square', 0.2),
    SEG(523, 60, 'square', 0.2, undefined, 10),
    SEG(659, 60, 'square', 0.2, undefined, 10),
    SEG(784, 110, 'square', 0.24, undefined, 10),
  ]),
  break: render([
    SEG(140, 60, 'square', 0.4, 60),
    SEG(60, 50, 'noise', 0.5, undefined, 8),
  ]),
  door: render([
    SEG(392, 140, 'square', 0.22),
    SEG(311, 140, 'square', 0.22, undefined, 20),
    SEG(233, 260, 'square', 0.26, 196, 20),
  ]),
  death: render([
    SEG(660, 110, 'square', 0.24),
    SEG(494, 110, 'square', 0.24, undefined, 15),
    SEG(330, 220, 'square', 0.28, undefined, 15),
  ]),
  win: render([
    SEG(523, 110, 'square', 0.22),
    SEG(659, 110, 'square', 0.22, undefined, 12),
    SEG(784, 110, 'square', 0.22, undefined, 12),
    SEG(1046, 240, 'square', 0.24, undefined, 12),
  ]),
  start: render([
    SEG(392, 70, 'square', 0.2),
    SEG(494, 70, 'square', 0.2, undefined, 12),
    SEG(587, 120, 'square', 0.2, undefined, 12),
  ]),
  thud: render([
    SEG(85, 45, 'square', 0.5, 40),
  ]),
  bump: render([
    SEG(220, 25, 'tri', 0.22, 180),
  ]),
  menu: render([
    SEG(1400, 22, 'square', 0.2),
  ]),
};

export function effectUri(name: SfxName): string {
  return EFFECTS[name];
}