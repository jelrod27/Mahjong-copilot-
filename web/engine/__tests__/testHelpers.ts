import { Tile, TileSuit, TileType, WindTile, DragonTile } from '@/models/Tile';
import { Player } from '@/models/GameState';

let idCounter = 0;

/** Create a numbered suit tile */
export function suitTile(suit: TileSuit.BAMBOO | TileSuit.CHARACTER | TileSuit.DOT, num: number, copy = 1): Tile {
  return {
    id: `${suit}_${num}_${copy}`,
    suit,
    type: TileType.SUIT,
    number: num,
    nameEnglish: `${num} ${suit}`,
    nameChinese: '',
    nameJapanese: '',
    assetPath: '',
  };
}

/** Shorthand helpers */
export const dot = (n: number, copy = 1) => suitTile(TileSuit.DOT, n, copy);
export const bam = (n: number, copy = 1) => suitTile(TileSuit.BAMBOO, n, copy);
export const char = (n: number, copy = 1) => suitTile(TileSuit.CHARACTER, n, copy);

/** Create a wind tile */
export function windTile(wind: WindTile, copy = 1): Tile {
  return {
    id: `wind_${wind}_${copy}`,
    suit: TileSuit.WIND,
    type: TileType.HONOR,
    wind,
    nameEnglish: `${wind} Wind`,
    nameChinese: '',
    nameJapanese: '',
    assetPath: '',
  };
}

/** Create a dragon tile */
export function dragonTile(dragon: DragonTile, copy = 1): Tile {
  return {
    id: `dragon_${dragon}_${copy}`,
    suit: TileSuit.DRAGON,
    type: TileType.HONOR,
    dragon,
    nameEnglish: `${dragon} Dragon`,
    nameChinese: '',
    nameJapanese: '',
    assetPath: '',
  };
}

/** Create a flower tile */
export function flowerTile(name: string, index: number): Tile {
  return {
    id: `flower_${index}`,
    suit: TileSuit.FLOWER,
    type: TileType.BONUS,
    flower: name,
    nameEnglish: `${name} Flower`,
    nameChinese: '',
    nameJapanese: '',
    assetPath: '',
  };
}

/** Build a standard winning hand: 4 pungs + 1 pair (all dots) */
export function buildAllPungsHand(): Tile[] {
  return [
    dot(1, 1), dot(1, 2), dot(1, 3), // pung of 1-dot
    dot(2, 1), dot(2, 2), dot(2, 3), // pung of 2-dot
    dot(3, 1), dot(3, 2), dot(3, 3), // pung of 3-dot
    dot(4, 1), dot(4, 2), dot(4, 3), // pung of 4-dot
    dot(5, 1), dot(5, 2),             // pair of 5-dot
  ];
}

/** Build a winning hand with 4 chows + 1 pair */
export function buildChowHand(): Tile[] {
  return [
    dot(1, 1), dot(2, 1), dot(3, 1), // chow 1-2-3
    dot(4, 1), dot(5, 1), dot(6, 1), // chow 4-5-6
    bam(1, 1), bam(2, 1), bam(3, 1), // chow 1-2-3
    bam(4, 1), bam(5, 1), bam(6, 1), // chow 4-5-6
    windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2), // pair
  ];
}

/** Build a thirteen orphans hand */
export function buildThirteenOrphans(): Tile[] {
  return [
    dot(1, 1), dot(9, 1),
    bam(1, 1), bam(9, 1),
    char(1, 1), char(9, 1),
    windTile(WindTile.EAST, 1),
    windTile(WindTile.SOUTH, 1),
    windTile(WindTile.WEST, 1),
    windTile(WindTile.NORTH, 1),
    dragonTile(DragonTile.RED, 1),
    dragonTile(DragonTile.GREEN, 1),
    dragonTile(DragonTile.WHITE, 1),
    dot(1, 2), // duplicate
  ];
}

/** Build a seven pairs hand */
export function buildSevenPairs(): Tile[] {
  return [
    dot(1, 1), dot(1, 2),
    dot(3, 1), dot(3, 2),
    dot(5, 1), dot(5, 2),
    dot(7, 1), dot(7, 2),
    bam(2, 1), bam(2, 2),
    bam(4, 1), bam(4, 2),
    bam(6, 1), bam(6, 2),
  ];
}

/** Build a pure one suit hand (all dots) */
export function buildPureOneSuit(): Tile[] {
  return [
    dot(1, 1), dot(2, 1), dot(3, 1), // chow
    dot(4, 1), dot(5, 1), dot(6, 1), // chow
    dot(7, 1), dot(8, 1), dot(9, 1), // chow
    dot(1, 2), dot(2, 2), dot(3, 2), // chow
    dot(5, 2), dot(5, 3),             // pair
  ];
}

/** Create a test player with the given hand */
export function makePlayer(overrides: Partial<Player> & { hand: Tile[] }): Player {
  return {
    id: overrides.id ?? `player_${++idCounter}`,
    name: overrides.name ?? 'Test Player',
    isAI: overrides.isAI ?? false,
    hand: overrides.hand,
    melds: overrides.melds ?? [],
    score: overrides.score ?? 0,
    seatWind: overrides.seatWind ?? WindTile.EAST,
    isDealer: overrides.isDealer ?? false,
    flowers: overrides.flowers ?? [],
  };
}
