/**
 * Every knob the tile-texture pipeline turns, in one place.
 *
 * These values are decisions from issue #113 §6 and the #104 research, not
 * preferences. Changing one changes a committed build artefact, so change it
 * deliberately and re-run `npm run tiles:build`.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** web/ */
export const WEB_ROOT = path.resolve(here, '..', '..');
/** repository root */
export const REPO_ROOT = path.resolve(WEB_ROOT, '..');

export const SVG_DIR = path.join(
  REPO_ROOT,
  'assets',
  'HK-mahjong-tiles-master',
  'hongkong',
  'svg',
);

/** Intermediate PNGs. Gitignored via the repo-wide `build/` rule. */
export const BUILD_DIR = path.join(here, 'build');
/** Committed .ktx2 artefacts. */
export const OUT_DIR = path.join(WEB_ROOT, 'public', 'tiles');
/** Committed build record and legibility evidence. */
export const MANIFEST_PATH = path.join(here, 'tile-textures.manifest.json');
export const GATE_DIR = path.join(here, 'gate');

/**
 * Face resolution. #104 §3.4: a hand tile is ~200x280 device px at the desktop
 * worst case, so 384x512 is ~1.4x oversampled — headroom for a future close-up
 * without paying 9x for detail nobody can resolve. Both axes are multiples of
 * four, which KTX2 block encoding requires.
 */
export const FACE_W = 384;
export const FACE_H = 512;

/** Height maps carry relief only — no high-frequency requirement. */
export const HEIGHT_W = 192;
export const HEIGHT_H = 256;

/** One shared tiling bone-grain normal for every tile. */
export const DETAIL_N = 256;

/**
 * Rasterise at 4x and downsample with lanczos3. The prototype's single
 * bilinear tap in `ctx.drawImage` was one of the two bugs that made faces look
 * crunchy; supersampling is the build-time replacement.
 */
export const SUPERSAMPLE = 4;

/**
 * Inset of the artwork inside the face, as a fraction of face *width* on all
 * four sides. Carried over verbatim from the prototype's `pad = W * 0.09` so
 * the 3D composition matches the artwork players already see.
 */
export const PAD_RATIO = 0.09;

/** Tile back, mirroring the DOM board's diagonal hatch. */
export const BACK_BG = '#2a4538';
export const BACK_STROKE = '#1a2b1e';
/** Stroke width and spacing, expressed against a 640px-wide face (the prototype's canvas). */
export const BACK_REF_W = 640;
export const BACK_STROKE_W = 10;
export const BACK_STEP = 20;

/**
 * The smallest real on-screen size, in device pixels: a hand tile at a 390x844
 * CSS viewport is ~40x55 CSS px, and the renderer clamps devicePixelRatio to 2.
 * The legibility gate compares faces at exactly this size because it is where
 * compression damage is either survivable or not.
 */
export const GATE_W = 80;
export const GATE_H = 110;

/**
 * Ivory ground the gate composites faces onto. The shipped textures are glyph
 * on transparency — the ground lives in the material — but a player reads the
 * glyph *against* the face, so the gate must too. Palette-neutral on purpose.
 */
export const GATE_GROUND = { r: 240, g: 234, b: 220 };

/**
 * Gate thresholds, per face. All three must hold; any one failing blocks.
 *
 * SSIM is the structural metric: it responds to strokes smearing or breaking,
 * which mean error and PSNR average away against a mostly-flat face.
 *
 * The non-obvious part is why the gate also measures at full resolution when
 * the acceptance criterion asks for the smallest real phone size. Downsampling
 * to 80x110 is itself a strong low-pass filter, so it hides most of the damage
 * it is being asked to detect. Measured against deliberately degraded encodes
 * of this exact art:
 *
 *   encoding              screen SSIM   screen maxΔ   full SSIM
 *   uastc q3 (shipped)      0.99993          7         0.99752
 *   uastc q1                0.99993          6         0.99735
 *   uastc q0 + RDO λ8       0.99986         14         0.99435
 *   ETC1S default           0.99970         16         0.99553
 *   ETC1S qlevel 40         0.99928         26         0.98725
 *
 * Screen SSIM spans 0.0007 across that whole range and on its own would wave
 * ETC1S through. Screen max-delta and full-resolution SSIM both separate
 * cleanly, so the gate keeps the phone-size judgement the criterion asks for
 * *and* a sensitive regression detector. Every degraded encode above is
 * rejected by at least two of the three thresholds.
 *
 * Regenerate this table with the trial harness described in
 * docs/tile-texture-pipeline.md before moving any threshold.
 */
export const GATE_MIN_SCREEN_SSIM = 0.9998;
export const GATE_MAX_SCREEN_ABS_DELTA = 12;
export const GATE_MIN_FULL_SSIM = 0.996;

/** Encoder settings. UASTC is forced by the art needing alpha — see #113 §6. */
export const ENCODE = {
  faces: {
    format: 'R8G8B8A8_SRGB',
    transferFunction: 'srgb',
    uastcQuality: 3,
    zstd: 18,
  },
  height: {
    format: 'R8G8B8A8_UNORM',
    transferFunction: 'linear',
    uastcQuality: 2,
    zstd: 18,
  },
  detailNormal: {
    format: 'R8G8B8A8_UNORM',
    transferFunction: 'linear',
    uastcQuality: 2,
    zstd: 18,
  },
};

/**
 * GPU-resident budget for the whole set, from #113 §6 ("roughly 13.5 MiB total
 * including height maps and a shared detail normal"). Exceeding it fails the
 * build rather than quietly eating the slice's 20 MB texture budget.
 */
export const GPU_BUDGET_BYTES = Math.round(13.5 * 1024 * 1024);

/** UASTC transcodes to BC7 / ASTC 4x4 / ETC2-RGBA — all 16 bytes per 4x4 block. */
export const BLOCK_BYTES = 16;
export const BLOCK_DIM = 4;
