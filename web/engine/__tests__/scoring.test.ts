import { describe, it, expect } from 'vitest';
import { calculateScore } from '../scoring';
import {
  dot, bam, char, windTile, dragonTile, flowerTile,
  buildAllPungsHand, buildChowHand, buildThirteenOrphans,
  buildSevenPairs, buildPureOneSuit,
} from './testHelpers';
import { WindTile, DragonTile, TileSuit, TileType } from '@/models/Tile';
import { ScoringContext } from '../types';

function baseContext(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    winningTile: dot(5, 2),
    isSelfDrawn: false,
    seatWind: WindTile.EAST,
    prevailingWind: WindTile.EAST,
    isConcealed: false,
    flowers: [],
    ...overrides,
  };
}

describe('calculateScore', () => {
  it('scores a chicken hand at base points (8)', () => {
    // Mixed chows from different suits, no special fan
    const hand = buildChowHand();
    const ctx = baseContext({
      winningTile: hand[13],
      flowers: [flowerTile('Plum', 1)], // has flowers so no "No Flowers" fan
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    // Should have minimal fan — possibly just flower bonus
    expect(result.basePoints).toBe(8);
    expect(result.totalPoints).toBeGreaterThanOrEqual(8);
  });

  it('awards self-drawn fan (+1)', () => {
    const hand = buildChowHand();
    const ctx = baseContext({ winningTile: hand[13], isSelfDrawn: true, flowers: [flowerTile('Plum', 1)] });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Self-Drawn')).toBe(true);
  });

  it('awards concealed hand fan (+1)', () => {
    const hand = buildChowHand();
    const ctx = baseContext({ winningTile: hand[13], isConcealed: true, flowers: [flowerTile('Plum', 1)] });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Concealed Hand')).toBe(true);
  });

  it('awards all pungs fan (+3)', () => {
    // All pungs hand with mixed suits to avoid Pure One Suit overshadowing
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3),   // pung of 1-dot
      bam(2, 1), bam(2, 2), bam(2, 3),   // pung of 2-bamboo
      char(3, 1), char(3, 2), char(3, 3), // pung of 3-character
      dot(7, 1), dot(7, 2), dot(7, 3),    // pung of 7-dot
      windTile(WindTile.SOUTH, 1),         // pair (13th tile)
    ];
    const winTile = windTile(WindTile.SOUTH, 2); // completes the pair
    const ctx = baseContext({ winningTile: winTile, flowers: [flowerTile('Plum', 1)] });
    const result = calculateScore(hand, [], ctx);
    expect(result.fans.some(f => f.name === 'All Pungs')).toBe(true);
  });

  it('awards dragon pung fan (+1)', () => {
    const hand = [
      dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3),
      dot(1, 1), dot(2, 1), dot(3, 1),
      dot(4, 1), dot(5, 1), dot(6, 1),
      dot(7, 1), dot(8, 1), dot(9, 1),
      bam(1, 1), bam(1, 2),
    ];
    const ctx = baseContext({ winningTile: bam(1, 2), flowers: [flowerTile('Plum', 1)] });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Red Dragon')).toBe(true);
  });

  it('awards seat wind pung fan (+1)', () => {
    const hand = [
      windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3),
      dot(1, 1), dot(2, 1), dot(3, 1),
      dot(4, 1), dot(5, 1), dot(6, 1),
      dot(7, 1), dot(8, 1), dot(9, 1),
      bam(1, 1), bam(1, 2),
    ];
    const ctx = baseContext({ winningTile: bam(1, 2), seatWind: WindTile.EAST, flowers: [flowerTile('Plum', 1)] });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Seat Wind')).toBe(true);
  });

  it('awards pure one suit fan (+7)', () => {
    const hand = buildPureOneSuit();
    const ctx = baseContext({ winningTile: hand[13], flowers: [flowerTile('Plum', 1)] });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Pure One Suit')).toBe(true);
  });

  it('awards seven pairs fan (+4)', () => {
    const hand = buildSevenPairs();
    const ctx = baseContext({ winningTile: hand[13] });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Seven Pairs')).toBe(true);
  });

  it('scores thirteen orphans as limit hand (256 points)', () => {
    const hand = buildThirteenOrphans();
    const ctx = baseContext({ winningTile: hand[13] });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.totalPoints).toBe(256);
    expect(result.totalFan).toBe(13);
  });

  it('awards no flowers fan when no flowers collected', () => {
    const hand = buildChowHand();
    const ctx = baseContext({ winningTile: hand[13], flowers: [] });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'No Flowers')).toBe(true);
  });

  it('awards flower bonus per flower tile', () => {
    const hand = buildChowHand();
    const flowers = [flowerTile('Plum', 1), flowerTile('Orchid', 2)];
    const ctx = baseContext({ winningTile: hand[13], flowers });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    const flowerFan = result.fans.find(f => f.name === 'Flower Tiles');
    expect(flowerFan?.fan).toBe(2);
  });

  it('caps payment at 256 for limit hands (10+ fan)', () => {
    // Thirteen orphans = 13 fan → limit
    const hand = buildThirteenOrphans();
    const ctx = baseContext({ winningTile: hand[13] });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.totalPoints).toBe(256);
  });
});

  it('awards all chows fan (+1) when all melds are chows', () => {
    const hand = buildChowHand();
    const ctx = baseContext({
      winningTile: hand[13],
      seatWind: WindTile.SOUTH, // different from pair wind to avoid seat wind fan
      prevailingWind: WindTile.WEST, // different from pair wind
      flowers: [flowerTile('Plum', 1)], // has flowers to avoid No Flowers fan
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'All Chows')).toBe(true);
  });
