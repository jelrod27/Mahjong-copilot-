import { describe, expect, it } from 'vitest';

import { mipLevelSizes, textureBytes } from '../budget.mjs';
import {
  DETAIL_N,
  FACE_H,
  FACE_W,
  GPU_BUDGET_BYTES,
  HEIGHT_H,
  HEIGHT_W,
} from '../config.mjs';
import { LAYER_COUNT, TILE_FACES } from '../faces.mjs';

describe('mipLevelSizes', () => {
  it('halves to 1x1 and stops', () => {
    expect(mipLevelSizes(8, 8)).toEqual([
      [8, 8],
      [4, 4],
      [2, 2],
      [1, 1],
    ]);
  });

  it('keeps a collapsed axis at 1 while the other keeps halving', () => {
    expect(mipLevelSizes(1, 4)).toEqual([
      [1, 4],
      [1, 2],
      [1, 1],
    ]);
  });

  it('produces 10 levels for a 384x512 face', () => {
    expect(mipLevelSizes(FACE_W, FACE_H)).toHaveLength(10);
  });
});

describe('textureBytes', () => {
  it('charges whole 4x4 blocks at 16 bytes each for the base level', () => {
    // 384x512 = 96x128 blocks
    expect(textureBytes({ width: 384, height: 512, layers: 1, mipped: false })).toBe(
      96 * 128 * 16,
    );
  });

  it('rounds partial blocks up — a 5x5 texture still costs 2x2 blocks', () => {
    expect(textureBytes({ width: 5, height: 5, layers: 1, mipped: false })).toBe(
      2 * 2 * 16,
    );
  });

  it('adds the full mip chain, including the 1-block tail levels', () => {
    expect(textureBytes({ width: 384, height: 512, layers: 1, mipped: true })).toBe(262192);
  });

  it('scales linearly with layer count', () => {
    const one = textureBytes({ width: 384, height: 512, layers: 1, mipped: true });
    expect(textureBytes({ width: 384, height: 512, layers: 43, mipped: true })).toBe(one * 43);
  });
});

describe('the shipped set', () => {
  const faces = textureBytes({
    width: FACE_W,
    height: FACE_H,
    layers: LAYER_COUNT,
    mipped: true,
  });
  const height = textureBytes({
    width: HEIGHT_W,
    height: HEIGHT_H,
    layers: TILE_FACES.length,
    mipped: true,
  });
  const detail = textureBytes({
    width: DETAIL_N,
    height: DETAIL_N,
    layers: 1,
    mipped: true,
  });

  it('fits the 13.5 MiB budget from #113 §6', () => {
    expect(faces + height + detail).toBeLessThanOrEqual(GPU_BUDGET_BYTES);
  });

  // The headline claim in the parent spec. If a resolution changes, this is the
  // number that has to be restated in the ticket, so assert it rather than
  // discovering the regression in a memory trace.
  //
  // The spec's "8.9x" is the rounded form: exact block accounting on one side
  // and an exact RGBA8 mip chain on the other measures 8.877x.
  it('reduces the 119.5 MiB uncompressed baseline by the stated ~8.9x', () => {
    let perTexture = 0;
    let w = 640;
    let h = 854;
    for (;;) {
      perTexture += w * h * 4; // RGBA8 has no block padding
      if (w === 1 && h === 1) break;
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
    }
    const baseline = perTexture * 43;

    expect(baseline / (1024 * 1024)).toBeCloseTo(119.5, 1);
    expect(baseline / (faces + height + detail)).toBeGreaterThan(8.8);
  });
});
