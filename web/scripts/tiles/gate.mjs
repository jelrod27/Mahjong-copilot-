/**
 * The legibility gate. Blocking.
 *
 *   npm run tiles:gate
 *
 * At the shipped face resolution a character-suit stroke is roughly one encoder
 * block wide, so compression can silently destroy thin CJK strokes while every
 * average-based quality number still looks fine. This gate renders all 42 faces
 * before and after encoding at the smallest real phone size and diffs them.
 *
 * "Before" is the encoder's own input PNG. "After" is the encoded texture
 * decoded back through `ktx extract --transcode rgba8`, which is the same
 * transcode path a device performs on upload — so the comparison isolates
 * exactly one variable: the compression.
 *
 * Both sides are composited onto an ivory ground before measuring, because a
 * player reads the glyph against the tile, not against transparency, and alpha
 * damage is invisible until something is behind it.
 *
 * Output: a JSON report and a contact sheet, both committed, so a reviewer can
 * read the numbers *and* look at the faces.
 */

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import {
  BUILD_DIR,
  FACE_H,
  FACE_W,
  GATE_DIR,
  GATE_GROUND,
  GATE_H,
  GATE_MAX_SCREEN_ABS_DELTA,
  GATE_MIN_FULL_SSIM,
  GATE_MIN_SCREEN_SSIM,
  OUT_DIR,
  GATE_W,
  WEB_ROOT,
} from './config.mjs';
import { BACK_LAYER, TILE_FACES } from './faces.mjs';
import { maxAbsDelta, meanSsim } from './ssim.mjs';
import { KTX_VERSION, ensureKtx, runKtx } from './toolchain.mjs';

const FACES_KTX2 = path.join(OUT_DIR, 'hk-faces.ktx2');
const FACES_DIR = path.join(BUILD_DIR, 'faces');
const DECODE_DIR = path.join(BUILD_DIR, 'decoded');

/** How much to multiply the difference by in the contact sheet, so it is visible at all. */
const DIFF_GAIN = 8;

/**
 * Composite straight-alpha RGBA over the ivory ground and return Rec.709 luma.
 *
 * @param {Buffer} rgba
 * @returns {Buffer} one byte per pixel
 */
function compositeToLuma(rgba) {
  const out = Buffer.alloc(rgba.length / 4);
  for (let i = 0, o = 0; i < rgba.length; i += 4, o += 1) {
    const a = rgba[i + 3] / 255;
    const r = rgba[i] * a + GATE_GROUND.r * (1 - a);
    const g = rgba[i + 1] * a + GATE_GROUND.g * (1 - a);
    const b = rgba[i + 2] * a + GATE_GROUND.b * (1 - a);
    out[o] = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }
  return out;
}

/**
 * @param {string} file
 * @returns {Promise<{ full: Buffer, screen: Buffer }>} luma at full and on-screen size
 */
async function readFace(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== FACE_W || info.height !== FACE_H) {
    throw new Error(`${path.basename(file)}: expected ${FACE_W}x${FACE_H}, got ${info.width}x${info.height}`);
  }

  const full = compositeToLuma(data);
  // Composite first, then resize: this is the order the GPU produces on screen,
  // and resizing straight alpha before compositing bleeds transparent black
  // into the stroke edges.
  // `toColourspace('b-w')` is required: resizing a raw single-channel buffer
  // otherwise comes back promoted to three identical channels.
  const screen = await sharp(full, { raw: { width: FACE_W, height: FACE_H, channels: 1 } })
    .resize(GATE_W, GATE_H, { kernel: 'lanczos3', fit: 'fill' })
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  if (screen.length !== GATE_W * GATE_H) {
    throw new Error(`gate: expected ${GATE_W * GATE_H} luma bytes, got ${screen.length}`);
  }

  return { full, screen };
}

/** Decode every layer of the encoded face array back to PNG. */
function decodeLayers(bin) {
  rmSync(DECODE_DIR, { recursive: true, force: true });
  mkdirSync(DECODE_DIR, { recursive: true });
  runKtx(bin, [
    'extract',
    '--transcode',
    'rgba8',
    '--level',
    '0',
    '--layer',
    'all',
    FACES_KTX2,
    DECODE_DIR,
  ]);
}

