/**
 * PROTOTYPE — throwaway.
 *
 * Procedural surfaces for the table. Canvas in, THREE.Texture out; no scene
 * knowledge, no meshes.
 *
 * The brief was "more detail and character, but do not let the table become the
 * focal point", and those pull in opposite directions unless the detail is put
 * in the right register. So everything here is deliberately *fine* and *low
 * contrast*: nap you read as texture rather than as pattern, a table marking
 * only a few percent off the felt colour, and an edge falloff that darkens the
 * board outward. That last one is the load-bearing trick — it adds depth while
 * actively pushing attention back to the centre and the player's hand, so it
 * buys detail without buying dominance.
 *
 * Two texture scales, because they do different jobs:
 *   - the felt MAP is table-scale and does not repeat: it carries the falloff
 *     and the centre marking, which are features of the table, not of the cloth.
 *   - the nap NORMAL/ROUGHNESS tile many times over: they are features of the
 *     cloth, and at table scale a single map would be far too coarse to read as
 *     fibre.
 */

import * as THREE from 'three';

/**
 * Deterministic value noise. Not Perlin — this is smoothed integer-lattice
 * noise, which is all that is needed for cloth fibre and wood grain, and it
 * avoids pulling in a dependency for eight lines of hashing.
 */
function hash2(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 1442695040888963407;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

/** Fractal sum. `stretch` biases the lattice so grain runs along one axis. */
function fbm(x: number, y: number, octaves: number, seed: number, stretch = 1): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq * stretch, y * freq, seed + o * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/**
 * Hex -> sRGB bytes, straight.
 *
 * Deliberately NOT via THREE.Color: with colour management on, `new
 * THREE.Color('#1d5140')` converts sRGB to linear, so its .r/.g/.b are linear
 * values. Writing those into a canvas — which is sRGB — turns the jade felt into
 * RGB(3,22,13), i.e. near-black. Every texture here is authored in canvas space,
 * so it stays in canvas space.
 */
function srgbBytes(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function makeCanvas(size: number, height = size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d')! };
}

function asTexture(canvas: HTMLCanvasElement, repeat: number, srgb: boolean): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/**
 * A tangent-space normal map derived from a height field by central
 * differences. `strength` is in height units per texel; keeping it low is the
 * difference between cloth and stucco.
 */
function heightToNormal(height: Float32Array, size: number, strength: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      // Normalise (-dx, -dy, 1). +Y up is the OpenGL convention three expects.
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len) * 0.5 * 255 + 127.5;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export interface FeltTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/**
 * The felt: colour at table scale, fibre at cloth scale.
 *
 * `feltHex` keeps the existing jade the board already ships — the brief was
 * that the board is liked and merely thin, so the colour does not move.
 */
export function makeFeltTextures(feltHex = '#1d5140'): FeltTextures {
  const MAP = 1024;
  const NAP = 512;
  const NAP_REPEAT = 11;

  // --- Table-scale colour map: mottling, centre marking, edge falloff.
  const { canvas: mapCanvas, ctx } = makeCanvas(MAP);
  const [br, bg, bb] = srgbBytes(feltHex);

  const img = ctx.createImageData(MAP, MAP);
  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      // Broad, very low amplitude mottling so the cloth is not one flat value.
      const mottle = (fbm((x / MAP) * 6, (y / MAP) * 6, 4, 17) - 0.5) * 18;
      const i = (y * MAP + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, br + mottle));
      img.data[i + 1] = Math.max(0, Math.min(255, bg + mottle));
      img.data[i + 2] = Math.max(0, Math.min(255, bb + mottle));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // --- Centre marking. Pure geometry rather than type: a compass rose needs no
  // font, and canvas cannot be relied on to have a CJK face for 東南西北.
  // Contrast is a few percent by design — this sits UNDER the tiles and must
  // never compete with them.
  const c = MAP / 2;
  ctx.save();
  ctx.translate(c, c);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = MAP * 0.0035;
  for (const r of [0.115, 0.128, 0.20]) {
    ctx.beginPath();
    ctx.arc(0, 0, MAP * r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Four points, one per wind.
  ctx.fillStyle = 'rgba(255,255,255,0.038)';
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(0, -MAP * 0.185);
    ctx.lineTo(MAP * 0.030, -MAP * 0.132);
    ctx.lineTo(0, -MAP * 0.148);
    ctx.lineTo(-MAP * 0.030, -MAP * 0.132);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // --- Edge falloff. Darkens outward so the table recedes and the eye is held
  // at the centre and the near hand. This is what keeps the added detail from
  // turning the board into the focal point.
  const vignette = ctx.createRadialGradient(c, c, MAP * 0.20, c, c, MAP * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.65, 'rgba(0,0,0,0.06)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.20)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, MAP, MAP);

  // --- Cloth-scale fibre, shared by the normal and roughness maps so the two
  // agree: a raised fibre should also catch light differently.
  const height = new Float32Array(NAP * NAP);
  for (let y = 0; y < NAP; y++) {
    for (let x = 0; x < NAP; x++) {
      // Two crossed stretched octaves read as a weave rather than as sand.
      const warp = fbm((x / NAP) * 90, (y / NAP) * 90, 2, 5, 0.25);
      const weft = fbm((x / NAP) * 90, (y / NAP) * 90, 2, 91, 4);
      height[y * NAP + x] = (warp + weft) * 0.5;
    }
  }

  const { canvas: roughCanvas, ctx: rctx } = makeCanvas(NAP);
  const rimg = rctx.createImageData(NAP, NAP);
  for (let i = 0; i < NAP * NAP; i++) {
    // Felt is rough everywhere; the fibre only modulates it slightly.
    const v = (0.9 + (height[i] - 0.5) * 0.16) * 255;
    rimg.data[i * 4] = v;
    rimg.data[i * 4 + 1] = v;
    rimg.data[i * 4 + 2] = v;
    rimg.data[i * 4 + 3] = 255;
  }
  rctx.putImageData(rimg, 0, 0);

  return {
    map: asTexture(mapCanvas, 1, true),
    normalMap: asTexture(heightToNormal(height, NAP, 2.2), NAP_REPEAT, false),
    roughnessMap: asTexture(roughCanvas, NAP_REPEAT, false),
  };
}

export interface WoodTextures {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/**
 * Rim timber. Grain runs along one axis via a heavily stretched noise lattice,
 * then a ring function turns the smooth gradient into growth rings.
 *
 * Kept dark and low-specular on purpose. A bright rim would frame the board and
 * pull the eye straight to the edge, which is the opposite of what is wanted.
 */
export function makeWoodTextures(): WoodTextures {
  const SIZE = 512;
  const { canvas, ctx } = makeCanvas(SIZE);
  const img = ctx.createImageData(SIZE, SIZE);

  const [dr, dg, db] = srgbBytes('#3a2415');
  const [lr, lg, lb] = srgbBytes('#5c3a22');

  const rough = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = fbm((x / SIZE) * 3, (y / SIZE) * 3, 5, 33, 0.12);
      // Rings: fract of a scaled noise field, softened.
      const rings = Math.abs(Math.sin((n * 14 + (x / SIZE) * 1.5) * Math.PI));
      const t = Math.pow(rings, 1.6) * 0.75 + n * 0.25;
      const i = (y * SIZE + x) * 4;
      img.data[i] = dr + (lr - dr) * t;
      img.data[i + 1] = dg + (lg - dg) * t;
      img.data[i + 2] = db + (lb - db) * t;
      img.data[i + 3] = 255;
      // Late wood (the dark rings) is denser and reads slightly glossier.
      rough[y * SIZE + x] = 0.72 - t * 0.14;
    }
  }
  ctx.putImageData(img, 0, 0);

  const { canvas: roughCanvas, ctx: rctx } = makeCanvas(SIZE);
  const rimg = rctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const v = rough[i] * 255;
    rimg.data[i * 4] = v;
    rimg.data[i * 4 + 1] = v;
    rimg.data[i * 4 + 2] = v;
    rimg.data[i * 4 + 3] = 255;
  }
  rctx.putImageData(rimg, 0, 0);

  return {
    map: asTexture(canvas, 3, true),
    roughnessMap: asTexture(roughCanvas, 3, false),
  };
}

/**
 * The rim as a bevelled frame rather than a slab.
 *
 * The board previously drew the rim as a box slightly larger than the felt and
 * hid it underneath, so the only thing visible was a flat lip with a hard edge.
 * An extruded frame with a bevel gives the timber an actual chamfer that runs
 * light along its whole length — a chamfer and not a raised lip, because a
 * raised lip would read as a bright frame around the board.
 */
export function makeRimGeometry(outer: number, inner: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const o = outer / 2;
  shape.moveTo(-o, -o);
  shape.lineTo(o, -o);
  shape.lineTo(o, o);
  shape.lineTo(-o, o);
  shape.closePath();

  const hole = new THREE.Path();
  const i = inner / 2;
  hole.moveTo(-i, -i);
  hole.lineTo(-i, i);
  hole.lineTo(i, i);
  hole.lineTo(i, -i);
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.09,
    bevelSegments: 3,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);

  // Bevelling adds to the extrusion on both ends, so the exact height depends on
  // the bevel settings. Normalising the top face to y=0 here means the caller
  // positions the rim by where its surface should sit, not by arithmetic that
  // silently breaks the moment a bevel value changes.
  geo.computeBoundingBox();
  geo.translate(0, -geo.boundingBox!.max.y, 0);
  return geo;
}
