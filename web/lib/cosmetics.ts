/**
 * Cosmetic preferences — tile palette, table felt, and NPC roster the
 * player has selected. Pure data: types, option lists, defaults, and
 * lookup helpers. Settings layer (settingsReducer + storageService) owns
 * persistence and UI binding.
 */

import { TileSuit } from '@/models/Tile';

export type TilePaletteId = 'retro' | 'ivory' | 'neon' | 'bone-wood';

export interface TilePalette {
  id: TilePaletteId;
  label: string;
  description: string;
  /** Tile face background color. */
  faceBg: string;
  /** Per-suit accent color used for the symbol + top color bar. */
  suitColors: Record<string, string>;
  /** Numeric size of the suit color stripe in px (visual density). */
  stripeHeight: number;
}

export const TILE_PALETTES: Record<TilePaletteId, TilePalette> = {
  retro: {
    id: 'retro',
    label: 'Retro',
    description: 'Bright primary suits on cream — the classic 16-bit look.',
    faceBg: '#FFF8E1',
    suitColors: {
      [TileSuit.BAMBOO]: '#4CAF50',
      [TileSuit.CHARACTER]: '#ef4444',
      [TileSuit.DOT]: '#3b82f6',
      [TileSuit.WIND]: '#a1a1aa',
      [TileSuit.DRAGON]: '#a1a1aa',
      [TileSuit.FLOWER]: '#f5b731',
      [TileSuit.SEASON]: '#f5b731',
    },
    stripeHeight: 4,
  },
  ivory: {
    id: 'ivory',
    label: 'Classic Ivory',
    description: 'Warm bone-cream face, muted earthy suits. Traditional feel.',
    faceBg: '#f3e9d0',
    suitColors: {
      [TileSuit.BAMBOO]: '#5a7a3e',
      [TileSuit.CHARACTER]: '#a04030',
      [TileSuit.DOT]: '#3a5a82',
      [TileSuit.WIND]: '#7a6a52',
      [TileSuit.DRAGON]: '#6e564a',
      [TileSuit.FLOWER]: '#c08540',
      [TileSuit.SEASON]: '#a07050',
    },
    stripeHeight: 3,
  },
  neon: {
    id: 'neon',
    label: 'Neon Soul',
    description: 'High-saturation pinks/cyans on near-black. Mahjong-Soul-tier pop.',
    faceBg: '#1a1226',
    suitColors: {
      [TileSuit.BAMBOO]: '#37f0c0',
      [TileSuit.CHARACTER]: '#ff4d8b',
      [TileSuit.DOT]: '#7ad8ff',
      [TileSuit.WIND]: '#c490ff',
      [TileSuit.DRAGON]: '#ffd040',
      [TileSuit.FLOWER]: '#ffaad0',
      [TileSuit.SEASON]: '#ffd040',
    },
    stripeHeight: 4,
  },
  'bone-wood': {
    id: 'bone-wood',
    label: 'Bone & Wood',
    description: 'Aged ivory face with rich mahogany suits. Authentic table feel.',
    faceBg: '#ede1c4',
    suitColors: {
      [TileSuit.BAMBOO]: '#3a6634',
      [TileSuit.CHARACTER]: '#7c2d20',
      [TileSuit.DOT]: '#1f4e6e',
      [TileSuit.WIND]: '#5c4632',
      [TileSuit.DRAGON]: '#4a382c',
      [TileSuit.FLOWER]: '#a04c20',
      [TileSuit.SEASON]: '#724020',
    },
    stripeHeight: 3,
  },
};

export const DEFAULT_TILE_PALETTE: TilePaletteId = 'retro';

export function getTilePalette(id: TilePaletteId | undefined | null): TilePalette {
  if (!id || !(id in TILE_PALETTES)) return TILE_PALETTES[DEFAULT_TILE_PALETTE];
  return TILE_PALETTES[id];
}

/* ─────────────────────────────────────────
   Table felts
   ───────────────────────────────────────── */

export type TableFeltId = 'classic-green' | 'tournament-red' | 'casino-black' | 'bamboo-mat';

export interface TableFelt {
  id: TableFeltId;
  label: string;
  description: string;
  /** CSS class applied to the GameBoard root in addition to game-table-felt. */
  className: string;
}

export const TABLE_FELTS: Record<TableFeltId, TableFelt> = {
  'classic-green': {
    id: 'classic-green',
    label: 'Classic Green',
    description: 'Tournament-standard felt. Deep forest with cross-hatch.',
    className: 'felt-classic-green',
  },
  'tournament-red': {
    id: 'tournament-red',
    label: 'Tournament Red',
    description: 'Crimson felt with gold-trim frame. High-stakes vibe.',
    className: 'felt-tournament-red',
  },
  'casino-black': {
    id: 'casino-black',
    label: 'Casino Black',
    description: 'Inky charcoal with neon edge glow. Vegas after dark.',
    className: 'felt-casino-black',
  },
  'bamboo-mat': {
    id: 'bamboo-mat',
    label: 'Bamboo Mat',
    description: 'Warm tan bamboo weave with wood frame. Tea-house tabletop.',
    className: 'felt-bamboo-mat',
  },
};

export const DEFAULT_TABLE_FELT: TableFeltId = 'classic-green';

export function getTableFelt(id: TableFeltId | undefined | null): TableFelt {
  if (!id || !(id in TABLE_FELTS)) return TABLE_FELTS[DEFAULT_TABLE_FELT];
  return TABLE_FELTS[id];
}

/* ─────────────────────────────────────────
   Roster ids
   ───────────────────────────────────────── */

export type RosterId = 'default' | 'alt';

export interface RosterMeta {
  id: RosterId;
  label: string;
  description: string;
  /** Which NPC ids fill the left/top/right seats for this roster. */
  seats: { left: string; top: string; right: string };
}

export const ROSTERS: Record<RosterId, RosterMeta> = {
  default: {
    id: 'default',
    label: 'Original Crew',
    description: 'Mei, Hana, and Yuki — the cast you know.',
    seats: { left: 'mei', top: 'hana', right: 'yuki' },
  },
  alt: {
    id: 'alt',
    label: 'Night Shift',
    description: 'Riko, Aki, and Sora — a fresh table to read.',
    seats: { left: 'riko', top: 'aki', right: 'sora' },
  },
};

export const DEFAULT_ROSTER: RosterId = 'default';

export function getRoster(id: RosterId | undefined | null): RosterMeta {
  if (!id || !(id in ROSTERS)) return ROSTERS[DEFAULT_ROSTER];
  return ROSTERS[id];
}
