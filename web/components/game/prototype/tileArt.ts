/**
 * PROTOTYPE — throwaway. See PrototypeVariant.tsx for the question this answers.
 *
 * Maps a Tile onto the public-domain HK tile artwork copied into
 * /public/tiles/hk (source: assets/HK-mahjong-tiles-master, CC0).
 *
 * The art is glyph-only on a transparent ground (the drawing occupies
 * 246x315 of a 300x420 canvas), so the palette's faceBg still paints the
 * tile face behind it.
 */

import { Tile, TileSuit } from '@/models/Tile';

const DRAGON_FILE: Record<string, string> = {
  white: '01-white-dragon',
  green: '02-green-dragon',
  red: '03-red-dragon',
};

const WIND_FILE: Record<string, string> = {
  east: '04-east-wind',
  south: '05-south-wind',
  west: '06-west-wind',
  north: '07-north-wind',
};

// Suit runs are contiguous and 1-indexed in the asset set.
const SUIT_BASE: Partial<Record<TileSuit, { offset: number; slug: string }>> = {
  [TileSuit.CHARACTER]: { offset: 7, slug: 'characters' },
  [TileSuit.DOT]: { offset: 16, slug: 'circles' },
  [TileSuit.BAMBOO]: { offset: 25, slug: 'bamboos' },
};

const SEASON_FILE: Record<string, string> = {
  Spring: '35-spring',
  Summer: '36-summer',
  Autumn: '37-autumn',
  Winter: '38-winter',
};

const FLOWER_FILE: Record<string, string> = {
  Plum: '39-plum',
  Orchid: '40-orchid',
  Chrysanthemum: '41-chrysanthemum',
  Bamboo: '42-bamboo',
};

/**
 * Returns a /public URL, or null when no artwork matches (falls back to glyph).
 *
 * `format` matters: the DOM variants want SVG (crisp at any tile size), but the
 * WebGL path wants PNG — Chrome's createImageBitmap refuses SVG blobs, and
 * drawing an <img> SVG mid-rasterisation intermittently wipes the canvas.
 * Raster is what a texture pipeline wants anyway.
 */
export function tileArtSrc(tile: Tile, format: 'svg' | 'png' = 'svg'): string | null {
  let name: string | undefined;

  const suited = SUIT_BASE[tile.suit];
  if (suited && tile.number) {
    name = `${String(suited.offset + tile.number).padStart(2, '0')}-${suited.slug}-${tile.number}`;
  } else if (tile.dragon) {
    name = DRAGON_FILE[tile.dragon];
  } else if (tile.wind) {
    name = WIND_FILE[tile.wind];
  } else if (tile.season) {
    name = SEASON_FILE[tile.season];
  } else if (tile.flower) {
    name = FLOWER_FILE[tile.flower];
  }

  if (!name) return null;
  return format === 'png' ? `/tiles/hk-png/${name}.png` : `/tiles/hk/${name}.svg`;
}
