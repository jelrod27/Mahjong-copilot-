import { describe, expect, it } from 'vitest';

import { backTileSvg, detailNormalMap } from '../procedural.mjs';
import { DETAIL_N } from '../config.mjs';

describe('detailNormalMap', () => {
  it('is byte-identical across runs, so the artefact is reproducible', () => {
    expect(Buffer.compare(detailNormalMap(64).data, detailNormalMap(64).data)).toBe(0);
  });

  it('produces an opaque RGBA buffer of the requested size', () => {
    const map = detailNormalMap(64);
    expect(map.data).toHaveLength(64 * 64 * 4);
    for (let i = 3; i < map.data.length; i += 4) expect(map.data[i]).toBe(255);
  });

  it('encodes unit normals — every texel decodes to length ~1', () => {
    const { data } = detailNormalMap(64);
    for (let i = 0; i < data.length; i += 4) {
      const x = (data[i] / 255) * 2 - 1;
      const y = (data[i + 1] / 255) * 2 - 1;
      const z = (data[i + 2] / 255) * 2 - 1;
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 1);
    }
  });

  it('points predominantly outward — this is micro-relief, not a cliff face', () => {
    const { data } = detailNormalMap(64);
    for (let i = 2; i < data.length; i += 4) expect(data[i]).toBeGreaterThan(200);
  });

  // A detail normal is tiled across every tile in the scene. If it does not
  // wrap, the seam appears on all 144 of them at once.
  it('tiles seamlessly: opposite edges differ no more than adjacent rows do', () => {
    const size = 64;
    const { data } = detailNormalMap(size);
    const texel = (x: number, y: number) => {
      const i = (y * size + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const maxDelta = (a: number[], b: number[]) =>
      Math.max(...a.map((v, k) => Math.abs(v - b[k])));

    // A seam is visible when the wrap transition is an *outlier* against
    // ordinary neighbouring texels, so compare it to the worst interior step.
    let wrapX = 0;
    let interiorX = 0;
    for (let y = 0; y < size; y += 1) {
      wrapX = Math.max(wrapX, maxDelta(texel(size - 1, y), texel(0, y)));
      for (let x = 1; x < size; x += 1) {
        interiorX = Math.max(interiorX, maxDelta(texel(x - 1, y), texel(x, y)));
      }
    }

    let wrapY = 0;
    let interiorY = 0;
    for (let x = 0; x < size; x += 1) {
      wrapY = Math.max(wrapY, maxDelta(texel(x, size - 1), texel(x, 0)));
      for (let y = 1; y < size; y += 1) {
        interiorY = Math.max(interiorY, maxDelta(texel(x, y - 1), texel(x, y)));
      }
    }

    expect(wrapX).toBeLessThanOrEqual(interiorX);
    expect(wrapY).toBeLessThanOrEqual(interiorY);
  });

  it('refuses a size that would seam rather than emitting a broken texture', () => {
    expect(() => detailNormalMap(100)).toThrow(/seam/);
  });

  it('is configured at a size the octave grids divide', () => {
    expect(() => detailNormalMap(DETAIL_N)).not.toThrow();
  });
});

describe('backTileSvg', () => {
  it('declares the requested pixel size', () => {
    const svg = backTileSvg(384, 512).toString();
    expect(svg).toContain('width="384"');
    expect(svg).toContain('height="512"');
  });

  it('scales hatch density with the face width', () => {
    const strokeOf = (svg: string) => Number(svg.match(/stroke-width="([\d.]+)"/)![1]);
    // The prototype's reference is 10px at 640 wide.
    expect(strokeOf(backTileSvg(640, 854).toString())).toBeCloseTo(10, 3);
    expect(strokeOf(backTileSvg(384, 512).toString())).toBeCloseTo(6, 3);
  });

  it('covers the full face, including the corners the diagonals start outside', () => {
    const svg = backTileSvg(384, 512).toString();
    const starts = [...svg.matchAll(/M(-?[\d.]+) 0/g)].map((m) => Number(m[1]));
    expect(Math.min(...starts)).toBeLessThanOrEqual(-512);
    expect(Math.max(...starts)).toBeGreaterThanOrEqual(384);
  });

  it('is deterministic', () => {
    expect(backTileSvg().toString()).toBe(backTileSvg().toString());
  });
});
