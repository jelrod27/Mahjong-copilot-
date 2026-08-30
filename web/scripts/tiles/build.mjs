/**
 * Build the committed tile-texture artefacts.
 *
 *   npm run tiles:build
 *
 * Source art (42 CC0 SVGs) -> supersampled RGBA faces -> three compressed KTX2
 * textures, plus a manifest recording exactly what was produced and what it
 * costs on the GPU.
 *
 * Output is an **array texture, not an atlas**: at equal texel count an atlas
 * costs the same or more memory, and mip bleed between thin-stroke CJK glyphs
 * across 42 faces is not shippable (#113 §6). Array layers cannot bleed into
 * each other by construction.
 *
 * This script introduces no runtime loading. It writes files; nothing in the
 * app reads them yet.
 */

import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  BUILD_DIR,
  DETAIL_N,
  ENCODE,
  FACE_H,
  FACE_W,
  GPU_BUDGET_BYTES,
  HEIGHT_H,
  HEIGHT_W,
  MANIFEST_PATH,
  OUT_DIR,
  SUPERSAMPLE,
  SVG_DIR,
  WEB_ROOT,
} from './config.mjs';
import { textureBytes } from './budget.mjs';
import { BACK_LAYER, LAYER_COUNT, TILE_FACES, faceSourcePath } from './faces.mjs';
import { backTileSvg, detailNormalMap } from './procedural.mjs';
import { heightFromFace, rasteriseFace, rasteriseFullBleed, writePng } from './raster.mjs';
import { KTX_VERSION, ensureKtx, fileSha256, runKtx } from './toolchain.mjs';

const FACES_DIR = path.join(BUILD_DIR, 'faces');
const HEIGHT_DIR = path.join(BUILD_DIR, 'height');

const OUTPUTS = {
  faces: path.join(OUT_DIR, 'hk-faces.ktx2'),
  height: path.join(OUT_DIR, 'hk-height.ktx2'),
  detailNormal: path.join(OUT_DIR, 'hk-detail-normal.ktx2'),
};

/** @param {string} label */
function step(label) {
  process.stderr.write(`${label}\n`);
}

/** Rasterise every face and its height map into BUILD_DIR. */
async function rasteriseAll() {
  rmSync(BUILD_DIR, { recursive: true, force: true });
  mkdirSync(FACES_DIR, { recursive: true });
  mkdirSync(HEIGHT_DIR, { recursive: true });

  /** @type {string[]} */
  const facePngs = [];
  /** @type {string[]} */
  const heightPngs = [];

  for (const face of TILE_FACES) {
    const stem = String(face.layer).padStart(2, '0');
    const rgba = await rasteriseFace(faceSourcePath(face));

    const facePng = path.join(FACES_DIR, `${stem}-${face.source}.png`);
    await writePng(rgba, FACE_W, FACE_H, facePng);
    facePngs[face.layer] = facePng;

    const heightPng = path.join(HEIGHT_DIR, `${stem}-${face.source}.png`);
    await writePng(await heightFromFace(rgba), HEIGHT_W, HEIGHT_H, heightPng);
    heightPngs[face.layer] = heightPng;
  }

  // The back is the final layer of the face array. It is full-bleed rather
  // than inset — it is the tile surface, not artwork on one — and it has no
  // height map, because the hatch is flat and a 43rd relief layer nothing
  // samples is wasted memory.
  const backPng = path.join(FACES_DIR, `${BACK_LAYER}-back.png`);
  await writePng(await rasteriseFullBleed(backTileSvg()), FACE_W, FACE_H, backPng);
  facePngs[BACK_LAYER] = backPng;

  const detail = detailNormalMap(DETAIL_N);
  const detailPng = path.join(BUILD_DIR, 'detail-normal.png');
  await writePng(detail.data, detail.width, detail.height, detailPng);

  if (facePngs.length !== LAYER_COUNT || facePngs.some((f) => !f)) {
    throw new Error(`Expected ${LAYER_COUNT} face layers, got ${facePngs.filter(Boolean).length}`);
  }

  return { facePngs, heightPngs, detailPng };
}

