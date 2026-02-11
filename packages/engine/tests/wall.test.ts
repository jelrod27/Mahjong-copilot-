import { describe, it, expect } from 'vitest';
import {
  buildWall,
  dealHands,
  drawTile,
  drawReplacementTile,
  getDoraIndicators,
  getUraDoraIndicators,
  isWallExhausted,
  tilesRemaining,
  createRng,
  shuffleTiles,
} from '../src/wall.js';

describe('createRng', () => {
  it('produces deterministic values from same seed', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces different values from different seeds', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(99);
    const values1 = Array.from({ length: 10 }, () => rng1());
    const values2 = Array.from({ length: 10 }, () => rng2());
    expect(values1).not.toEqual(values2);
  });

  it('produces values in [0, 1)', () => {
    const rng = createRng(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffleTiles', () => {
  it('preserves all elements', () => {
    const tiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const rng = createRng(42);
    shuffleTiles(tiles, rng);
    expect(tiles.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('produces same result with same seed', () => {
    const t1 = Array.from({ length: 20 }, (_, i) => i);
    const t2 = Array.from({ length: 20 }, (_, i) => i);
    shuffleTiles(t1, createRng(42));
    shuffleTiles(t2, createRng(42));
    expect(t1).toEqual(t2);
  });
});

describe('buildWall', () => {
  it('creates 136 total tiles (live + dead)', () => {
    const wall = buildWall(42);
    const total = wall.liveTiles.length + wall.deadWall.length;
    expect(total).toBe(136);
  });

  it('creates exactly 14 dead wall tiles', () => {
    const wall = buildWall(42);
    expect(wall.deadWall).toHaveLength(14);
  });

  it('creates exactly 122 live wall tiles', () => {
    const wall = buildWall(42);
    expect(wall.liveTiles).toHaveLength(122);
  });

  it('has no duplicate tiles', () => {
    const wall = buildWall(42);
    const allTiles = [...wall.liveTiles, ...wall.deadWall];
    expect(new Set(allTiles).size).toBe(136);
  });

  it('produces identical results with same seed', () => {
    const wall1 = buildWall(42);
    const wall2 = buildWall(42);
    expect(wall1.liveTiles).toEqual(wall2.liveTiles);
    expect(wall1.deadWall).toEqual(wall2.deadWall);
  });

  it('produces different results with different seeds', () => {
    const wall1 = buildWall(42);
    const wall2 = buildWall(99);
    expect(wall1.liveTiles).not.toEqual(wall2.liveTiles);
  });

  it('starts with kanCount 0', () => {
    const wall = buildWall(42);
    expect(wall.kanCount).toBe(0);
  });
});

describe('dealHands', () => {
  it('gives each player exactly 13 tiles', () => {
    const wall = buildWall(42);
    const { hands } = dealHands(wall);
    for (const hand of hands) {
      expect(hand).toHaveLength(13);
    }
  });

  it('leaves 70 tiles in live wall after dealing', () => {
    const wall = buildWall(42);
    const { wall: afterDeal } = dealHands(wall);
    // 122 live - (4 players * 13 tiles) = 122 - 52 = 70
    expect(afterDeal.liveTiles).toHaveLength(70);
  });

  it('all dealt tiles are unique', () => {
    const wall = buildWall(42);
    const { hands } = dealHands(wall);
    const allDealt = hands.flat();
    expect(new Set(allDealt).size).toBe(52); // 4 * 13
  });

  it('dealt tiles + remaining tiles = original tiles', () => {
    const wall = buildWall(42);
    const { hands, wall: afterDeal } = dealHands(wall);
    const allTiles = [...hands.flat(), ...afterDeal.liveTiles, ...afterDeal.deadWall];
    expect(new Set(allTiles).size).toBe(136);
  });
});

describe('drawTile', () => {
  it('returns a tile and decrements wall count', () => {
    const wall = buildWall(42);
    const { wall: afterDeal } = dealHands(wall);
    const result = drawTile(afterDeal);
    expect(result).not.toBeNull();
    expect(result!.wall.liveTiles).toHaveLength(69);
  });

  it('draws tiles in order from the front', () => {
    const wall = buildWall(42);
    const { wall: afterDeal } = dealHands(wall);
    const firstTile = afterDeal.liveTiles[0];
    const result = drawTile(afterDeal);
    expect(result!.tile).toBe(firstTile);
  });

  it('returns null when wall is empty', () => {
    const wall = buildWall(42);
    let current = dealHands(wall).wall;

    // Draw all remaining tiles
    while (current.liveTiles.length > 0) {
      const result = drawTile(current);
      if (!result) break;
      current = result.wall;
    }

    expect(drawTile(current)).toBeNull();
  });
});

describe('drawReplacementTile', () => {
  it('draws from dead wall and shifts a live tile in', () => {
    const wall = buildWall(42);
    const { wall: afterDeal } = dealHands(wall);
    const result = drawReplacementTile(afterDeal);
    expect(result).not.toBeNull();
    expect(result!.newDoraRevealed).toBe(true);
    expect(result!.wall.kanCount).toBe(1);
    // Live wall loses one tile (shifted to dead wall)
    expect(result!.wall.liveTiles).toHaveLength(69);
    // Dead wall still has 14 tiles
    expect(result!.wall.deadWall).toHaveLength(14);
  });

  it('allows up to 4 replacement draws', () => {
    let wall = buildWall(42);
    wall = dealHands(wall).wall;

    for (let i = 0; i < 4; i++) {
      const result = drawReplacementTile(wall);
      expect(result).not.toBeNull();
      wall = result!.wall;
      expect(wall.kanCount).toBe(i + 1);
    }

    // 5th should fail
    expect(drawReplacementTile(wall)).toBeNull();
  });
});

describe('Dora Indicators', () => {
  it('returns exactly 1 dora indicator initially', () => {
    const wall = buildWall(42);
    const indicators = getDoraIndicators(wall);
    expect(indicators).toHaveLength(1);
  });

  it('reveals additional dora after kan', () => {
    let wall = buildWall(42);
    wall = dealHands(wall).wall;

    const result = drawReplacementTile(wall);
    expect(result).not.toBeNull();
    const indicators = getDoraIndicators(result!.wall);
    expect(indicators).toHaveLength(2);
  });

  it('ura-dora count matches dora count', () => {
    let wall = buildWall(42);
    wall = dealHands(wall).wall;

    expect(getUraDoraIndicators(wall)).toHaveLength(1);

    const result = drawReplacementTile(wall);
    expect(getUraDoraIndicators(result!.wall)).toHaveLength(2);
  });
});

describe('Wall Status', () => {
  it('isWallExhausted returns false when tiles remain', () => {
    const wall = buildWall(42);
    expect(isWallExhausted(wall)).toBe(false);
  });

  it('tilesRemaining returns live tile count', () => {
    const wall = buildWall(42);
    expect(tilesRemaining(wall)).toBe(122);
    const { wall: afterDeal } = dealHands(wall);
    expect(tilesRemaining(afterDeal)).toBe(70);
  });
});
