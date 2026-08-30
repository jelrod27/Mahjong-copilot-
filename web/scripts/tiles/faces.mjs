/**
 * The canonical face list: which artwork becomes which array-texture layer.
 *
 * A Hong Kong set is 144 physical tiles but only 42 distinct faces, plus one
 * back — so the GPU holds 43 layers, not 144. Layer index is the source
 * filename's numeric prefix minus one, which keeps the mapping obvious at the
 * `ktx create` call site: files are passed in layer order and nothing else has
 * to agree about ordering.
 *
 * `tileKey` matches `models/Tile.ts`, so a face can be looked up from an engine
 * tile without a second identity system. `faces.test.ts` asserts the two sets
 * are identical.
 */

import path from 'node:path';

import { SVG_DIR } from './config.mjs';

/**
 * @typedef {object} TileFace
 * @property {number} layer   Array-texture layer index, 0-based.
 * @property {string} tileKey Canonical engine identity (`tileKey` in models/Tile.ts).
 * @property {string} group   Face family, for reporting.
 * @property {string} label   Human-readable name, for the gate contact sheet.
 * @property {string} source  Filename within the vendored CC0 SVG set.
 */

const DRAGONS = [
  ['white', '01-white-dragon', 'White Dragon'],
  ['green', '02-green-dragon', 'Green Dragon'],
  ['red', '03-red-dragon', 'Red Dragon'],
];

const WINDS = [
  ['east', '04-east-wind', 'East Wind'],
  ['south', '05-south-wind', 'South Wind'],
  ['west', '06-west-wind', 'West Wind'],
  ['north', '07-north-wind', 'North Wind'],
];

// Suit runs are contiguous and 1-indexed in the asset set. `slug` is the
// upstream artwork's name for the suit; `group` is the engine's.
const SUITS = [
  { group: 'character', offset: 7, slug: 'characters', label: 'Characters' },
  { group: 'dot', offset: 16, slug: 'circles', label: 'Circles' },
  { group: 'bamboo', offset: 25, slug: 'bamboos', label: 'Bamboo' },
];

const SEASONS = [
  ['Spring', '35-spring'],
  ['Summer', '36-summer'],
  ['Autumn', '37-autumn'],
  ['Winter', '38-winter'],
];

const FLOWERS = [
  ['Plum', '39-plum'],
  ['Orchid', '40-orchid'],
  ['Chrysanthemum', '41-chrysanthemum'],
  ['Bamboo', '42-bamboo'],
];

/** @param {string} source @returns {number} */
function layerOf(source) {
  return Number(source.slice(0, 2)) - 1;
}

/** @type {TileFace[]} */
const faces = [];

for (const [dragon, source, label] of DRAGONS) {
  faces.push({ layer: layerOf(source), tileKey: `dragon_${dragon}`, group: 'dragon', label, source });
}

for (const [wind, source, label] of WINDS) {
  faces.push({ layer: layerOf(source), tileKey: `wind_${wind}`, group: 'wind', label, source });
}

for (const suit of SUITS) {
  for (let n = 1; n <= 9; n += 1) {
    const source = `${String(suit.offset + n).padStart(2, '0')}-${suit.slug}-${n}`;
    faces.push({
      layer: layerOf(source),
      tileKey: `${suit.group}_${n}`,
      group: suit.group,
      label: `${suit.label} ${n}`,
      source,
    });
  }
}

for (const [season, source] of SEASONS) {
  faces.push({ layer: layerOf(source), tileKey: `season_${season}`, group: 'season', label: season, source });
}

for (const [flower, source] of FLOWERS) {
  faces.push({ layer: layerOf(source), tileKey: `flower_${flower}`, group: 'flower', label: flower, source });
}

faces.sort((a, b) => a.layer - b.layer);

/** @type {readonly TileFace[]} */
export const TILE_FACES = Object.freeze(faces);

/** The back is procedural, so it has no source file — it is appended last. */
export const BACK_LAYER = TILE_FACES.length;
export const LAYER_COUNT = TILE_FACES.length + 1;

/** @param {TileFace} face @returns {string} */
export function faceSourcePath(face) {
  return path.join(SVG_DIR, `${face.source}.svg`);
}
