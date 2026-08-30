import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { TileFactory, tileKey } from '@/models/Tile';
import { BACK_LAYER, LAYER_COUNT, TILE_FACES, faceSourcePath } from '../faces.mjs';
import { SVG_DIR } from '../config.mjs';

describe('tile face manifest', () => {
  it('covers all 42 distinct Hong Kong faces', () => {
    expect(TILE_FACES).toHaveLength(42);
  });

  it('reserves one further layer for the tile back', () => {
    expect(BACK_LAYER).toBe(42);
    expect(LAYER_COUNT).toBe(43);
  });

  it('assigns contiguous layer indices in asset-file order', () => {
    expect(TILE_FACES.map((f) => f.layer)).toEqual(
      Array.from({ length: 42 }, (_, i) => i),
    );
  });

  it('derives the layer index from the source filename prefix', () => {
    for (const face of TILE_FACES) {
      const prefix = Number(face.source.slice(0, 2));
      expect(prefix).toBe(face.layer + 1);
    }
  });

  // The anti-drift assertion: the texture set is pinned to the engine's tile
  // set, so adding or renaming a tile breaks this test rather than silently
  // shipping a face nobody can index.
  it('maps exactly onto the engine’s distinct tile keys', () => {
    const engineKeys = new Set(TileFactory.getAllTiles().map(tileKey));
    const faceKeys = new Set(TILE_FACES.map((f) => f.tileKey));

    expect(engineKeys.size).toBe(42);
    expect([...faceKeys].sort()).toEqual([...engineKeys].sort());
  });

  it('names every group at its expected count', () => {
    const counts: Record<string, number> = {};
    for (const face of TILE_FACES) counts[face.group] = (counts[face.group] ?? 0) + 1;

    expect(counts).toEqual({
      dragon: 3,
      wind: 4,
      character: 9,
      dot: 9,
      bamboo: 9,
      season: 4,
      flower: 4,
    });
  });

  it('includes the bordered-blank white dragon, the flowers and the seasons', () => {
    const keys = TILE_FACES.map((f) => f.tileKey);
    expect(keys).toContain('dragon_white');
    for (const f of ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo']) {
      expect(keys).toContain(`flower_${f}`);
    }
    for (const s of ['Spring', 'Summer', 'Autumn', 'Winter']) {
      expect(keys).toContain(`season_${s}`);
    }
  });

  it('points every face at a vendored CC0 source file that exists', () => {
    for (const face of TILE_FACES) {
      expect(existsSync(faceSourcePath(face)), `missing ${face.source}`).toBe(true);
      expect(path.dirname(faceSourcePath(face))).toBe(SVG_DIR);
    }
  });
});
