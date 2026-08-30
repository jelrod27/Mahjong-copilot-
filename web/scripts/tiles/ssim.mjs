/**
 * Structural similarity, as specified by Wang et al. (2004), over 8-bit
 * grayscale.
 *
 * The legibility gate needs a metric that notices a thin CJK stroke smearing
 * across an encoder block. Mean error and PSNR do not: a tile face is
 * overwhelmingly flat ground, so averaging drowns the few hundred pixels that
 * carry every bit of the information a player reads. SSIM compares local
 * luminance, contrast and structure inside a sliding Gaussian window, so
 * damage confined to the strokes still moves the score.
 *
 * Standard parameters: 11x11 Gaussian window, sigma 1.5, K1 0.01, K2 0.03,
 * dynamic range 255, evaluated over valid (unpadded) window positions.
 */

const WINDOW = 11;
const SIGMA = 1.5;
const L = 255;
const C1 = (0.01 * L) ** 2;
const C2 = (0.03 * L) ** 2;

/** Separable 1-D Gaussian kernel, normalised. */
const KERNEL = (() => {
  const half = (WINDOW - 1) / 2;
  const k = new Float64Array(WINDOW);
  let sum = 0;
  for (let i = 0; i < WINDOW; i += 1) {
    const x = i - half;
    k[i] = Math.exp(-(x * x) / (2 * SIGMA * SIGMA));
    sum += k[i];
  }
  for (let i = 0; i < WINDOW; i += 1) k[i] /= sum;
  return k;
})();

/**
 * Gaussian-weighted mean of every valid WINDOW x WINDOW position.
 *
 * @param {Float64Array} src
 * @param {number} w
 * @param {number} h
 * @returns {Float64Array} (w - WINDOW + 1) * (h - WINDOW + 1) values
 */
function windowedMean(src, w, h) {
  const outW = w - WINDOW + 1;
  const outH = h - WINDOW + 1;

  // Horizontal pass over full-height rows, then vertical pass over the result.
  const horizontal = new Float64Array(outW * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      let acc = 0;
      for (let i = 0; i < WINDOW; i += 1) acc += KERNEL[i] * src[y * w + x + i];
      horizontal[y * outW + x] = acc;
    }
  }

  const out = new Float64Array(outW * outH);
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      let acc = 0;
      for (let i = 0; i < WINDOW; i += 1) acc += KERNEL[i] * horizontal[(y + i) * outW + x];
      out[y * outW + x] = acc;
    }
  }
  return out;
}

/**
 * Mean SSIM between two equally sized 8-bit grayscale images.
 *
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @param {number} w
 * @param {number} h
 * @returns {number} 1 for identical input, lower as structure diverges
 */
export function meanSsim(a, b, w, h) {
  if (a.length !== b.length) {
    throw new Error(`ssim: buffer length mismatch (${a.length} vs ${b.length})`);
  }
  if (a.length !== w * h) {
    throw new Error(`ssim: buffer of ${a.length} does not match ${w}x${h}`);
  }
  if (w < WINDOW || h < WINDOW) {
    throw new Error(`ssim: ${w}x${h} is smaller than the ${WINDOW}x${WINDOW} window`);
  }

  const af = Float64Array.from(a);
  const bf = Float64Array.from(b);
  const aa = new Float64Array(af.length);
  const bb = new Float64Array(af.length);
  const ab = new Float64Array(af.length);
  for (let i = 0; i < af.length; i += 1) {
    aa[i] = af[i] * af[i];
    bb[i] = bf[i] * bf[i];
    ab[i] = af[i] * bf[i];
  }

  const muA = windowedMean(af, w, h);
  const muB = windowedMean(bf, w, h);
  const mAA = windowedMean(aa, w, h);
  const mBB = windowedMean(bb, w, h);
  const mAB = windowedMean(ab, w, h);

  let total = 0;
  for (let i = 0; i < muA.length; i += 1) {
    const ma = muA[i];
    const mb = muB[i];
    const maSq = ma * ma;
    const mbSq = mb * mb;
    const varA = mAA[i] - maSq;
    const varB = mBB[i] - mbSq;
    const covAB = mAB[i] - ma * mb;

    total +=
      ((2 * ma * mb + C1) * (2 * covAB + C2)) /
      ((maSq + mbSq + C1) * (varA + varB + C2));
  }

  return total / muA.length;
}

/**
 * Largest single-pixel absolute difference. SSIM is an average over windows, so
 * it can stay high while one region is destroyed; this is the companion bound.
 *
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {number}
 */
export function maxAbsDelta(a, b) {
  if (a.length !== b.length) {
    throw new Error(`maxAbsDelta: buffer length mismatch (${a.length} vs ${b.length})`);
  }
  let worst = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = Math.abs(a[i] - b[i]);
    if (d > worst) worst = d;
  }
  return worst;
}

/**
 * Square box blur with edge clamping. Test support only — it gives the SSIM
 * tests a controlled way to degrade an image.
 *
 * @param {Uint8Array} src
 * @param {number} w
 * @param {number} h
 * @param {number} radius
 * @returns {Uint8Array}
 */
export function boxBlur(src, w, h, radius) {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let acc = 0;
      let n = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const sy = Math.min(h - 1, Math.max(0, y + dy));
          const sx = Math.min(w - 1, Math.max(0, x + dx));
          acc += src[sy * w + sx];
          n += 1;
        }
      }
      out[y * w + x] = Math.round(acc / n);
    }
  }
  return out;
}
