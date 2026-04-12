import { describe, it, expect } from 'vitest';
import { calculateScore, calculatePayment } from '../scoring';
import {
  dot, bam, char, windTile, dragonTile, flowerTile,
  buildAllPungsHand, buildChowHand, buildThirteenOrphans,
  buildSevenPairs, buildPureOneSuit, buildSmallThreeDragons,
  buildBigThreeDragons, buildMixedOneSuit, buildSmallFourWinds,
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
    const hand = buildChowHand();
    const ctx = baseContext({
      winningTile: hand[13],
      flowers: [flowerTile('Plum', 1)],
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
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
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3),
      bam(2, 1), bam(2, 2), bam(2, 3),
      char(3, 1), char(3, 2), char(3, 3),
      dot(7, 1), dot(7, 2), dot(7, 3),
      windTile(WindTile.SOUTH, 1),
    ];
    const winTile = windTile(WindTile.SOUTH, 2);
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
    const hand = buildThirteenOrphans();
    const ctx = baseContext({ winningTile: hand[13] });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.totalPoints).toBe(256);
  });

  it('awards all chows fan (+1) when all melds are chows', () => {
    const hand = buildChowHand();
    const ctx = baseContext({
      winningTile: hand[13],
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'All Chows')).toBe(true);
  });

  // === New tests for Block 1 ===

  it('does NOT award Mixed One Suit when Pure One Suit applies', () => {
    const hand = buildPureOneSuit();
    const ctx = baseContext({ winningTile: hand[13], flowers: [flowerTile('Plum', 1)] });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Pure One Suit')).toBe(true);
    expect(result.fans.some(f => f.name === 'Mixed One Suit')).toBe(false);
  });

  it('awards Mixed One Suit fan (+3) for one suit plus honors', () => {
    const hand = buildMixedOneSuit();
    const ctx = baseContext({
      winningTile: hand[13],
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Mixed One Suit')).toBe(true);
    expect(result.fans.some(f => f.name === 'Pure One Suit')).toBe(false);
  });

  it('awards Small Three Dragons (+3 extra faan with 2 individual dragon fans)', () => {
    const hand = buildSmallThreeDragons();
    const ctx = baseContext({
      winningTile: hand[13],
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Small Three Dragons')).toBe(true);
    // Should also have the 2 individual dragon pung fans
    const dragonFans = result.fans.filter(f => f.name.includes('Dragon') && f.name !== 'Small Three Dragons');
    expect(dragonFans.length).toBe(2);
  });

  it('awards Big Three Dragons as limit hand (256 points)', () => {
    const hand = buildBigThreeDragons();
    const ctx = baseContext({
      winningTile: hand[13],
      flowers: [flowerTile('Plum', 1)],
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.totalPoints).toBe(256);
    expect(result.fans.some(f => f.name === 'Big Three Dragons')).toBe(true);
  });

  it('awards Small Four Winds as limit hand (256 points)', () => {
    const hand = buildSmallFourWinds();
    const ctx = baseContext({
      winningTile: hand[13],
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.totalPoints).toBe(256);
    expect(result.fans.some(f => f.name === 'Small Four Winds')).toBe(true);
  });

  it('awards Robbing the Kong fan (+1) when winMethod is robKong', () => {
    const hand = buildChowHand();
    const ctx = baseContext({
      winningTile: hand[13],
      winMethod: 'robKong',
      flowers: [flowerTile('Plum', 1)],
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Robbing the Kong')).toBe(true);
  });

  it('awards Win on Kong Replacement fan (+1)', () => {
    const hand = buildChowHand();
    const ctx = baseContext({
      winningTile: hand[13],
      winMethod: 'kongReplacement',
      isSelfDrawn: true,
      flowers: [flowerTile('Plum', 1)],
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Win on Kong Replacement')).toBe(true);
  });

  it('awards Last Tile Draw fan (+1)', () => {
    const hand = buildChowHand();
    const ctx = baseContext({
      winningTile: hand[13],
      winMethod: 'lastTileDraw',
      isSelfDrawn: true,
      flowers: [flowerTile('Plum', 1)],
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Last Tile Draw')).toBe(true);
  });

  it('awards Seat Flower fan (+1) when flower matches seat wind', () => {
    const hand = buildChowHand();
    // East seat = position 1, Plum = flower index 0 → index+1 = 1 = match
    const ctx = baseContext({
      winningTile: hand[13],
      seatWind: WindTile.EAST,
      flowers: [flowerTile('Plum', 1)],
    });
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Seat Flower')).toBe(true);
  });
});

describe('calculatePayment', () => {
  it('self-draw: all opponents pay 2x base', () => {
    const result = {
      fans: [], totalFan: 3, basePoints: 8, totalPoints: 64,
      melds: [], pair: [],
    };
    const payment = calculatePayment(result, 0, undefined, true);
    expect(payment.payments).toHaveLength(3);
    for (const p of payment.payments) {
      expect(p.toPlayerIndex).toBe(0);
      expect(p.amount).toBe(128); // 64 * 2
    }
  });

  it('discard win: discarder pays 2x, others pay 1x', () => {
    const result = {
      fans: [], totalFan: 1, basePoints: 8, totalPoints: 16,
      melds: [], pair: [],
    };
    const payment = calculatePayment(result, 0, 2, false);
    expect(payment.payments).toHaveLength(3);
    const discarderPayment = payment.payments.find(p => p.fromPlayerIndex === 2);
    const otherPayments = payment.payments.filter(p => p.fromPlayerIndex !== 2);
    expect(discarderPayment?.amount).toBe(32); // 16 * 2
    for (const p of otherPayments) {
      expect(p.amount).toBe(16); // 16 * 1
    }
  });
});
