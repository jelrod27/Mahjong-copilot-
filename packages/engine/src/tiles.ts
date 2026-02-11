import { TileId, TileType, TileInfo, Suit, HandArray } from './types.js';

// ============================================================================
// Constants
// ============================================================================

/** Total number of unique tile types */
export const TILE_TYPE_COUNT = 34;

/** Total number of tiles in a complete set */
export const TOTAL_TILES = 136;

/** Copies per tile type */
export const COPIES_PER_TYPE = 4;

// TileType ranges
const MAN_START = 0;
const MAN_END = 8;
const PIN_START = 9;
const PIN_END = 17;
const SOU_START = 18;
const SOU_END = 26;
const WIND_START = 27;
const WIND_END = 30;
const DRAGON_START = 31;
const DRAGON_END = 33;

// Red dora: copy index 0 of the 5 of each suit
const RED_DORA_IDS: ReadonlySet<TileId> = new Set([
  4 * 4 + 0,   // 5m copy 0 = TileId 16
  13 * 4 + 0,  // 5p copy 0 = TileId 52
  22 * 4 + 0,  // 5s copy 0 = TileId 88
]);

// Display names for winds and dragons
const WIND_NAMES: readonly string[] = ['East', 'South', 'West', 'North'];
const DRAGON_NAMES: readonly string[] = ['Haku', 'Hatsu', 'Chun'];
const SUIT_ABBREVIATIONS: Record<string, string> = {
  [Suit.Man]: 'm',
  [Suit.Pin]: 'p',
  [Suit.Sou]: 's',
};

// The 13 terminal+honor tile types (for kokushi)
export const TERMINAL_HONOR_TYPES: readonly TileType[] = [
  0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
];

// ============================================================================
// Core Conversion Functions
// ============================================================================

/** Convert a TileId (0-135) to its TileType (0-33). */
export function tileIdToType(id: TileId): TileType {
  return Math.floor(id / COPIES_PER_TYPE);
}

/** Get the copy index (0-3) of a specific tile. */
export function tileIdToCopy(id: TileId): number {
  return id % COPIES_PER_TYPE;
}

/** Get all 4 TileIds for a given TileType. */
export function tileTypeToIds(type: TileType): TileId[] {
  const base = type * COPIES_PER_TYPE;
  return [base, base + 1, base + 2, base + 3];
}

// ============================================================================
// Tile Property Functions
// ============================================================================

/** Get the suit of a tile type. */
export function getTileSuit(type: TileType): Suit {
  if (type >= MAN_START && type <= MAN_END) return Suit.Man;
  if (type >= PIN_START && type <= PIN_END) return Suit.Pin;
  if (type >= SOU_START && type <= SOU_END) return Suit.Sou;
  if (type >= WIND_START && type <= WIND_END) return Suit.Wind;
  if (type >= DRAGON_START && type <= DRAGON_END) return Suit.Dragon;
  throw new RangeError(`Invalid TileType: ${type}`);
}

/** Get the value of a tile type (1-9 for suited, 1-4 for winds, 1-3 for dragons). */
export function getTileValue(type: TileType): number {
  if (type <= SOU_END) return (type % 9) + 1;
  if (type <= WIND_END) return type - WIND_START + 1;
  if (type <= DRAGON_END) return type - DRAGON_START + 1;
  throw new RangeError(`Invalid TileType: ${type}`);
}

/** Get the display string for a tile type. */
export function getTileDisplay(type: TileType): string {
  const suit = getTileSuit(type);
  if (suit === Suit.Wind) return WIND_NAMES[type - WIND_START]!;
  if (suit === Suit.Dragon) return DRAGON_NAMES[type - DRAGON_START]!;
  return `${getTileValue(type)}${SUIT_ABBREVIATIONS[suit]}`;
}

/** Check if a tile type is a terminal (1 or 9 of a suited tile). */
export function isTerminal(type: TileType): boolean {
  if (type > SOU_END) return false;
  const value = (type % 9) + 1;
  return value === 1 || value === 9;
}

/** Check if a tile type is an honor (wind or dragon). */
export function isHonor(type: TileType): boolean {
  return type >= WIND_START && type <= DRAGON_END;
}

/** Check if a tile type is suited (man, pin, or sou). */
export function isSuited(type: TileType): boolean {
  return type >= MAN_START && type <= SOU_END;
}

/** Check if a tile type is a terminal or honor. */
export function isTerminalOrHonor(type: TileType): boolean {
  return isTerminal(type) || isHonor(type);
}

