import { describe, it, expect } from 'vitest';
import { isWinningHand, findDecompositions, isThirteenOrphans, isSevenPairs, calculateShanten } from '../winDetection';
import {
  dot, bam, char, windTile, dragonTile,
  buildAllPungsHand, buildChowHand, buildThirteenOrphans, buildSevenPairs,
} from './testHelpers';
import { WindTile, DragonTile } from '@/models/Tile';

describe('isWinningHand', () => {
  it('returns true for 4 pungs + pair', () => {
    expect(isWinningHand(buildAllPungsHand())).toBe(true);
  });

  it('returns true for 4 chows + pair', () => {
    expect(isWinningHand(buildChowHand())).toBe(true);
  });

  it('returns true for thirteen orphans', () => {
    expect(isWinningHand(buildThirteenOrphans())).toBe(true);
  });

  it('returns true for seven pairs', () => {
    expect(isWinningHand(buildSevenPairs())).toBe(true);
  });

  it('returns false for 13 tiles', () => {
    expect(isWinningHand(buildAllPungsHand().slice(0, 13))).toBe(false);
  });

  it('returns false for random non-winning 14 tiles', () => {
    const hand = [
      dot(1, 1), dot(2, 1), dot(4, 1), // not a chow (gap)
      bam(3, 1), bam(5, 1), bam(7, 1), // scattered
      char(1, 1), char(3, 1), char(5, 1),
      windTile(WindTile.EAST, 1),
      windTile(WindTile.SOUTH, 1),
      dragonTile(DragonTile.RED, 1),
      dragonTile(DragonTile.GREEN, 1),
      dragonTile(DragonTile.WHITE, 1),
    ];
    expect(isWinningHand(hand)).toBe(false);
  });
});

describe('isThirteenOrphans', () => {
  it('returns true for valid thirteen orphans', () => {
    expect(isThirteenOrphans(buildThirteenOrphans())).toBe(true);
  });

  it('returns false when missing a terminal', () => {
    const hand = buildThirteenOrphans();
    hand[0] = dot(2, 1); // replace 1-dot with 2-dot (non-terminal)
    expect(isThirteenOrphans(hand)).toBe(false);
  });

  it('returns false for wrong tile count', () => {
    expect(isThirteenOrphans(buildThirteenOrphans().slice(0, 13))).toBe(false);
  });
});

describe('isSevenPairs', () => {
  it('returns true for 7 distinct pairs', () => {
    expect(isSevenPairs(buildSevenPairs())).toBe(true);
  });

  it('returns false when not all pairs', () => {
    const hand = buildSevenPairs();
    hand[1] = dot(2, 1); // break a pair
    expect(isSevenPairs(hand)).toBe(false);
  });

  it('returns false for 4-of-a-kind counted as 2 pairs (only 6 distinct keys)', () => {
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3), dot(1, 4), // 4 of a kind = not 7 distinct
      dot(3, 1), dot(3, 2),
      dot(5, 1), dot(5, 2),
      dot(7, 1), dot(7, 2),
      bam(2, 1), bam(2, 2),
      bam(4, 1), bam(4, 2),
    ];
    expect(isSevenPairs(hand)).toBe(false);
  });
});

describe('findDecompositions', () => {
  it('returns decompositions for a standard winning hand', () => {
    const decomps = findDecompositions(buildAllPungsHand());
    expect(decomps.length).toBeGreaterThan(0);
  });

  it('each standard decomposition has 4 melds and a pair', () => {
    const decomps = findDecompositions(buildAllPungsHand());
    for (const d of decomps) {
      // Standard decompositions (non-special) should have 4 melds and a 2-tile pair
      if (d.melds.length === 4) {
        expect(d.pair).toHaveLength(2);
      }
    }
  });

  it('returns empty for non-winning hand', () => {
    const hand = [
      dot(1, 1), dot(2, 1), dot(4, 1),
      bam(3, 1), bam(5, 1), bam(7, 1),
      char(1, 1), char(3, 1), char(5, 1),
      windTile(WindTile.EAST, 1),
      windTile(WindTile.SOUTH, 1),
      dragonTile(DragonTile.RED, 1),
      dragonTile(DragonTile.GREEN, 1),
      dragonTile(DragonTile.WHITE, 1),
    ];
    expect(findDecompositions(hand)).toHaveLength(0);
  });
});

describe('calculateShanten', () => {
  it('returns -1 for a winning 14-tile hand', () => {
    expect(calculateShanten(buildAllPungsHand())).toBe(-1);
  });

  it('returns 0 for tenpai (13-tile hand one away from winning)', () => {
    const hand = buildAllPungsHand().slice(0, 13); // remove one tile of the pair
    expect(calculateShanten(hand)).toBe(0);
  });

  it('returns positive for a hand far from winning', () => {
    const hand = [
      dot(1, 1), dot(3, 1), dot(5, 1),
      bam(2, 1), bam(4, 1), bam(6, 1),
      char(1, 1), char(3, 1), char(5, 1),
      windTile(WindTile.EAST, 1),
      windTile(WindTile.SOUTH, 1),
      windTile(WindTile.WEST, 1),
      dragonTile(DragonTile.RED, 1),
    ];
    expect(calculateShanten(hand)).toBeGreaterThan(0);
  });
});
