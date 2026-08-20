/**
 * PROTOTYPE — throwaway. See PrototypeVariant.tsx for the question this answers.
 *
 * Format shim over `lib/tileArt`. The prototype used to carry its own copy of
 * the Tile -> artwork mapping; main now has a better one — a
 * `Record<TileId, string>` that is exhaustive at compile time and tested
 * against the filesystem — so this delegates rather than duplicating it. Two
 * mappings of the same 42 faces would silently drift the moment either side
 * gained a tile.
 *
 * All this adds is the format: the DOM variants want SVG (crisp at any tile
 * size), but the WebGL path wants PNG — Chrome's createImageBitmap refuses SVG
 * blobs, and drawing an <img> SVG mid-rasterisation intermittently wipes the
 * canvas. Raster is what a texture pipeline wants anyway.
 *
 * The two directories are verified to hold the same stems by the test beside
 * this file, so rewriting the extension cannot point at a missing asset.
 */

import { tileArtSrc as svgArtSrc } from '@/lib/tileArt';
import type { Tile } from '@/models/Tile';

export function tileArtSrc(tile: Tile, format: 'svg' | 'png' = 'svg'): string {
  const svg = svgArtSrc(tile);
  if (format === 'svg') return svg;
  return svg.replace('/tiles/hk/', '/tiles/hk-png/').replace(/\.svg$/, '.png');
}
