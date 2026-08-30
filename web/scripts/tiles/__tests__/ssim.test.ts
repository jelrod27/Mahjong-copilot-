import { describe, expect, it } from 'vitest';

import { boxBlur, maxAbsDelta, meanSsim } from '../ssim.mjs';

/** Deterministic pseudo-random grayscale, so a "detailed image" is reproducible. */
function noiseImage(w: number, h: number, seed = 1): Uint8Array {
  const out = new Uint8Array(w * h);
  let s = seed >>> 0;
  for (let i = 0; i < out.length; i += 1) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out[i] = (s >>> 24) & 0xff;
  }
  return out;
}

/** A thin bright stroke on a dark ground — the failure mode the gate exists for. */
function strokeImage(w: number, h: number, thickness = 1): Uint8Array {
  const out = new Uint8Array(w * h).fill(20);
  const centre = Math.floor(w / 2);
  for (let y = 0; y < h; y += 1) {
    for (let t = 0; t < thickness; t += 1) {
      out[y * w + centre + t] = 235;
    }
  }
  return out;
}

const W = 64;
const H = 64;

describe('meanSsim', () => {
  it('scores an image against itself as exactly 1', () => {
    const a = noiseImage(W, H);
    expect(meanSsim(a, a, W, H)).toBeCloseTo(1, 10);
  });

  it('scores a flat image against itself as exactly 1', () => {
    const flat = new Uint8Array(W * H).fill(128);
    expect(meanSsim(flat, flat, W, H)).toBeCloseTo(1, 10);
  });

  it('is symmetric', () => {
    const a = noiseImage(W, H, 1);
    const b = noiseImage(W, H, 2);
    expect(meanSsim(a, b, W, H)).toBeCloseTo(meanSsim(b, a, W, H), 12);
  });

  it('scores unrelated noise far below 1', () => {
    const a = noiseImage(W, H, 1);
    const b = noiseImage(W, H, 2);
    expect(meanSsim(a, b, W, H)).toBeLessThan(0.2);
  });

  it('falls monotonically as an image is degraded further', () => {
    const source = noiseImage(W, H);
    const mild = boxBlur(source, W, H, 1);
    const heavy = boxBlur(source, W, H, 3);

    const mildScore = meanSsim(source, mild, W, H);
    const heavyScore = meanSsim(source, heavy, W, H);

    expect(mildScore).toBeLessThan(1);
    expect(heavyScore).toBeLessThan(mildScore);
  });

  // This is the property the gate depends on: smearing a thin stroke must show
  // up as a large SSIM drop even though the image is overwhelmingly flat and
  // mean error barely moves.
  it('punishes a smeared thin stroke that mean error would forgive', () => {
    const sharp = strokeImage(W, H, 1);
    const smeared = boxBlur(sharp, W, H, 2);

    let totalAbs = 0;
    for (let i = 0; i < sharp.length; i += 1) totalAbs += Math.abs(sharp[i] - smeared[i]);
    const meanAbs = totalAbs / sharp.length;

    expect(meanAbs).toBeLessThan(8); // mean error shrugs
    expect(meanSsim(sharp, smeared, W, H)).toBeLessThan(0.9); // SSIM does not
  });

  it('rejects mismatched buffer lengths rather than scoring garbage', () => {
    expect(() => meanSsim(new Uint8Array(10), new Uint8Array(20), W, H)).toThrow();
  });

  it('rejects images smaller than the 11x11 window', () => {
    expect(() => meanSsim(new Uint8Array(64), new Uint8Array(64), 8, 8)).toThrow();
  });
});

describe('maxAbsDelta', () => {
  it('is 0 for identical images', () => {
    const a = noiseImage(W, H);
    expect(maxAbsDelta(a, a)).toBe(0);
  });

  it('reports the single worst pixel, not an average', () => {
    const a = new Uint8Array(16).fill(100);
    const b = new Uint8Array(16).fill(100);
    b[7] = 160;
    expect(maxAbsDelta(a, b)).toBe(60);
  });

  it('is unsigned', () => {
    const a = new Uint8Array([10]);
    const b = new Uint8Array([200]);
    expect(maxAbsDelta(a, b)).toBe(190);
    expect(maxAbsDelta(b, a)).toBe(190);
  });
});