/** Check if a tile type is a simple (2-8 of any suit). */
export function isSimple(type: TileType): boolean {
  return isSuited(type) && !isTerminal(type);
}

/** Check if a specific TileId is a red dora (default: copy 0 of 5m/5p/5s). */
export function isRedDora(id: TileId): boolean {
  return RED_DORA_IDS.has(id);
}

/** Get the suit index (0=man, 1=pin, 2=sou) for suited tiles. Returns -1 for honors. */
export function suitIndex(type: TileType): number {
  if (type <= SOU_END) return Math.floor(type / 9);
  return -1;
}

// ============================================================================
// Full Tile Info
// ============================================================================

/** Get complete info about a specific tile instance. */
export function getTileInfo(id: TileId): TileInfo {
  const type = tileIdToType(id);
  const suit = getTileSuit(type);
  return {
    id,
    type,
    suit,
    value: getTileValue(type),
    isHonor: isHonor(type),
    isTerminal: isTerminal(type),
    isSuited: isSuited(type),
    isRedDora: isRedDora(id),
    display: getTileDisplay(type),
  };
}

// ============================================================================
// Sorting
// ============================================================================

/** Sort TileIds by type (man → pin → sou → wind → dragon), then by value, then by copy. */
export function sortTileIds(tiles: TileId[]): TileId[] {
  return [...tiles].sort((a, b) => {
    const typeA = tileIdToType(a);
    const typeB = tileIdToType(b);
    if (typeA !== typeB) return typeA - typeB;
    return a - b;
  });
}

// ============================================================================
// HandArray Conversions
// ============================================================================

/** Convert a list of TileIds to a 34-element HandArray (count per type). */
export function tilesToHandArray(tiles: TileId[]): HandArray {
  const hand: HandArray = new Array(TILE_TYPE_COUNT).fill(0);
  for (const id of tiles) {
    const type = tileIdToType(id);
    hand[type]!++;
  }
  return hand;
}

/** Convert a HandArray back to a list of TileTypes (one per count). */
export function handArrayToTileTypes(hand: HandArray): TileType[] {
  const types: TileType[] = [];
  for (let t = 0; t < TILE_TYPE_COUNT; t++) {
    const count = hand[t] ?? 0;
    for (let i = 0; i < count; i++) {
      types.push(t);
    }
  }
  return types;
}

/** Get the count of a specific tile type in a HandArray. */
export function countTileType(hand: HandArray, type: TileType): number {
  return hand[type] ?? 0;
}

/** Create a new empty HandArray. */
export function emptyHandArray(): HandArray {
  return new Array(TILE_TYPE_COUNT).fill(0);
}

/** Clone a HandArray. */
export function cloneHandArray(hand: HandArray): HandArray {
  return [...hand];
}

// ============================================================================
// Tile Set Generation
// ============================================================================

/** Create an array of all 136 TileIds (0-135). */
export function createAllTileIds(): TileId[] {
  return Array.from({ length: TOTAL_TILES }, (_, i) => i);
}

// ============================================================================
// Dora Helpers
// ============================================================================

/** Given a dora indicator TileType, return the actual dora TileType. */
export function getDoraFromIndicator(indicatorType: TileType): TileType {
  // Suited tiles: wrap 9 → 1 within same suit
  if (indicatorType <= SOU_END) {
    const suitStart = Math.floor(indicatorType / 9) * 9;
    const value = indicatorType - suitStart; // 0-8
    return suitStart + ((value + 1) % 9);
  }
  // Winds: East→South→West→North→East
  if (indicatorType <= WIND_END) {
    return WIND_START + ((indicatorType - WIND_START + 1) % 4);
  }
  // Dragons: Haku→Hatsu→Chun→Haku
  if (indicatorType <= DRAGON_END) {
    return DRAGON_START + ((indicatorType - DRAGON_START + 1) % 3);
  }
  throw new RangeError(`Invalid indicator TileType: ${indicatorType}`);
}

/** Count dora in a set of tiles given dora indicator types. */
export function countDora(tiles: TileId[], doraIndicatorTypes: TileType[]): number {
  const doraTypes = doraIndicatorTypes.map(getDoraFromIndicator);
  let count = 0;
  for (const id of tiles) {
    const type = tileIdToType(id);
    for (const doraType of doraTypes) {
      if (type === doraType) count++;
    }
  }
  return count;
}

/** Count red dora in a set of tiles. */
export function countRedDora(tiles: TileId[]): number {
  return tiles.filter(isRedDora).length;
}