/**
 * @param {string} bin
 * @param {object} spec
 * @param {string[]} spec.inputs in layer order
 * @param {string} spec.output
 * @param {{format: string, transferFunction: string, uastcQuality: number, zstd: number}} spec.encode
 * @param {boolean} spec.array
 */
function encode(bin, { inputs, output, encode: settings, array }) {
  const args = [
    'create',
    '--format',
    settings.format,
    '--assign-tf',
    settings.transferFunction,
    '--encode',
    'uastc',
    '--uastc-quality',
    String(settings.uastcQuality),
    '--generate-mipmap',
    '--zstd',
    String(settings.zstd),
    // Deterministic output: without this the encoder stamps its own writer
    // string, and a committed artefact would churn on every toolchain bump.
    '--testrun',
    '--no-warn-on-color-conversions',
  ];
  if (array) args.push('--layers', String(inputs.length));
  args.push(...inputs, output);

  runKtx(bin, args);
}

/**
 * Read back what was actually written. Trusting the flags we passed would miss
 * exactly the failure this ticket cares about — an atlas, or a layer count that
 * silently disagrees with the face list.
 *
 * @param {string} bin
 * @param {string} file
 */
function inspect(bin, file) {
  const raw = runKtx(bin, ['info', '--format', 'json', file]);
  const info = JSON.parse(raw);
  const header = info.header ?? {};
  return {
    layerCount: Number(header.layerCount ?? 0),
    levelCount: Number(header.levelCount ?? 0),
    faceCount: Number(header.faceCount ?? 0),
    pixelWidth: Number(header.pixelWidth ?? 0),
    pixelHeight: Number(header.pixelHeight ?? 0),
    supercompression: String(header.supercompressionScheme ?? ''),
  };
}

/**
 * @param {string} bin
 * @param {object} texture
 */
function verify(bin, { file, expectLayers, width, height, array }) {
  const info = inspect(bin, file);

  if (info.pixelWidth !== width || info.pixelHeight !== height) {
    throw new Error(
      `${path.basename(file)}: expected ${width}x${height}, encoded ${info.pixelWidth}x${info.pixelHeight}`,
    );
  }
  // layerCount is 0 for a plain 2D texture and >0 for an array texture, which
  // is the distinction the acceptance criteria turn on.
  if (array && info.layerCount !== expectLayers) {
    throw new Error(
      `${path.basename(file)}: expected an array texture of ${expectLayers} layers, got layerCount ${info.layerCount}`,
    );
  }
  if (!array && info.layerCount !== 0) {
    throw new Error(`${path.basename(file)}: expected a non-array texture, got layerCount ${info.layerCount}`);
  }
  if (info.levelCount < 2) {
    throw new Error(`${path.basename(file)}: expected a mip chain, got ${info.levelCount} level(s)`);
  }
  return info;
}