/** @param {number} layer @returns {string} */
function encoderInputFor(layer) {
  const stem = String(layer).padStart(2, '0');
  let entries;
  try {
    entries = readdirSync(FACES_DIR);
  } catch {
    throw new Error(
      `No encoder inputs at ${path.relative(WEB_ROOT, FACES_DIR)}. ` +
        `The gate compares against them, and they are build intermediates rather than committed files — ` +
        `run \`npm run tiles:build\` first.`,
    );
  }
  const match = entries.find((f) => f.startsWith(`${stem}-`));
  if (!match) throw new Error(`No encoder input PNG for layer ${layer} in ${FACES_DIR}`);
  return path.join(FACES_DIR, match);
}

/**
 * Side-by-side strip: before | after | amplified difference.
 *
 * @param {Buffer} pre
 * @param {Buffer} post
 * @returns {Promise<Buffer>} PNG
 */
async function stripFor(pre, post) {
  const diff = Buffer.alloc(pre.length);
  for (let i = 0; i < pre.length; i += 1) {
    diff[i] = Math.min(255, Math.abs(pre[i] - post[i]) * DIFF_GAIN);
  }

  const gap = 4;
  const width = GATE_W * 3 + gap * 2;
  const toPng = (buf) =>
    sharp(buf, { raw: { width: GATE_W, height: GATE_H, channels: 1 } }).png().toBuffer();

  return sharp({
    create: {
      width,
      height: GATE_H,
      channels: 3,
      background: { r: 24, g: 24, b: 28 },
    },
  })
    .composite([
      { input: await toPng(pre), left: 0, top: 0 },
      { input: await toPng(post), left: GATE_W + gap, top: 0 },
      { input: await toPng(diff), left: (GATE_W + gap) * 2, top: 0 },
    ])
    .png()
    .toBuffer();
}

/**
 * @param {Array<{ label: string, strip: Buffer, ssim: number, passed: boolean }>} cells
 */
