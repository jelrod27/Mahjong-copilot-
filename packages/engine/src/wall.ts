import { TileId } from './types.js';
import { createAllTileIds } from './tiles.js';

// ============================================================================
// Seeded Random Number Generator (Mulberry32)
// ============================================================================

/** Create a seeded PRNG that produces values in [0, 1). */
export function createRng(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// Wall State
// ============================================================================

export interface WallState {
  liveTiles: TileId[];
  deadWall: TileId[];
  doraIndicatorPositions: number[];
  uraDoraIndicatorPositions: number[];
  kanCount: number;
  seed: number;
}

// Dead wall layout (14 tiles):
// Positions 0-3: replacement draw tiles (drawn from 3→2→1→0)
// Position 4: 1st dora indicator (revealed at start)
// Position 5: 1st ura-dora indicator
// Position 6: 2nd dora indicator (revealed after 1st kan)
// Position 7: 2nd ura-dora indicator
// Position 8: 3rd dora indicator
// Position 9: 3rd ura-dora indicator
// Position 10: 4th dora indicator
// Position 11: 4th ura-dora indicator
// Positions 12-13: extra tiles

const DORA_INDICATOR_POSITIONS = [4, 6, 8, 10];
const URA_DORA_INDICATOR_POSITIONS = [5, 7, 9, 11];
const DEAD_WALL_SIZE = 14;

// ============================================================================
// Fisher-Yates Shuffle
// ============================================================================

/** Shuffle an array in-place using Fisher-Yates with the provided RNG. */
export function shuffleTiles(tiles: TileId[], rng: () => number): TileId[] {
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = tiles[i]!;
    tiles[i] = tiles[j]!;
    tiles[j] = temp;
  }
  return tiles;
}

// ============================================================================
// Wall Building
// ============================================================================

/** Build a new wall: create all 136 tiles, shuffle, and separate dead wall. */
export function buildWall(seed?: number): WallState {
  const actualSeed = seed ?? Date.now();
  const rng = createRng(actualSeed);
  const allTiles = createAllTileIds();
  shuffleTiles(allTiles, rng);

  const deadWall = allTiles.splice(allTiles.length - DEAD_WALL_SIZE, DEAD_WALL_SIZE);
  const liveTiles = allTiles; // remaining 122 tiles

  return {
    liveTiles,
    deadWall,
    doraIndicatorPositions: [...DORA_INDICATOR_POSITIONS],
    uraDoraIndicatorPositions: [...URA_DORA_INDICATOR_POSITIONS],
    kanCount: 0,
    seed: actualSeed,
  };
}

// ============================================================================
// Dealing
// ============================================================================

/** Deal 13 tiles to each of 4 players. Returns hands and updated wall. */
export function dealHands(wall: WallState): {
  hands: [TileId[], TileId[], TileId[], TileId[]];
  wall: WallState;
} {
  const newLive = [...wall.liveTiles];
  const hands: [TileId[], TileId[], TileId[], TileId[]] = [[], [], [], []];

  // Deal in groups of 4 (each player gets 4 tiles), 3 times = 12 tiles each
  for (let round = 0; round < 3; round++) {
    for (let player = 0; player < 4; player++) {
      for (let t = 0; t < 4; t++) {
        const tile = newLive.shift();
        if (tile === undefined) throw new Error('Not enough tiles to deal');
        hands[player]!.push(tile);
      }
    }
  }

  // Then each player gets 1 more tile = 13 total
  for (let player = 0; player < 4; player++) {
    const tile = newLive.shift();
    if (tile === undefined) throw new Error('Not enough tiles to deal');
    hands[player]!.push(tile);
  }

  return {
    hands,
    wall: { ...wall, liveTiles: newLive },
  };
}

// ============================================================================
// Drawing
// ============================================================================

/** Draw a tile from the front of the live wall. Returns null if exhausted. */
export function drawTile(wall: WallState): {
  tile: TileId;
  wall: WallState;
} | null {
  if (wall.liveTiles.length === 0) return null;

  const newLive = [...wall.liveTiles];
  const tile = newLive.shift()!;

  return {
    tile,
    wall: { ...wall, liveTiles: newLive },
  };
}

/**
 * Draw a replacement tile from the dead wall (for kan).
 * Draws from the replacement area (positions 3→2→1→0).
 * Shifts one tile from live wall end to dead wall to maintain size.
 * Increments kan count for dora reveal tracking.
 */
export function drawReplacementTile(wall: WallState): {
  tile: TileId;
  wall: WallState;
  newDoraRevealed: boolean;
} | null {
  if (wall.kanCount >= 4) return null; // Max 4 kans
  if (wall.liveTiles.length === 0) return null;

  const newDeadWall = [...wall.deadWall];
  const newLive = [...wall.liveTiles];

  // Draw from replacement area: position (3 - kanCount)
  const drawPosition = 3 - wall.kanCount;
  const tile = newDeadWall[drawPosition];
  if (tile === undefined) return null;

  // Replace with a tile from the end of the live wall
  const replacementTile = newLive.pop();
  if (replacementTile === undefined) return null;
  newDeadWall[drawPosition] = replacementTile;

  const newKanCount = wall.kanCount + 1;

  return {
    tile,
    wall: {
      ...wall,
      liveTiles: newLive,
      deadWall: newDeadWall,
      kanCount: newKanCount,
    },
    newDoraRevealed: true, // New dora indicator revealed after each kan
  };
}

// ============================================================================
// Dora Indicators
// ============================================================================

/** Get the currently revealed dora indicator TileIds. */
export function getDoraIndicators(wall: WallState): TileId[] {
  const indicators: TileId[] = [];
  // Always reveal first indicator + one per kan
  const count = 1 + wall.kanCount;
  for (let i = 0; i < count && i < DORA_INDICATOR_POSITIONS.length; i++) {
    const pos = wall.doraIndicatorPositions[i]!;
    const tile = wall.deadWall[pos];
    if (tile !== undefined) {
      indicators.push(tile);
    }
  }
  return indicators;
}

/** Get the ura-dora indicator TileIds (revealed for riichi winners). */
export function getUraDoraIndicators(wall: WallState): TileId[] {
  const indicators: TileId[] = [];
  const count = 1 + wall.kanCount;
  for (let i = 0; i < count && i < URA_DORA_INDICATOR_POSITIONS.length; i++) {
    const pos = wall.uraDoraIndicatorPositions[i]!;
    const tile = wall.deadWall[pos];
    if (tile !== undefined) {
      indicators.push(tile);
    }
  }
  return indicators;
}

// ============================================================================
// Wall Status
// ============================================================================

/** Check if the live wall is exhausted (no more tiles to draw). */
export function isWallExhausted(wall: WallState): boolean {
  return wall.liveTiles.length === 0;
}

/** Get count of tiles remaining in the live wall. */
export function tilesRemaining(wall: WallState): number {
  return wall.liveTiles.length;
}