async function main() {
  const bin = await ensureKtx();
  step(`Encoder: KTX-Software v${KTX_VERSION}`);

  step(`Rasterising ${TILE_FACES.length} faces + back at ${FACE_W}x${FACE_H} (${SUPERSAMPLE}x supersampled)…`);
  const { facePngs, heightPngs, detailPng } = await rasteriseAll();

  mkdirSync(OUT_DIR, { recursive: true });

  step('Encoding UASTC array textures…');
  encode(bin, { inputs: facePngs, output: OUTPUTS.faces, encode: ENCODE.faces, array: true });
  encode(bin, { inputs: heightPngs, output: OUTPUTS.height, encode: ENCODE.height, array: true });
  encode(bin, {
    inputs: [detailPng],
    output: OUTPUTS.detailNormal,
    encode: ENCODE.detailNormal,
    array: false,
  });

  step('Verifying encoded output…');
  const textures = [
    {
      key: 'faces',
      file: OUTPUTS.faces,
      width: FACE_W,
      height: FACE_H,
      layers: LAYER_COUNT,
      array: true,
      description: '42 tile faces plus the tile back',
    },
    {
      key: 'height',
      file: OUTPUTS.height,
      width: HEIGHT_W,
      height: HEIGHT_H,
      layers: TILE_FACES.length,
      array: true,
      description: 'engraving relief, one layer per face',
    },
    {
      key: 'detailNormal',
      file: OUTPUTS.detailNormal,
      width: DETAIL_N,
      height: DETAIL_N,
      layers: 1,
      array: false,
      description: 'shared tiling bone-grain normal',
    },
  ].map((texture) => {
    const info = verify(bin, {
      file: texture.file,
      expectLayers: texture.layers,
      width: texture.width,
      height: texture.height,
      array: texture.array,
    });
    return {
      ...texture,
      info,
      fileBytes: statSync(texture.file).size,
      gpuBytes: textureBytes({
        width: texture.width,
        height: texture.height,
        layers: texture.layers,
        mipped: true,
      }),
      sha256: fileSha256(texture.file),
    };
  });

  const gpuTotal = textures.reduce((sum, t) => sum + t.gpuBytes, 0);
  const downloadTotal = textures.reduce((sum, t) => sum + t.fileBytes, 0);

  const manifest = {
    $comment:
      'Generated by scripts/tiles/build.mjs — do not edit. Regenerate with `npm run tiles:build`.',
    generator: 'web/scripts/tiles/build.mjs',
    encoder: { name: 'KTX-Software', version: KTX_VERSION, codec: 'UASTC LDR 4x4' },
    source: {
      path: path.relative(path.dirname(WEB_ROOT), SVG_DIR),
      upstream: 'https://github.com/samoheen/mahjong-tiles',
      licence: 'CC0-1.0',
      faces: TILE_FACES.length,
    },
    textures: textures.map((t) => ({
      key: t.key,
      file: path.relative(WEB_ROOT, t.file),
      description: t.description,
      width: t.width,
      height: t.height,
      layers: t.layers,
      isArrayTexture: t.array,
      mipLevels: t.info.levelCount,
      supercompression: t.info.supercompression,
      fileBytes: t.fileBytes,
      gpuBytes: t.gpuBytes,
      sha256: t.sha256,
    })),
    totals: {
      gpuBytes: gpuTotal,
      gpuMiB: Number((gpuTotal / 1048576).toFixed(3)),
      budgetBytes: GPU_BUDGET_BYTES,
      budgetMiB: Number((GPU_BUDGET_BYTES / 1048576).toFixed(3)),
      headroomBytes: GPU_BUDGET_BYTES - gpuTotal,
      downloadBytes: downloadTotal,
      downloadMiB: Number((downloadTotal / 1048576).toFixed(3)),
    },
    layers: TILE_FACES.map((f) => ({ layer: f.layer, tileKey: f.tileKey, source: `${f.source}.svg` })).concat([
      { layer: BACK_LAYER, tileKey: 'back', source: 'procedural (scripts/tiles/procedural.mjs)' },
    ]),
  };

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  const mib = (b) => `${(b / 1048576).toFixed(3)} MiB`;
  for (const t of textures) {
    step(
      `  ${t.key.padEnd(13)} ${String(t.width).padStart(3)}x${String(t.height).padEnd(3)} ` +
        `x${String(t.layers).padStart(2)}  gpu ${mib(t.gpuBytes).padStart(10)}  file ${mib(t.fileBytes).padStart(10)}`,
    );
  }
  step(`  ${'TOTAL'.padEnd(13)} ${' '.repeat(12)}  gpu ${mib(gpuTotal).padStart(10)}  file ${mib(downloadTotal).padStart(10)}`);
  step(`  budget ${mib(GPU_BUDGET_BYTES)} — headroom ${mib(GPU_BUDGET_BYTES - gpuTotal)}`);

  if (gpuTotal > GPU_BUDGET_BYTES) {
    throw new Error(
      `GPU texture payload ${mib(gpuTotal)} exceeds the ${mib(GPU_BUDGET_BYTES)} budget from #113 §6.`,
    );
  }

  step(`Wrote ${path.relative(WEB_ROOT, MANIFEST_PATH)}`);
  step('Now run `npm run tiles:gate` to check legibility.');
}

await main();