async function contactSheet(cells) {
  const columns = 6;
  const gap = 4;
  const stripW = GATE_W * 3 + gap * 2;
  const labelH = 16;
  const cellW = stripW + 16;
  const cellH = GATE_H + labelH + 10;
  const rows = Math.ceil(cells.length / columns);
  const width = columns * cellW + 16;
  const height = rows * cellH + 40;

  const composites = [];
  const labels = [];

  cells.forEach((cell, i) => {
    const cx = 16 + (i % columns) * cellW;
    const cy = 34 + Math.floor(i / columns) * cellH;
    composites.push({ input: cell.strip, left: cx, top: cy });
    const colour = cell.passed ? '#8fd39a' : '#ff6b6b';
    labels.push(
      `<text x="${cx}" y="${cy + GATE_H + 12}" font-family="monospace" font-size="10" fill="${colour}">` +
        `${cell.label} — SSIM ${cell.ssim.toFixed(4)}</text>`,
    );
  });

  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<text x="16" y="20" font-family="monospace" font-size="13" fill="#e8e8ea">` +
      `Tile legibility gate — before | after | diff x${DIFF_GAIN}, at ${GATE_W}x${GATE_H} device px` +
      `</text>${labels.join('')}</svg>`,
  );

  return sharp({
    create: { width, height, channels: 3, background: { r: 16, g: 16, b: 20 } },
  })
    .composite([...composites, { input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function main() {
  const bin = await ensureKtx();
  process.stderr.write(`Decoding ${path.relative(WEB_ROOT, FACES_KTX2)} with KTX-Software v${KTX_VERSION}…\n`);
  decodeLayers(bin);

  // The back is measured and shown too, but the acceptance criteria are about
  // the 42 artwork faces, so it is reported separately from the gate verdict.
  const subjects = [
    ...TILE_FACES.map((f) => ({ layer: f.layer, label: f.label, tileKey: f.tileKey, gated: true })),
    { layer: BACK_LAYER, label: 'Tile back', tileKey: 'back', gated: false },
  ];

  const results = [];
  const cells = [];

  for (const subject of subjects) {
    const pre = await readFace(encoderInputFor(subject.layer));
    const post = await readFace(path.join(DECODE_DIR, `output_level0_layer${subject.layer}.png`));

    const screenSsim = meanSsim(pre.screen, post.screen, GATE_W, GATE_H);
    const screenDelta = maxAbsDelta(pre.screen, post.screen);
    const fullSsim = meanSsim(pre.full, post.full, FACE_W, FACE_H);

    const breaches = [];
    if (screenSsim < GATE_MIN_SCREEN_SSIM) {
      breaches.push(`screen SSIM ${screenSsim.toFixed(5)} < ${GATE_MIN_SCREEN_SSIM}`);
    }
    if (screenDelta > GATE_MAX_SCREEN_ABS_DELTA) {
      breaches.push(`screen max delta ${screenDelta} > ${GATE_MAX_SCREEN_ABS_DELTA}`);
    }
    if (fullSsim < GATE_MIN_FULL_SSIM) {
      breaches.push(`full-resolution SSIM ${fullSsim.toFixed(5)} < ${GATE_MIN_FULL_SSIM}`);
    }
    const passed = breaches.length === 0;

    results.push({
      layer: subject.layer,
      tileKey: subject.tileKey,
      label: subject.label,
      gated: subject.gated,
      screenSsim: Number(screenSsim.toFixed(5)),
      screenMaxAbsDelta: screenDelta,
      fullSsim: Number(fullSsim.toFixed(5)),
      passed,
      breaches,
    });

    if (subject.gated) {
      cells.push({ label: subject.label, strip: await stripFor(pre.screen, post.screen), ssim: fullSsim, passed });
    }
  }

  const gated = results.filter((r) => r.gated);
  const failures = gated.filter((r) => !r.passed);
  // Rank by full-resolution SSIM: it is the metric that actually separates
  // encoders, so it identifies the faces closest to trouble.
  const worst = [...gated].sort((a, b) => a.fullSsim - b.fullSsim).slice(0, 5);

  mkdirSync(GATE_DIR, { recursive: true });
  writeFileSync(path.join(GATE_DIR, 'contact-sheet.png'), await contactSheet(cells));

  const report = {
    $comment: 'Generated by scripts/tiles/gate.mjs — do not edit. Regenerate with `npm run tiles:gate`.',
    encoder: { name: 'KTX-Software', version: KTX_VERSION },
    method: {
      screenSize: `${GATE_W}x${GATE_H}`,
      rationale:
        'A hand tile at a 390x844 CSS viewport is ~40x55 CSS px, and devicePixelRatio is clamped to 2.',
      before: 'encoder input PNG',
      after: 'encoded KTX2 decoded via `ktx extract --transcode rgba8`',
      metric: 'mean SSIM and max absolute luma delta, composited over an ivory ground',
    },
    thresholds: {
      minScreenSsim: GATE_MIN_SCREEN_SSIM,
      maxScreenAbsDelta: GATE_MAX_SCREEN_ABS_DELTA,
      minFullSsim: GATE_MIN_FULL_SSIM,
    },
    summary: {
      facesGated: gated.length,
      passed: gated.length - failures.length,
      failed: failures.length,
      minScreenSsim: Number(Math.min(...gated.map((r) => r.screenSsim)).toFixed(5)),
      meanScreenSsim: Number((gated.reduce((s, r) => s + r.screenSsim, 0) / gated.length).toFixed(5)),
      maxScreenAbsDelta: Math.max(...gated.map((r) => r.screenMaxAbsDelta)),
      minFullSsim: Number(Math.min(...gated.map((r) => r.fullSsim)).toFixed(5)),
      hardestFaces: worst.map((r) => `${r.label} (full ${r.fullSsim.toFixed(4)})`),
    },
    faces: results,
  };
  writeFileSync(path.join(GATE_DIR, 'legibility-report.json'), `${JSON.stringify(report, null, 2)}\n`);

  process.stderr.write(
    `\n${gated.length} faces gated (screen ${GATE_W}x${GATE_H} device px, plus full resolution)\n` +
      `  screen min SSIM  ${report.summary.minScreenSsim}   (threshold ${GATE_MIN_SCREEN_SSIM})\n` +
      `  screen max delta ${report.summary.maxScreenAbsDelta}         (threshold ${GATE_MAX_SCREEN_ABS_DELTA})\n` +
      `  full   min SSIM  ${report.summary.minFullSsim}   (threshold ${GATE_MIN_FULL_SSIM})\n` +
      `  hardest: ${report.summary.hardestFaces.join(', ')}\n` +
      `  contact sheet: ${path.relative(WEB_ROOT, path.join(GATE_DIR, 'contact-sheet.png'))}\n`,
  );

  if (failures.length > 0) {
    for (const f of failures) {
      process.stderr.write(`  FAIL ${f.label}: ${f.breaches.join('; ')}\n`);
    }
    throw new Error(
      `Legibility gate failed for ${failures.length} of ${gated.length} faces. ` +
        `Compression has damaged tile art beyond the threshold — this blocks the slice.`,
    );
  }

  process.stderr.write('\nLegibility gate passed.\n');
}

await main();
