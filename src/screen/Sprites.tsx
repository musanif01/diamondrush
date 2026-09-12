import React from 'react';
import { View } from 'react-native';

export interface Palette {
  [key: string]: string;
}

/**
 * Renders a tiny character-grid bitmap as absolutely positioned Views.
 * Only non-'.' cells are emitted, keeping the view count low.
 */
export function Pixel({
  map,
  pal,
  size,
}: {
  map: string[];
  pal: Palette;
  size: number;
}) {
  const rows = map.length;
  const cols = map[0]?.length ?? 0;
  const pw = size / cols;
  const ph = size / rows;
  const cells: React.ReactNode[] = [];

  for (let y = 0; y < rows; y++) {
    const row = map[y];
    if (!row) continue;
    for (let x = 0; x < cols; x++) {
      const ch = row[x];
      if (ch === undefined || ch === '.') continue;
      const color = pal[ch];
      if (!color) continue;
      cells.push(
        <View
          key={`${x}-${y}`}
          style={{
            position: 'absolute',
            left: x * pw,
            top: y * ph,
            width: pw + 0.5,
            height: ph + 0.5,
            backgroundColor: color,
          }}
        />,
      );
    }
  }

  return <View style={{ width: size, height: size }}>{cells}</View>;
}

// ---------------------------------------------------------------------------
// Player — the little explorer
// ---------------------------------------------------------------------------
export const PLAYER_PAL: Palette = {
  o: '#33240f',
  h: '#7a4a1e',
  f: '#e04b3a',
  s: '#e8b98a',
  c: '#2aa0d6',
  d: '#1c74a8',
  b: '#5b3a1e',
  p: '#3a4260',
  u: '#1c1f26',
};

export const PLAYER_MAP = [
  '.....oo.....',
  '....ohho....',
  '....offo....',
  '....ohho....',
  '.....ss.....',
  '....osos....',
  '...ccscc....',
  '..cccccccc..',
  '.ccs....scc.',
  '...bbbbbb...',
  '...pp..pp...',
  '...uu..uu...',
];

// ---------------------------------------------------------------------------
// Spider
// ---------------------------------------------------------------------------
export const SPIDER_PAL: Palette = {
  O: '#c0392b',
  o: '#17191f',
  w: '#ffffff',
};

export const SPIDER_MAP = [
  'o..o..oo..o..o',
  '.o.o.owww.o.o.',
  '..oo.OOOO.oo..',
  '..oOOOOOOO.o..',
  '.oOOOOOOOOOo..',
  'oOOO.OOO.OOOo.',
  '.oOOOOOOOOOo..',
  '..oOOOoOOOo...',
  '...o..OO..o...',
  '..............',
];

// ---------------------------------------------------------------------------
// Snake
// ---------------------------------------------------------------------------
export const SNAKE_PAL: Palette = {
  g: '#3f9b45',
  k: '#1c5b24',
  w: '#f4f8f4',
};

const SNAKE_A = [
  '......kgk.........',
  '..g........gg.....',
  'g..........g......',
  'g...........ggggg.',
  '..g........g......',
  '....kgk....g......',
];

const SNAKE_B = [
  '........kgk.......',
  '..gg.......g......',
  '....g......g......',
  'gggg........ggggg.',
  '...........g......',
  '..g........kg.....',
];

export const SNAKE_MAPS = [SNAKE_A, SNAKE_B];

// ---------------------------------------------------------------------------
// Diamond
// ---------------------------------------------------------------------------
export const GEM_PAL: Palette = {
  w: '#ffffff',
  C: '#bdf0f7',
  y: '#33d6f0',
  b: '#1786a3',
};

export const GEM_MAP = [
  '....ww....',
  '...CCCC...',
  '..CCyyCC..',
  '.CCyyyyCC.',
  '.CyyyyyyC.',
  '..CbyyyC..',
  '...CbbC...',
  '....CC....',
];

// ---------------------------------------------------------------------------
// Key
// ---------------------------------------------------------------------------
export const KEY_PAL: Palette = {
  G: '#e6c944',
  g: '#9a7f16',
};

export const KEY_MAP = [
  '.GGG.....G..',
  'G...G....G..',
  'G...G....G..',
  '.GGG....GGG.',
  '.........G..',
  '.........G..',
  '........g...',
  '...........g',
];

// ---------------------------------------------------------------------------
// HUD heart
// ---------------------------------------------------------------------------
export const HEART_PAL: Palette = {
  R: '#e0423c',
  r: '#8c1f1d',
  w: '#ffd9d2',
};

export const HEART_MAP = [
  '..RR..RR..',
  '.RRwRRRRR.',
  'RRwwRRRRwR',
  'RRwwRRRwwR',
  '.RRRRRRR..',
  '.RRrrrrR..',
  '..RRRRR...',
  '...RRR....',
];