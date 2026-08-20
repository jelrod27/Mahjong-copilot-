import { tileKey, type Tile, type TileId } from '@/models/Tile';

/**
 * Tile face artwork.
 *
 * Maps every distinct tile onto the public domain Hong Kong tile set vendored
 * at web/public/tiles/hk. Provenance and licence are in
 * web/public/tiles/LICENSES.md.
 *
 * Each drawing sits on a transparent ground, occupying 246x315 of a 300x420
 * canvas, so the tile face colour still comes from the active cosmetics
 * palette painting behind it. One artwork set covers every palette.
 */

/**
 * Filename stem per tile face, without directory or extension.
 *
 * Keyed by TileId, so this is exhaustive at compile time: adding a tile face
 * to the model without adding its artwork here is a type error, not a tile
 * that renders as an empty square. The upstream numbering is preserved in the
 * stems so a file can be traced back to the source set.
 */
const ART_BY_TILE: Record<TileId, string> = {
  // Dragons
  'dragon_white': '01-white-dragon',
  'dragon_green': '02-green-dragon',
  'dragon_red': '03-red-dragon',

  // Winds
  'wind_east': '04-east-wind',
  'wind_south': '05-south-wind',
  'wind_west': '06-west-wind',
  'wind_north': '07-north-wind',

  // Character 1 to 9, filed under 'characters' upstream
  'character_1': '08-characters-1',
  'character_2': '09-characters-2',
  'character_3': '10-characters-3',
  'character_4': '11-characters-4',
  'character_5': '12-characters-5',
  'character_6': '13-characters-6',
  'character_7': '14-characters-7',
  'character_8': '15-characters-8',
  'character_9': '16-characters-9',

  // Dot 1 to 9, filed under 'circles' upstream
  'dot_1': '17-circles-1',
  'dot_2': '18-circles-2',
  'dot_3': '19-circles-3',
  'dot_4': '20-circles-4',
  'dot_5': '21-circles-5',
  'dot_6': '22-circles-6',
  'dot_7': '23-circles-7',
  'dot_8': '24-circles-8',
  'dot_9': '25-circles-9',

  // Bamboo 1 to 9, filed under 'bamboos' upstream
  'bamboo_1': '26-bamboos-1',
  'bamboo_2': '27-bamboos-2',
  'bamboo_3': '28-bamboos-3',
  'bamboo_4': '29-bamboos-4',
  'bamboo_5': '30-bamboos-5',
  'bamboo_6': '31-bamboos-6',
  'bamboo_7': '32-bamboos-7',
  'bamboo_8': '33-bamboos-8',
  'bamboo_9': '34-bamboos-9',

  // Seasons
  'season_Spring': '35-spring',
  'season_Summer': '36-summer',
  'season_Autumn': '37-autumn',
  'season_Winter': '38-winter',

  // Flowers
  'flower_Plum': '39-plum',
  'flower_Orchid': '40-orchid',
  'flower_Chrysanthemum': '41-chrysanthemum',
  'flower_Bamboo': '42-bamboo',
};

/** Where the artwork for a tile is served from. */
export function tileArtSrc(tile: Tile): string {
  return `/tiles/hk/${ART_BY_TILE[tileKey(tile)]}.svg`;
}

/** Every filename stem the map references. Used to check for orphaned files. */
export function allArtStems(): string[] {
  return Object.values(ART_BY_TILE);
}

/** Every tile face the map covers. */
export function allArtTileIds(): TileId[] {
  return Object.keys(ART_BY_TILE) as TileId[];
}
