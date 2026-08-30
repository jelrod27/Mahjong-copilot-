/**
 * GPU-resident size of a compressed texture.
 *
 * This is the number the slice's texture budget is spent against, and it is not
 * the file size: a KTX2 file is zstd-supercompressed on disk and expands to its
 * block-compressed form on upload. UASTC transcodes to BC7, ASTC 4x4 or
 * ETC2-RGBA depending on the device, and all three cost 16 bytes per 4x4 block,
 * so one accounting covers every target.
 *
 * Partial blocks are charged whole — a 5x5 texture occupies 2x2 blocks — which
 * is why the small tail of the mip chain does not shrink to nothing.
 */

import { BLOCK_BYTES, BLOCK_DIM } from './config.mjs';

/**
 * Dimensions of every mip level, base first, halving to 1x1.
 *
 * @param {number} width
 * @param {number} height
 * @returns {Array<[number, number]>}
 */
export function mipLevelSizes(width, height) {
  /** @type {Array<[number, number]>} */
  const levels = [[width, height]];
  let w = width;
  let h = height;
  while (w > 1 || h > 1) {
    w = Math.max(1, Math.floor(w / 2));
    h = Math.max(1, Math.floor(h / 2));
    levels.push([w, h]);
  }
  return levels;
}

/**
 * @param {object} spec
 * @param {number} spec.width
 * @param {number} spec.height
 * @param {number} spec.layers
 * @param {boolean} spec.mipped
 * @returns {number} bytes resident on the GPU
 */
export function textureBytes({ width, height, layers, mipped }) {
  const levels = mipped ? mipLevelSizes(width, height) : [[width, height]];
  let perLayer = 0;
  for (const [w, h] of levels) {
    perLayer += Math.ceil(w / BLOCK_DIM) * Math.ceil(h / BLOCK_DIM) * BLOCK_BYTES;
  }
  return perLayer * layers;
}
