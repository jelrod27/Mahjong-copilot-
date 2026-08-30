/**
 * The two textures with no artwork behind them: the tile back and the shared
 * detail normal.
 *
 * Both are generated rather than authored so they carry no licensing question
 * and cost nothing to regenerate at a different resolution.
 */

import {
  BACK_BG,
  BACK_REF_W,
  BACK_STEP,
  BACK_STROKE,
  BACK_STROKE_W,
  DETAIL_N,
  FACE_H,
  FACE_W,
} from './config.mjs';

/**
 * The tile back, as SVG so it goes through the same rasteriser as the faces.
 * Mirrors the DOM board's diagonal hatch, scaled from the prototype's 640px
 * reference width so the pattern reads at the same density.
 *
 * @param {number} [width]
 * @param {number} [height]
 * @returns {Buffer}
 */
export function backTileSvg(width = FACE_W, height = FACE_H) {
  const scale = width / BACK_REF_W;
  const strokeWidth = BACK_STROKE_W * scale;
  const step = BACK_STEP * scale;

  const lines = [];
  for (let x = -height; x < width + height; x += step) {
    lines.push(`<path d="M${x.toFixed(3)} 0L${(x + height).toFixed(3)} ${height}"/>`);
  }

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<rect width="${width}" height="${height}" fill="${BACK_BG}"/>` +
      `<g stroke="${BACK_STROKE}" stroke-width="${strokeWidth.toFixed(3)}" fill="none">${lines.join('')}</g>` +
      `</svg>`,
  );
}

/** Deterministic LCG — the detail normal must be byte-identical on every run. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/**
 * Value noise on a periodic grid, so it tiles exactly when `size` is a multiple
 * of both grid dimensions.
 *
 * @param {number} size
 * @param {number} gridX
 * @param {number} gridY
 * @param {number} seed
 * @returns {Float64Array} size * size values in [0, 1)
 */
function periodicValueNoise(size, gridX, gridY, seed) {
  const random = lcg(seed);
  const grid = new Float64Array(gridX * gridY);
  for (let i = 0; i < grid.length; i += 1) grid[i] = random();

  const out = new Float64Array(size * size);
  for (let y = 0; y < size; y += 1) {
    const fy = (y / size) * gridY;
    const y0 = Math.floor(fy) % gridY;
    const y1 = (y0 + 1) % gridY;
    const ty = smoothstep(fy - Math.floor(fy));

    for (let x = 0; x < size; x += 1) {
      const fx = (x / size) * gridX;
      const x0 = Math.floor(fx) % gridX;
      const x1 = (x0 + 1) % gridX;
      const tx = smoothstep(fx - Math.floor(fx));

      const top = grid[y0 * gridX + x0] * (1 - tx) + grid[y0 * gridX + x1] * tx;
      const bottom = grid[y1 * gridX + x0] * (1 - tx) + grid[y1 * gridX + x1] * tx;
      out[y * size + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return out;
}

/**
 * A tiling bone-grain normal map, shared by every tile.
 *
 * The grain runs along the tile's length: each octave's grid is dense across X
 * and sparse down Y, which stretches features vertically into streaks. Output
 * is the usual tangent-space encoding, RGB = normal * 0.5 + 0.5, opaque.
 *
 * @param {number} [size]
 * @param {number} [strength] height scale; small, because this is micro-relief
 * @returns {{ data: Buffer, width: number, height: number, channels: 4 }}
 */
export function detailNormalMap(size = DETAIL_N, strength = 1.6) {
  // Grids are fractions of `size` so they always divide it exactly, which is
  // what makes the result seamless, and so the grain looks the same whatever
  // resolution it is generated at. X is 8x denser than Y — that ratio is the
  // grain.
  const octaves = [
    { divX: 8, divY: 64, amplitude: 1.0, seed: 0x5eed_1a7e },
    { divX: 4, divY: 32, amplitude: 0.5, seed: 0x1337_c0de },
    { divX: 2, divY: 16, amplitude: 0.25, seed: 0x0bad_f00d },
  ].map((o) => ({
    gridX: Math.max(1, Math.floor(size / o.divX)),
    gridY: Math.max(1, Math.floor(size / o.divY)),
    amplitude: o.amplitude,
    seed: o.seed,
  }));

  const heightField = new Float64Array(size * size);
  let totalAmplitude = 0;
  for (const octave of octaves) {
    if (size % octave.gridX !== 0 || size % octave.gridY !== 0) {
      throw new Error(
        `detailNormalMap: size ${size} is not a multiple of grid ${octave.gridX}x${octave.gridY}; the result would seam`,
      );
    }
    const noise = periodicValueNoise(size, octave.gridX, octave.gridY, octave.seed);
    for (let i = 0; i < heightField.length; i += 1) heightField[i] += noise[i] * octave.amplitude;
    totalAmplitude += octave.amplitude;
  }
  for (let i = 0; i < heightField.length; i += 1) heightField[i] /= totalAmplitude;

  const data = Buffer.alloc(size * size * 4);
  const at = (x, y) => heightField[((y + size) % size) * size + ((x + size) % size)];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Central differences with wraparound keep the normals seamless too.
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;

      const length = Math.hypot(-dx, -dy, 1);
      const i = (y * size + x) * 4;
      data[i] = Math.round((((-dx / length) + 1) / 2) * 255);
      data[i + 1] = Math.round((((-dy / length) + 1) / 2) * 255);
      data[i + 2] = Math.round(((1 / length + 1) / 2) * 255);
      data[i + 3] = 255;
    }
  }

  return { data, width: size, height: size, channels: 4 };
}
