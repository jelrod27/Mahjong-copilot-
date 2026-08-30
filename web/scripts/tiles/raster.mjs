/**
 * Vector art in, texture-ready pixels out.
 *
 * Two things move to build time here that the prototype did per frame at
 * runtime: the letterbox fit, and a properly filtered downscale. The prototype
 * fitted with `ctx.drawImage`'s single bilinear tap, which was one of the two
 * bugs that made faces look crunchy and prompted an unnecessary 384 -> 640
 * resolution bump. Supersampling and a lanczos3 reduction replace it.
 *
 * The ivory ground, the sheen and the palette tint are deliberately NOT baked
 * in. Faces ship as glyph-on-transparency so one texture set serves every tile
 * palette; the ground lives in the material (#113 §6).
 */

import sharp from 'sharp';

import {
  FACE_H,
  FACE_W,
  HEIGHT_H,
  HEIGHT_W,
  PAD_RATIO,
  SUPERSAMPLE,
} from './config.mjs';

/**
 * Where the artwork sits inside the face, replicating the prototype's
 * `pad = W * 0.09` min-fit so the 3D composition matches the artwork players
 * already see on the DOM board.
 *
 * The vendored SVGs are not all the same width (296, 300 and 301 all occur), so
 * this is computed per file rather than assumed — the same reason the prototype
 * fitted at runtime.
 *
 * @param {number} srcW
 * @param {number} srcH
 * @returns {{ width: number, height: number, left: number, top: number }}
 */
export function faceLayout(srcW, srcH) {
  const pad = FACE_W * PAD_RATIO;
  const scale = Math.min((FACE_W - pad * 2) / srcW, (FACE_H - pad * 2) / srcH);
  const width = Math.round(srcW * scale);
  const height = Math.round(srcH * scale);
  return {
    width,
    height,
    left: Math.round((FACE_W - width) / 2),
    top: Math.round((FACE_H - height) / 2),
  };
}

/**
 * Rasterise one SVG into a FACE_W x FACE_H RGBA face.
 *
 * @param {string|Buffer} svg path or contents
 * @returns {Promise<Buffer>} raw RGBA, FACE_W * FACE_H * 4 bytes
 */
export async function rasteriseFace(svg) {
  const meta = await sharp(svg).metadata();
  if (!meta.width || !meta.height) throw new Error('rasteriseFace: source has no intrinsic size');

  const layout = faceLayout(meta.width, meta.height);

  // Re-render the vector at supersampled resolution rather than upscaling a
  // 72dpi raster: density re-runs the rasteriser, resize would not.
  const density = (72 * layout.width * SUPERSAMPLE) / meta.width;
  const supersampled = await sharp(svg, { density })
    .resize(layout.width * SUPERSAMPLE, layout.height * SUPERSAMPLE, {
      kernel: 'lanczos3',
      fit: 'fill',
    })
    .png()
    .toBuffer();

  return sharp(supersampled)
    .resize(layout.width, layout.height, { kernel: 'lanczos3', fit: 'fill' })
    .extend({
      top: layout.top,
      left: layout.left,
      bottom: FACE_H - layout.height - layout.top,
      right: FACE_W - layout.width - layout.left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer();
}

/**
 * Rasterise an SVG edge to edge at the face size, with no letterbox.
 *
 * The tile back is a full-bleed pattern, not a glyph sitting on a face, so it
 * must not inherit the artwork inset — padding it would leave transparent
 * borders around every face-down tile.
 *
 * @param {Buffer} svg
 * @param {number} [width]
 * @param {number} [height]
 * @returns {Promise<Buffer>} raw RGBA
 */
export async function rasteriseFullBleed(svg, width = FACE_W, height = FACE_H) {
  const meta = await sharp(svg).metadata();
  if (!meta.width) throw new Error('rasteriseFullBleed: source has no intrinsic size');

  const density = (72 * width * SUPERSAMPLE) / meta.width;
  const supersampled = await sharp(svg, { density })
    .resize(width * SUPERSAMPLE, height * SUPERSAMPLE, { kernel: 'lanczos3', fit: 'fill' })
    .png()
    .toBuffer();

  return sharp(supersampled)
    .resize(width, height, { kernel: 'lanczos3', fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();
}

/**
 * Derive the engraving height map from a face's coverage.
 *
 * Alpha is the glyph, so alpha *is* the relief: opaque strokes become high
 * ground, the bare face stays at zero, and the material's negative bumpScale
 * turns "high" into "cut into the tile". A one-pixel blur before the reduction
 * gives the cut a bevel instead of a cliff.
 *
 * @param {Buffer} faceRgba raw RGBA at FACE_W x FACE_H
 * @returns {Promise<Buffer>} raw RGBA at HEIGHT_W x HEIGHT_H
 */
export async function heightFromFace(faceRgba) {
  const alpha = await sharp(faceRgba, {
    raw: { width: FACE_W, height: FACE_H, channels: 4 },
  })
    .extractChannel(3)
    .blur(1)
    .resize(HEIGHT_W, HEIGHT_H, { kernel: 'lanczos3', fit: 'fill' })
    .raw()
    .toBuffer();

  // Replicate to RGB with an opaque alpha: UASTC encodes four channels at
  // 8bpp regardless, so a single-channel input buys nothing on the GPU.
  const out = Buffer.alloc(HEIGHT_W * HEIGHT_H * 4);
  for (let i = 0; i < alpha.length; i += 1) {
    const o = i * 4;
    out[o] = alpha[i];
    out[o + 1] = alpha[i];
    out[o + 2] = alpha[i];
    out[o + 3] = 255;
  }
  return out;
}

/**
 * Write a lossless RGBA PNG for the encoder to consume.
 *
 * `palette: false` is load-bearing, not tidiness. Left to itself the writer
 * quantises these images to a 256-entry palette, which collapsed an
 * anti-aliased character face to 98 RGB and 148 alpha levels and stripped the
 * detail normal's alpha entirely — destroying exactly the thin-stroke gradients
 * this pipeline exists to preserve, *before* the encoder ever saw them.
 *
 * @param {Buffer} rgba
 * @param {number} width
 * @param {number} height
 * @param {string} file
 */
export async function writePng(rgba, width, height, file) {
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, palette: false })
    .toFile(file);
}
