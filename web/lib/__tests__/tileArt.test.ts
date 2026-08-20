import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tileArtSrc, allArtStems, allArtTileIds } from '../tileArt';
import { TileFactory, tileKey } from '@/models/Tile';

/**
 * The map is exhaustive over TileId at compile time, so a missing face is a
 * type error rather than a test failure. What the type cannot see is the
 * filesystem: it will happily accept a stem naming a file that does not exist,
 * or leave a shipped file unreferenced. Both directions are checked here.
 */

const ART_DIR = join(dirname(dirname(dirname(fileURLToPath(import.meta.url)))), 'public', 'tiles', 'hk');

const filesOnDisk = () =>
  readdirSync(ART_DIR).filter((f) => f.endsWith('.svg')).map((f) => f.replace(/\.svg$/, ''));

describe('tile artwork map', () => {
  it('covers every distinct tile the factory can build', () => {
    // 27 suited, 4 winds, 3 dragons, 4 flowers, 4 seasons.
    const faces = new Set(TileFactory.getAllTiles().map((t) => tileKey(t)));
    expect(faces.size).toBe(42);
    for (const face of faces) {
      expect(allArtTileIds(), `no artwork mapped for ${face}`).toContain(face);
    }
  });

  it('resolves every tile in a full wall to a served path', () => {
    for (const tile of TileFactory.getAllTiles()) {
      const src = tileArtSrc(tile);
      expect(src, `no art for ${tile.id}`).toMatch(/^\/tiles\/hk\/[\w-]+\.svg$/);
    }
  });

  it('names only files that exist', () => {
    for (const stem of allArtStems()) {
      expect(existsSync(join(ART_DIR, `${stem}.svg`)), `${stem}.svg is mapped but not shipped`).toBe(true);
    }
  });

  it('ships no artwork the map never references', () => {
    // An orphan is dead weight in the bundle and a sign the map drifted from
    // the asset set, which is the direction the type system cannot catch.
    const referenced = new Set(allArtStems());
    for (const file of filesOnDisk()) {
      expect(referenced.has(file), `${file}.svg is shipped but never referenced`).toBe(true);
    }
  });

  it('maps each face to a distinct file', () => {
    const stems = allArtStems();
    expect(new Set(stems).size, 'two faces share one drawing').toBe(stems.length);
  });

  it('keeps the licence record alongside the assets', () => {
    // The assets are served, so their licence has to travel with them rather
    // than living only in the vendored upstream copy.
    const licence = join(dirname(ART_DIR), 'LICENSES.md');
    expect(existsSync(licence), 'web/public/tiles/LICENSES.md is missing').toBe(true);
  });
});
