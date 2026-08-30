/**
 * Guards the *committed* artefacts against the pipeline's own definitions.
 *
 * These run in the ordinary unit suite, with no encoder toolchain, so a
 * mismatch between what the pipeline says it produces and what is checked in
 * fails on every PR rather than only in the tiles job.
 */

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import manifest from '../tile-textures.manifest.json';
import report from '../gate/legibility-report.json';
import { textureBytes } from '../budget.mjs';
import {
  DETAIL_N,
  FACE_H,
  FACE_W,
  GATE_H,
  GATE_MAX_SCREEN_ABS_DELTA,
  GATE_MIN_FULL_SSIM,
  GATE_MIN_SCREEN_SSIM,
  GATE_W,
  GPU_BUDGET_BYTES,
  HEIGHT_H,
  HEIGHT_W,
  WEB_ROOT,
} from '../config.mjs';
import { BACK_LAYER, LAYER_COUNT, TILE_FACES } from '../faces.mjs';
import { KTX_VERSION } from '../toolchain.mjs';

describe('committed texture manifest', () => {
  it('was produced by the pinned encoder', () => {
    expect(manifest.encoder.version).toBe(KTX_VERSION);
    expect(manifest.encoder.codec).toBe('UASTC LDR 4x4');
  });

  it('records the CC0 source and all 42 faces', () => {
    expect(manifest.source.licence).toBe('CC0-1.0');
    expect(manifest.source.faces).toBe(42);
  });

  it('lists every face layer plus the back, in layer order', () => {
    expect(manifest.layers).toHaveLength(LAYER_COUNT);
    expect(manifest.layers.map((l) => l.layer)).toEqual(
      Array.from({ length: LAYER_COUNT }, (_, i) => i),
    );
    expect(manifest.layers.slice(0, TILE_FACES.length).map((l) => l.tileKey)).toEqual(
      TILE_FACES.map((f) => f.tileKey),
    );
    expect(manifest.layers[BACK_LAYER].tileKey).toBe('back');
  });

  // The acceptance criterion the whole memory argument turns on.
  it('ships array textures, never an atlas', () => {
    const faces = manifest.textures.find((t) => t.key === 'faces')!;
    const height = manifest.textures.find((t) => t.key === 'height')!;

    expect(faces.isArrayTexture).toBe(true);
    expect(faces.layers).toBe(LAYER_COUNT);
    expect(faces.width).toBe(FACE_W);
    expect(faces.height).toBe(FACE_H);

    expect(height.isArrayTexture).toBe(true);
    expect(height.layers).toBe(TILE_FACES.length);
    expect(height.width).toBe(HEIGHT_W);
    expect(height.height).toBe(HEIGHT_H);
  });

  it('ships the shared detail normal as a single mipped texture', () => {
    const detail = manifest.textures.find((t) => t.key === 'detailNormal')!;
    expect(detail.isArrayTexture).toBe(false);
    expect(detail.width).toBe(DETAIL_N);
    expect(detail.height).toBe(DETAIL_N);
    expect(detail.mipLevels).toBeGreaterThan(1);
  });

  it('mipmaps and supercompresses every texture', () => {
    for (const texture of manifest.textures) {
      expect(texture.mipLevels, texture.key).toBeGreaterThan(1);
      expect(texture.supercompression, texture.key).toBe('KTX_SS_ZSTD');
    }
  });

  it('records GPU bytes that match the accounting for its own dimensions', () => {
    for (const texture of manifest.textures) {
      expect(
        textureBytes({
          width: texture.width,
          height: texture.height,
          layers: texture.layers,
          mipped: true,
        }),
        texture.key,
      ).toBe(texture.gpuBytes);
    }
  });

  it('totals within the 13.5 MiB budget', () => {
    const summed = manifest.textures.reduce((s, t) => s + t.gpuBytes, 0);
    expect(manifest.totals.gpuBytes).toBe(summed);
    expect(manifest.totals.gpuBytes).toBeLessThanOrEqual(GPU_BUDGET_BYTES);
    expect(manifest.totals.budgetBytes).toBe(GPU_BUDGET_BYTES);
    expect(manifest.totals.headroomBytes).toBe(GPU_BUDGET_BYTES - summed);
  });

  it('points at artefacts that are actually checked in, at the recorded size', () => {
    for (const texture of manifest.textures) {
      const file = path.join(WEB_ROOT, texture.file);
      expect(existsSync(file), `missing ${texture.file}`).toBe(true);
      expect(statSync(file).size, texture.file).toBe(texture.fileBytes);
    }
  });
});

describe('committed legibility report', () => {
  it('gated all 42 faces and passed every one', () => {
    expect(report.summary.facesGated).toBe(42);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.passed).toBe(42);
    expect(report.faces.filter((f) => f.gated)).toHaveLength(42);
  });

  it('was measured at the smallest real phone size', () => {
    expect(report.method.screenSize).toBe(`${GATE_W}x${GATE_H}`);
  });

  it('records the thresholds the build is currently configured with', () => {
    expect(report.thresholds.minScreenSsim).toBe(GATE_MIN_SCREEN_SSIM);
    expect(report.thresholds.maxScreenAbsDelta).toBe(GATE_MAX_SCREEN_ABS_DELTA);
    expect(report.thresholds.minFullSsim).toBe(GATE_MIN_FULL_SSIM);
  });

  it('clears every threshold it records', () => {
    for (const face of report.faces.filter((f) => f.gated)) {
      expect(face.screenSsim, face.label).toBeGreaterThanOrEqual(GATE_MIN_SCREEN_SSIM);
      expect(face.screenMaxAbsDelta, face.label).toBeLessThanOrEqual(GATE_MAX_SCREEN_ABS_DELTA);
      expect(face.fullSsim, face.label).toBeGreaterThanOrEqual(GATE_MIN_FULL_SSIM);
      expect(face.passed, face.label).toBe(true);
    }
  });

  it('covers the same faces the manifest ships', () => {
    expect(report.faces.filter((f) => f.gated).map((f) => f.tileKey)).toEqual(
      TILE_FACES.map((f) => f.tileKey),
    );
  });
});
