import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tileArtSrc } from '../tileArt';
import { tileArtSrc as svgArtSrc, allArtStems } from '@/lib/tileArt';
import { TileFactory } from '@/models/Tile';

/**
 * The prototype's shim derives the PNG path by rewriting the SVG one, which is
 * only safe while the two directories hold the same stems. `lib/tileArt` already
 * pins the SVG side against the map; this pins the raster mirror against it.
 */

// __tests__ -> prototype -> game -> components -> web
const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const PNG_DIR = join(WEB_ROOT, 'public', 'tiles', 'hk-png');

const pngStemsOnDisk = () =>
  readdirSync(PNG_DIR).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, ''));

describe('prototype tile artwork shim', () => {
  it('defaults to the SVG path lib/tileArt already serves', () => {
    for (const tile of TileFactory.getAllTiles()) {
      expect(tileArtSrc(tile)).toBe(svgArtSrc(tile));
    }
  });

  it('mirrors every mapped face into a PNG that exists on disk', () => {
    const onDisk = new Set(pngStemsOnDisk());
    for (const stem of allArtStems()) {
      expect(onDisk.has(stem), `no raster mirror for ${stem}`).toBe(true);
    }
  });

  it('ships no raster file the map does not reference', () => {
    const mapped = new Set(allArtStems());
    for (const stem of pngStemsOnDisk()) {
      expect(mapped.has(stem), `${stem}.png is not referenced by any tile`).toBe(true);
    }
  });

  it('rewrites both the directory and the extension', () => {
    const tile = TileFactory.getAllTiles()[0];
    const png = tileArtSrc(tile, 'png');
    expect(png).toMatch(/^\/tiles\/hk-png\/.+\.png$/);
  });
});
