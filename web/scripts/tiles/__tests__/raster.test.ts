import { describe, expect, it } from 'vitest';

import { faceLayout } from '../raster.mjs';
import { FACE_H, FACE_W, PAD_RATIO } from '../config.mjs';

const SOURCE_SIZES: Array<[number, number]> = [
  [300, 420], // 40 of the 42 vendored files
  [296, 420], // 02-green-dragon
  [301, 420],
];

describe('faceLayout', () => {
  it('reproduces the prototype’s 9%-of-width min-fit for the common source size', () => {
    // pad = 384 * 0.09 = 34.56; inner = 314.88 x 442.88; width-constrained.
    expect(faceLayout(300, 420)).toEqual({ width: 315, height: 441, left: 35, top: 36 });
  });

  it.each(SOURCE_SIZES)('keeps %ix%i inside the face', (w, h) => {
    const layout = faceLayout(w, h);
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.top).toBeGreaterThanOrEqual(0);
    expect(layout.left + layout.width).toBeLessThanOrEqual(FACE_W);
    expect(layout.top + layout.height).toBeLessThanOrEqual(FACE_H);
  });

  it.each(SOURCE_SIZES)('centres %ix%i to within a pixel', (w, h) => {
    const layout = faceLayout(w, h);
    expect(Math.abs(layout.left - (FACE_W - layout.width - layout.left))).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.top - (FACE_H - layout.height - layout.top))).toBeLessThanOrEqual(1);
  });

  it.each(SOURCE_SIZES)('preserves the aspect ratio of %ix%i', (w, h) => {
    const layout = faceLayout(w, h);
    expect(layout.width / layout.height).toBeCloseTo(w / h, 2);
  });

  it.each(SOURCE_SIZES)('leaves at least the configured padding around %ix%i', (w, h) => {
    const pad = FACE_W * PAD_RATIO;
    const layout = faceLayout(w, h);
    // One axis touches the padding exactly; neither may breach it.
    expect(layout.left).toBeGreaterThanOrEqual(Math.floor(pad));
    expect(layout.top).toBeGreaterThanOrEqual(Math.floor(pad));
  });

  // The 1.7% spread across the three source widths is inherited from the
  // artwork, not introduced here. Assert it stays small so a future art update
  // that changes a canvas size is visible rather than silent.
  it('varies glyph height by under 2% across the vendored source sizes', () => {
    const heights = SOURCE_SIZES.map(([w, h]) => faceLayout(w, h).height);
    expect((Math.max(...heights) - Math.min(...heights)) / Math.max(...heights)).toBeLessThan(0.02);
  });
});
