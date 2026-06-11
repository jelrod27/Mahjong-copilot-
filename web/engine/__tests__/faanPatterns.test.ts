/**
 * Comprehensive Hong Kong faan pattern coverage for the scorer.
 *
 * Pins the exact faan/point outcome of every scoring pattern in scoring.ts:
 * chicken, all chows, all pungs, one-suit families, dragons, winds, the
 * limit hands (thirteen orphans, nine gates, all honors/terminals, four
 * concealed pungs, all kongs, big/small dragons and winds, heavenly/earthly),
 * seven pairs, win-method bonuses, flowers, payment math, and the min-faan gate.
 *
 * Cases that duplicate scoring.test.ts or engineCorrectness.test.ts are
 * deliberately omitted; this file targets the boundaries and stacking those
 * two files do not pin.
 *
 * Run: npx vitest run engine/__tests__/faanPatterns.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculateScore, calculatePayment, meetsMinFaan } from '../scoring';
import {
  dot, bam, char, windTile, dragonTile, flowerTile,
} from './testHelpers';
import { WindTile, DragonTile, Tile, TileSuit, TileType } from '@/models/Tile';
import { MeldInfo } from '@/models/GameState';
import { ScoringContext } from '../types';

/**
 * Limit-hand payout produced by the current engine: BASE (8) * 2^LIMIT_FAN (10)
 * = 8192. NOTE: CLAUDE.md and the scoring.ts file header still describe limit
 * hands as "capped at 256". That 256 ceiling (8 * 2^5) was replaced in the
 * working tree by the full 8 * 2^10 = 8192 limit. The replacement is deliberate
 * and internally consistent (the in-code comment states a limit hand "must
 * always be the most valuable hand possible"), but the docs are now stale.
 * These tests pin the actual engine output (8192); the doc mismatch is surfaced
 * in the run summary rather than asserted as 256.
 */
const LIMIT_POINTS = 8 * Math.pow(2, 10); // 8192

/** Default scoring context: East seat, East round, discard win, no flowers. */
function ctx(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    winningTile: dot(5, 4),
    isSelfDrawn: false,
    seatWind: WindTile.EAST,
    prevailingWind: WindTile.EAST,
    isConcealed: false,
    flowers: [],
    ...overrides,
  };
}

/** Sum of awarded faan, treating the chicken fallback as 0. */
function faanOf(result: { fans: { name: string; fan: number }[]; totalFan: number }): number {
  if (result.fans.length === 1 && result.fans[0].name === 'Chicken Hand') return 0;
  return result.totalFan;
}

function names(result: { fans: { name: string }[] }): string[] {
  return result.fans.map(f => f.name);
}

// ============================================================
// 1. Chicken hand
// ============================================================

describe('chicken / minimal hand', () => {
  // NOTE ON REACHABILITY: a literal 0-faan chicken is not reachable through the
  // normal fan path of calculateScore. Every valid winning hand picks up at
  // least one flower-axis faan: No Flowers (1) when flowers is empty, or
  // Flower Tiles (>=1) when flowers are held. The 0-faan / 8-point branch only
  // fires through the no-decomposition fallback, which a valid 14-tile win
  // never hits. So the true scoring floor for a winning hand is 1+ faan.
  //
  // This block therefore pins the *minimal reachable* win: a mixed-suit all-chow
  // hand with no flowers scores All Chows (1) + No Flowers (1) = 2 faan, and is
  // correctly rejected by the 3-faan gate while passing at minFaan 0.
  function minimalHand(): { hand: Tile[]; win: Tile } {
    const hand = [
      dot(1, 1), dot(2, 1), dot(3, 1),
      dot(4, 1), dot(5, 1), dot(6, 1),
      bam(1, 1), bam(2, 1), bam(3, 1),
      char(4, 1), char(5, 1), char(6, 1),
      windTile(WindTile.NORTH, 1),
    ];
    return { hand, win: windTile(WindTile.NORTH, 2) };
  }

  it('the minimal reachable win is 2 faan (All Chows + No Flowers), not 0', () => {
    const { hand, win } = minimalHand();
    const result = calculateScore(hand, [], ctx({
      winningTile: win,
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [],
    }));
    expect(names(result).sort()).toEqual(['All Chows', 'No Flowers']);
    expect(result.totalFan).toBe(2);
  });

  it('the 0-faan / 8-point fallback fires only when no decomposition exists', () => {
    // An empty concealed hand with no melds has no decomposition, so the
    // fallback chicken branch is the only thing that can fire.
    const result = calculateScore([], [], ctx({ winningTile: dot(5, 1) }));
    expect(faanOf(result)).toBe(0);
    expect(result.totalPoints).toBe(8);
  });

  it('a 2-faan minimal hand is rejected by minFaan 3 but accepted at minFaan 0', () => {
    const { hand, win } = minimalHand();
    const common = { winningTile: win, seatWind: WindTile.SOUTH, prevailingWind: WindTile.WEST, flowers: [] };
    expect(meetsMinFaan(hand, [], ctx({ ...common, minFaan: 3 }))).toBe(false);
    expect(meetsMinFaan(hand, [], ctx({ ...common, minFaan: 0 }))).toBe(true);
  });
});

// ============================================================
// 2. Common hand / All Chows
// ============================================================

describe('all chows (common hand)', () => {
  // 4 chows + non-honor, non-terminal pair. Mixed suits so no one-suit fan.
  function commonHand(): { hand: Tile[]; win: Tile } {
    const hand = [
      dot(1, 1), dot(2, 1), dot(3, 1),
      dot(4, 1), dot(5, 1), dot(6, 1),
      bam(1, 1), bam(2, 1), bam(3, 1),
      char(4, 1), char(5, 1), char(6, 1),
      dot(8, 1),
    ];
    return { hand, win: dot(8, 2) };
  }

  it('awards All Chows with a flower held to suppress No Flowers', () => {
    const { hand, win } = commonHand();
    // West seat (#3) with Plum (#1) avoids any seat-flower match, so the chow
    // hand earns All Chows (1) plus the flower-count faan and nothing else.
    const result = calculateScore(hand, [], ctx({
      winningTile: win,
      seatWind: WindTile.WEST,
      prevailingWind: WindTile.SOUTH,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).toContain('All Chows');
    expect(faanOf(result)).toBeGreaterThanOrEqual(1);
  });

  it('a hand with one pung is NOT all chows', () => {
    const hand = [
      dot(1, 1), dot(2, 1), dot(3, 1),
      dot(4, 1), dot(5, 1), dot(6, 1),
      bam(1, 1), bam(2, 1), bam(3, 1),
      char(5, 1), char(5, 2), char(5, 3),
      dot(8, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: dot(8, 2),
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).not.toContain('All Chows');
  });
});

// ============================================================
// 3. All Pungs
// ============================================================

describe('all pungs', () => {
  it('awards 3 faan for four concealed pungs + pair (discard win, not self-draw)', () => {
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3),
      bam(2, 1), bam(2, 2), bam(2, 3),
      char(3, 1), char(3, 2), char(3, 3),
      dot(7, 1), dot(7, 2), dot(7, 3),
      char(9, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: char(9, 2),
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    const allPungs = result.fans.find(f => f.name === 'All Pungs');
    expect(allPungs?.fan).toBe(3);
  });

  it('counts an exposed kong as a pung toward all pungs', () => {
    const kong: MeldInfo = {
      tiles: [bam(5, 1), bam(5, 2), bam(5, 3), bam(5, 4)],
      type: 'kong', isConcealed: false,
    };
    // Concealed: 3 pungs + pair = 11 tiles (meldsNeeded = 3 -> 3*3+2).
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3),
      char(3, 1), char(3, 2), char(3, 3),
      dot(7, 1), dot(7, 2), dot(7, 3),
      char(9, 1),
    ];
    const result = calculateScore(hand, [kong], ctx({
      winningTile: char(9, 2),
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).toContain('All Pungs');
  });
});

// ============================================================
// 4. Mixed One Suit / Pure One Suit / All Honors interaction
// ============================================================

describe('one-suit families', () => {
  it('pure one suit does not also award mixed one suit', () => {
    const hand = [
      dot(1, 1), dot(2, 1), dot(3, 1),
      dot(4, 1), dot(5, 1), dot(6, 1),
      dot(7, 1), dot(8, 1), dot(9, 1),
      dot(1, 2), dot(2, 2), dot(3, 2),
      dot(5, 2),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: dot(5, 3),
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).toContain('Pure One Suit');
    expect(names(result)).not.toContain('Mixed One Suit');
  });

  it('an honors-only hand is All Honors (limit), not mixed/pure one suit', () => {
    const hand = [
      windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3),
      windTile(WindTile.SOUTH, 1), windTile(WindTile.SOUTH, 2), windTile(WindTile.SOUTH, 3),
      dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3),
      dragonTile(DragonTile.GREEN, 1), dragonTile(DragonTile.GREEN, 2), dragonTile(DragonTile.GREEN, 3),
      windTile(WindTile.NORTH, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: windTile(WindTile.NORTH, 2),
      seatWind: WindTile.WEST,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).toContain('All Honors');
    expect(names(result)).not.toContain('Mixed One Suit');
    expect(names(result)).not.toContain('Pure One Suit');
    expect(result.totalPoints).toBe(LIMIT_POINTS);
  });
});

// ============================================================
// 5. Dragons
// ============================================================

describe('dragon pungs', () => {
  it('a single dragon pung is worth exactly 1 dragon faan', () => {
    const hand = [
      dragonTile(DragonTile.GREEN, 1), dragonTile(DragonTile.GREEN, 2), dragonTile(DragonTile.GREEN, 3),
      dot(1, 1), dot(2, 1), dot(3, 1),
      dot(4, 1), dot(5, 1), dot(6, 1),
      dot(7, 1), dot(8, 1), dot(9, 1),
      bam(2, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: bam(2, 2),
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    const dragonFans = result.fans.filter(f => f.name === 'Green Dragon');
    expect(dragonFans).toHaveLength(1);
    expect(dragonFans[0].fan).toBe(1);
  });

  it('small three dragons totals 5 faan (two dragon pungs + the set bonus)', () => {
    // 2 dragon pungs + dragon pair + 1 chow + 1 pung. Mixed suits, no wind fan.
    const hand = [
      dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3),
      dragonTile(DragonTile.GREEN, 1), dragonTile(DragonTile.GREEN, 2), dragonTile(DragonTile.GREEN, 3),
      dot(1, 1), dot(2, 1), dot(3, 1),
      bam(5, 1), bam(5, 2), bam(5, 3),
      dragonTile(DragonTile.WHITE, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: dragonTile(DragonTile.WHITE, 2),
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    // Red(1) + Green(1) + Small Three Dragons(3) = 5.
    const dragonFan = result.fans.filter(f => f.name === 'Red Dragon' || f.name === 'Green Dragon')
      .reduce((s, f) => s + f.fan, 0);
    const setFan = result.fans.find(f => f.name === 'Small Three Dragons')?.fan ?? 0;
    expect(dragonFan).toBe(2);
    expect(setFan).toBe(3);
    expect(dragonFan + setFan).toBe(5);
  });

  it('big three dragons is a 10-faan limit hand (limit payout)', () => {
    const hand = [
      dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3),
      dragonTile(DragonTile.GREEN, 1), dragonTile(DragonTile.GREEN, 2), dragonTile(DragonTile.GREEN, 3),
      dragonTile(DragonTile.WHITE, 1), dragonTile(DragonTile.WHITE, 2), dragonTile(DragonTile.WHITE, 3),
      dot(1, 1), dot(2, 1), dot(3, 1),
      bam(5, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: bam(5, 2),
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).toContain('Big Three Dragons');
    expect(result.totalFan).toBe(10);
    expect(result.totalPoints).toBe(LIMIT_POINTS);
  });
});

// ============================================================
// 6. Winds
// ============================================================

describe('wind pungs', () => {
  it('seat == prevailing East pung stacks to 2 faan (seat + prevailing)', () => {
    const hand = [
      windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3),
      dot(1, 1), dot(2, 1), dot(3, 1),
      dot(4, 1), dot(5, 1), dot(6, 1),
      dot(7, 1), dot(8, 1), dot(9, 1),
      bam(2, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: bam(2, 2),
      seatWind: WindTile.EAST,
      prevailingWind: WindTile.EAST,
      flowers: [flowerTile('Orchid', 2)], // Orchid #2 != East #1, no seat flower
    }));
    expect(names(result)).toContain('Seat Wind');
    expect(names(result)).toContain('Prevailing Wind');
    const windFaan = result.fans.filter(f => f.name === 'Seat Wind' || f.name === 'Prevailing Wind')
      .reduce((s, f) => s + f.fan, 0);
    expect(windFaan).toBe(2);
  });

  it('a South wind pung in East round for an East seat gives no wind faan', () => {
    const hand = [
      windTile(WindTile.SOUTH, 1), windTile(WindTile.SOUTH, 2), windTile(WindTile.SOUTH, 3),
      dot(1, 1), dot(2, 1), dot(3, 1),
      dot(4, 1), dot(5, 1), dot(6, 1),
      dot(7, 1), dot(8, 1), dot(9, 1),
      bam(2, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: bam(2, 2),
      seatWind: WindTile.EAST,
      prevailingWind: WindTile.EAST,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).not.toContain('Seat Wind');
    expect(names(result)).not.toContain('Prevailing Wind');
  });

  it('small four winds is a limit hand (limit payout)', () => {
    const hand = [
      windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3),
      windTile(WindTile.SOUTH, 1), windTile(WindTile.SOUTH, 2), windTile(WindTile.SOUTH, 3),
      windTile(WindTile.WEST, 1), windTile(WindTile.WEST, 2), windTile(WindTile.WEST, 3),
      dot(1, 1), dot(2, 1), dot(3, 1),
      windTile(WindTile.NORTH, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: windTile(WindTile.NORTH, 2),
      seatWind: WindTile.WEST,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).toContain('Small Four Winds');
    expect(result.totalPoints).toBe(LIMIT_POINTS);
  });

  it('big four winds is a limit hand (limit payout)', () => {
    const hand = [
      windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3),
      windTile(WindTile.SOUTH, 1), windTile(WindTile.SOUTH, 2), windTile(WindTile.SOUTH, 3),
      windTile(WindTile.WEST, 1), windTile(WindTile.WEST, 2), windTile(WindTile.WEST, 3),
      windTile(WindTile.NORTH, 1), windTile(WindTile.NORTH, 2), windTile(WindTile.NORTH, 3),
      dot(5, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: dot(5, 2),
      seatWind: WindTile.WEST,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).toContain('Big Four Winds');
    expect(result.totalPoints).toBe(LIMIT_POINTS);
  });
});

// ============================================================
// 7. Thirteen Orphans
// ============================================================

describe('thirteen orphans', () => {
  // 13 distinct terminals/honors, won on a duplicate of one of them.
  const thirteenDistinct: Tile[] = [
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
  ];

  it('the 13-wait version (won on any duplicate) scores 13 faan at limit payout', () => {
    const result = calculateScore(thirteenDistinct, [], ctx({ winningTile: dragonTile(DragonTile.WHITE, 2) }));
    expect(result.handName).toBe('Thirteen Orphans');
    expect(result.totalFan).toBe(13);
    expect(result.totalPoints).toBe(LIMIT_POINTS);
  });

  it('the standard one-duplicate version scores 13 faan at limit payout', () => {
    // 12 distinct in hand + the duplicate already held, won on the 13th distinct.
    const hand = [
      dot(1, 1), dot(1, 2), dot(9, 1),
      bam(1, 1), bam(9, 1),
      char(1, 1), char(9, 1),
      windTile(WindTile.EAST, 1),
      windTile(WindTile.SOUTH, 1),
      windTile(WindTile.WEST, 1),
      windTile(WindTile.NORTH, 1),
      dragonTile(DragonTile.RED, 1),
      dragonTile(DragonTile.GREEN, 1),
    ];
    const result = calculateScore(hand, [], ctx({ winningTile: dragonTile(DragonTile.WHITE, 1) }));
    expect(result.handName).toBe('Thirteen Orphans');
    expect(result.totalPoints).toBe(LIMIT_POINTS);
  });
});

// ============================================================
// 8. Seven Pairs
// ============================================================

describe('seven pairs', () => {
  it('awards exactly 4 faan for seven distinct pairs', () => {
    const hand = [
      dot(1, 1), dot(1, 2),
      dot(3, 1), dot(3, 2),
      dot(5, 1), dot(5, 2),
      dot(7, 1), dot(7, 2),
      bam(2, 1), bam(2, 2),
      bam(4, 1), bam(4, 2),
      bam(6, 1),
    ];
    const result = calculateScore(hand, [], ctx({ winningTile: bam(6, 2) }));
    const sevenPairs = result.fans.find(f => f.name === 'Seven Pairs');
    expect(sevenPairs?.fan).toBe(4);
  });

  it('a four-of-a-kind does not count as two pairs toward seven pairs', () => {
    // Six pairs + one four-of-a-kind = 13 distinct kinds collapse to 6 keys,
    // so isSevenPairs (which requires 7 distinct keys) must reject it.
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3),
      dot(3, 1), dot(3, 2),
      dot(5, 1), dot(5, 2),
      dot(7, 1), dot(7, 2),
      bam(2, 1), bam(2, 2),
      bam(4, 1), bam(4, 2),
    ];
    const result = calculateScore(hand, [], ctx({ winningTile: dot(1, 4) }));
    expect(names(result)).not.toContain('Seven Pairs');
  });
});

// ============================================================
// 9. Nine Gates
// ============================================================

describe('nine gates', () => {
  it('the 1112345678999 + extra pattern scores 13 faan at limit payout', () => {
    // Concealed 1112345678999 (13 tiles), won on an extra 5 of the same suit.
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3),
      dot(2, 1), dot(3, 1), dot(4, 1), dot(5, 1),
      dot(6, 1), dot(7, 1), dot(8, 1),
      dot(9, 1), dot(9, 2), dot(9, 3),
    ];
    const result = calculateScore(hand, [], ctx({ winningTile: dot(5, 2) }));
    expect(result.handName).toBe('Nine Gates');
    expect(result.totalFan).toBe(13);
    expect(result.totalPoints).toBe(LIMIT_POINTS);
  });

  it('a mixed-suit near-miss is NOT nine gates', () => {
    // Same shape but one tile is a different suit -> fails the single-suit check.
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3),
      dot(2, 1), dot(3, 1), dot(4, 1), dot(5, 1),
      dot(6, 1), dot(7, 1), dot(8, 1),
      dot(9, 1), dot(9, 2), bam(9, 1),
    ];
    const result = calculateScore(hand, [], ctx({ winningTile: dot(5, 2) }));
    expect(result.handName).not.toBe('Nine Gates');
  });
});

// ============================================================
// 10. All Honors / All Terminals near-misses
// ============================================================

describe('all terminals', () => {
  it('four terminal pungs + terminal pair is a limit hand (limit payout)', () => {
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3),
      dot(9, 1), dot(9, 2), dot(9, 3),
      bam(1, 1), bam(1, 2), bam(1, 3),
      char(9, 1), char(9, 2), char(9, 3),
      bam(9, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: bam(9, 2),
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).toContain('All Terminals');
    expect(result.totalPoints).toBe(LIMIT_POINTS);
  });

  it('one non-terminal tile breaks all terminals', () => {
    // Replace the 9-character pung with a 5-character pung: no longer all terminals.
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3),
      dot(9, 1), dot(9, 2), dot(9, 3),
      bam(1, 1), bam(1, 2), bam(1, 3),
      char(5, 1), char(5, 2), char(5, 3),
      bam(9, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: bam(9, 2),
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).not.toContain('All Terminals');
  });

  it('one suit tile breaks all honors', () => {
    // All Honors hand with one wind pung swapped for a dot pung.
    const hand = [
      windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3),
      windTile(WindTile.SOUTH, 1), windTile(WindTile.SOUTH, 2), windTile(WindTile.SOUTH, 3),
      dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3),
      dot(1, 1), dot(1, 2), dot(1, 3),
      windTile(WindTile.NORTH, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: windTile(WindTile.NORTH, 2),
      seatWind: WindTile.WEST,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).not.toContain('All Honors');
  });
});

// ============================================================
// 11. Four Concealed Pungs
// ============================================================

describe('four concealed pungs', () => {
  // 3 full concealed pungs + a pair + two of the 4th pung. The winning tile
  // completes the FOURTH PUNG (not the pair), mixed suits so no one-suit limit
  // interferes. This is the case that distinguishes self-draw from a discard
  // win: the current engine awards Four Concealed Pungs when isSelfDrawn OR the
  // win completes the pair, but a pung-completing discard means the last pung
  // was not formed concealed.
  function fourPungs(): { hand: Tile[]; win: Tile } {
    const hand = [
      dot(2, 1), dot(2, 2), dot(2, 3),
      bam(4, 1), bam(4, 2), bam(4, 3),
      char(6, 1), char(6, 2), char(6, 3),
      dot(8, 1), dot(8, 2),
      bam(5, 1), bam(5, 2),
    ];
    return { hand, win: dot(8, 3) };
  }

  it('concealed + self-draw awards the limit hand (limit payout)', () => {
    const { hand, win } = fourPungs();
    const result = calculateScore(hand, [], ctx({
      winningTile: win,
      isConcealed: true,
      isSelfDrawn: true,
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).toContain('Four Concealed Pungs');
    expect(result.totalPoints).toBe(LIMIT_POINTS);
  });

  it('a discard win completing the 4th pung is All Pungs, not Four Concealed Pungs', () => {
    const { hand, win } = fourPungs();
    const result = calculateScore(hand, [], ctx({
      winningTile: win,
      isConcealed: true,
      isSelfDrawn: false, // discard win; the winning tile completes a pung, not the pair
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).not.toContain('Four Concealed Pungs');
    expect(names(result)).toContain('All Pungs');
  });
});

// ============================================================
// 12. All Kongs
// ============================================================

describe('all kongs', () => {
  it('four kongs + a pair is a limit hand (limit payout)', () => {
    const kongs: MeldInfo[] = [
      { tiles: [dot(2, 1), dot(2, 2), dot(2, 3), dot(2, 4)], type: 'kong', isConcealed: true },
      { tiles: [bam(4, 1), bam(4, 2), bam(4, 3), bam(4, 4)], type: 'kong', isConcealed: false },
      { tiles: [char(6, 1), char(6, 2), char(6, 3), char(6, 4)], type: 'kong', isConcealed: true },
      { tiles: [dot(8, 1), dot(8, 2), dot(8, 3), dot(8, 4)], type: 'kong', isConcealed: false },
    ];
    // meldsNeeded = 0, so concealed tiles must be exactly the 2-tile pair.
    const hand = [bam(5, 1)];
    const result = calculateScore(hand, kongs, ctx({
      winningTile: bam(5, 2),
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).toContain('All Kongs');
    expect(result.totalPoints).toBe(LIMIT_POINTS);
  });
});

// ============================================================
// 13. Self-draw / Concealed stacking
// ============================================================

describe('self-draw and concealed stacking', () => {
  it('a concealed self-draw pure-one-suit totals 9 faan (7 + 1 + 1)', () => {
    const hand = [
      dot(1, 1), dot(2, 1), dot(3, 1),
      dot(4, 1), dot(5, 1), dot(6, 1),
      dot(7, 1), dot(8, 1), dot(9, 1),
      dot(1, 2), dot(2, 2), dot(3, 2),
      dot(5, 2),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: dot(5, 3),
      isConcealed: true,
      isSelfDrawn: true,
      flowers: [flowerTile('Plum', 1)],
    }));
    expect(names(result)).toEqual(
      expect.arrayContaining(['Pure One Suit', 'Self-Drawn', 'Concealed Hand']),
    );
    const stacked = result.fans
      .filter(f => f.name === 'Pure One Suit' || f.name === 'Self-Drawn' || f.name === 'Concealed Hand')
      .reduce((s, f) => s + f.fan, 0);
    expect(stacked).toBe(9);
  });
});

// ============================================================
// 14. Win-method bonuses each add exactly 1
// ============================================================

describe('win-method bonuses', () => {
  // A known 3-faan base hand: claimed pung of dots + pure one suit is
  // overkill, so use a plain All Pungs base and read the delta. Simpler:
  // measure the same hand with and without the win method.
  function basePungHand(): { hand: Tile[]; win: Tile } {
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3),
      bam(2, 1), bam(2, 2), bam(2, 3),
      char(3, 1), char(3, 2), char(3, 3),
      dot(7, 1), dot(7, 2), dot(7, 3),
      char(9, 1),
    ];
    return { hand, win: char(9, 2) };
  }

  const methodToFan: [ScoringContext['winMethod'], string][] = [
    ['robKong', 'Robbing the Kong'],
    ['kongReplacement', 'Win on Kong Replacement'],
    ['lastTileDraw', 'Last Tile Draw'],
    ['lastTileClaim', 'Last Tile Claim'],
  ];

  for (const [method, fanName] of methodToFan) {
    it(`${method} adds exactly 1 faan (${fanName})`, () => {
      const { hand, win } = basePungHand();
      const common = {
        winningTile: win,
        seatWind: WindTile.SOUTH,
        prevailingWind: WindTile.WEST,
        flowers: [flowerTile('Plum', 1)],
      } as const;
      const without = calculateScore(hand, [], ctx({ ...common }));
      const withMethod = calculateScore(hand, [], ctx({ ...common, winMethod: method }));
      expect(names(withMethod)).toContain(fanName);
      expect(withMethod.totalFan - without.totalFan).toBe(1);
    });
  }
});

// ============================================================
// 15. Heavenly precedence
// ============================================================

describe('heavenly precedence', () => {
  it('heavenly hand overrides whatever else the tiles would score', () => {
    // Tiles that would otherwise be Big Three Dragons (also a limit), but with
    // isHeavenly set the result must be named Heavenly Hand, not the tile-based limit.
    const hand = [
      dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3),
      dragonTile(DragonTile.GREEN, 1), dragonTile(DragonTile.GREEN, 2), dragonTile(DragonTile.GREEN, 3),
      dragonTile(DragonTile.WHITE, 1), dragonTile(DragonTile.WHITE, 2), dragonTile(DragonTile.WHITE, 3),
      dot(1, 1), dot(2, 1), dot(3, 1),
      bam(5, 1),
    ];
    const result = calculateScore(hand, [], ctx({
      winningTile: bam(5, 2),
      isSelfDrawn: true,
      isConcealed: true,
      isHeavenly: true,
    }));
    expect(result.handName).toBe('Heavenly Hand');
    expect(names(result)).not.toContain('Big Three Dragons');
    expect(result.totalPoints).toBe(LIMIT_POINTS);
  });
});

// ============================================================
// 16. Flowers
// ============================================================

describe('flowers', () => {
  function plainChowHand(): { hand: Tile[]; win: Tile } {
    const hand = [
      dot(1, 1), dot(2, 1), dot(3, 1),
      dot(4, 1), dot(5, 1), dot(6, 1),
      bam(1, 1), bam(2, 1), bam(3, 1),
      char(4, 1), char(5, 1), char(6, 1),
      dot(8, 1),
    ];
    return { hand, win: dot(8, 2) };
  }

  it('zero flowers awards the No Flowers faan', () => {
    const { hand, win } = plainChowHand();
    const result = calculateScore(hand, [], ctx({
      winningTile: win,
      seatWind: WindTile.SOUTH,
      prevailingWind: WindTile.WEST,
      flowers: [],
    }));
    expect(names(result)).toContain('No Flowers');
  });

  it('non-matching flowers score no flower faan and suppress No Flowers', () => {
    // The engine scores a flower only when it matches the seat, when it forms a
    // complete set, or as the No Flowers bonus when none are held. Holding two
    // bonus tiles that match neither the seat nor a full set yields zero flower
    // faan, but still removes the No Flowers bonus.
    const { hand, win } = plainChowHand();
    const result = calculateScore(hand, [], ctx({
      winningTile: win,
      seatWind: WindTile.WEST, // seat #3; held bonuses are #1 and #2
      prevailingWind: WindTile.SOUTH,
      flowers: [flowerTile('Plum', 1), seasonTile('Summer', 2)],
    }));
    expect(names(result)).not.toContain('No Flowers');
    expect(names(result)).not.toContain('Seat Flower');
    expect(names(result)).not.toContain('All Four Flowers');
    expect(names(result)).not.toContain('All Four Seasons');
  });

  it('a seat-matching flower adds a Seat Flower faan (East seat + Plum)', () => {
    const { hand, win } = plainChowHand();
    const result = calculateScore(hand, [], ctx({
      winningTile: win,
      seatWind: WindTile.EAST,
      prevailingWind: WindTile.WEST,
      flowers: [flowerTile('Plum', 1)], // Plum is flower #1 -> matches East (#1)
    }));
    expect(names(result)).toContain('Seat Flower');
    expect(names(result)).not.toContain('No Flowers');
  });

  it('a seat-matching season also adds a Seat Flower faan (East seat + Spring)', () => {
    const { hand, win } = plainChowHand();
    const result = calculateScore(hand, [], ctx({
      winningTile: win,
      seatWind: WindTile.EAST,
      prevailingWind: WindTile.WEST,
      flowers: [seasonTile('Spring', 1)], // Spring is season #1 -> matches East (#1)
    }));
    expect(names(result)).toContain('Seat Flower');
  });

  it('a complete set of all four flowers is worth 2 faan', () => {
    const { hand, win } = plainChowHand();
    const result = calculateScore(hand, [], ctx({
      winningTile: win,
      seatWind: WindTile.WEST,
      prevailingWind: WindTile.SOUTH,
      flowers: [flowerTile('Plum', 1), flowerTile('Orchid', 2), flowerTile('Chrysanthemum', 3), flowerTile('Bamboo', 4)],
    }));
    const setFan = result.fans.find(f => f.name === 'All Four Flowers');
    expect(setFan?.fan).toBe(2);
  });
});

// ============================================================
// 17. Payment math
// ============================================================

describe('payment math', () => {
  it('a 3-faan discard win: discarder pays 128, others pay 64 (base 64)', () => {
    const result = { fans: [], totalFan: 3, basePoints: 8, totalPoints: 64, melds: [], pair: [] };
    const payment = calculatePayment(result, 0, 2, false);
    const discarder = payment.payments.find(p => p.fromPlayerIndex === 2);
    const others = payment.payments.filter(p => p.fromPlayerIndex !== 2);
    expect(discarder?.amount).toBe(128);
    expect(others.every(p => p.amount === 64)).toBe(true);
  });

  it('a 4-faan self-draw: every opponent pays 256 (base 128)', () => {
    const result = { fans: [], totalFan: 4, basePoints: 8, totalPoints: 128, melds: [], pair: [] };
    const payment = calculatePayment(result, 0, undefined, true);
    expect(payment.payments).toHaveLength(3);
    expect(payment.payments.every(p => p.amount === 256)).toBe(true);
  });

  it('a limit-hand self-draw doubles the limit base for every opponent', () => {
    // calculatePayment doubles the provided totalPoints for a self-draw, so a
    // limit base of LIMIT_POINTS yields 2 * LIMIT_POINTS from each opponent.
    const result = { fans: [], totalFan: 13, basePoints: 8, totalPoints: LIMIT_POINTS, melds: [], pair: [] };
    const payment = calculatePayment(result, 0, undefined, true);
    expect(payment.payments.every(p => p.amount === LIMIT_POINTS * 2)).toBe(true);
  });
});

// ============================================================
// 18. meetsMinFaan boundary
// ============================================================

describe('meetsMinFaan boundary', () => {
  // A clean 3-faan hand. Because every no-flower win also earns No Flowers (1),
  // a structural 2-faan core lands the total on exactly 3: a Red Dragon pung (1)
  // plus a South seat-wind pung (1, with seat South / round West so prevailing
  // does not also fire) plus No Flowers (1). Mixed suits, so no one-suit faan.
  function threeFaanHand(): { hand: Tile[]; win: Tile } {
    const hand = [
      dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3),
      windTile(WindTile.SOUTH, 1), windTile(WindTile.SOUTH, 2), windTile(WindTile.SOUTH, 3),
      dot(1, 1), dot(2, 1), dot(3, 1),
      bam(4, 1), bam(5, 1), bam(6, 1),
      char(7, 1),
    ];
    return { hand, win: char(7, 2) };
  }

  it('a hand worth exactly 3 faan passes minFaan 3', () => {
    const { hand, win } = threeFaanHand();
    const common = { winningTile: win, seatWind: WindTile.SOUTH, prevailingWind: WindTile.WEST, flowers: [] };
    const result = calculateScore(hand, [], ctx({ ...common }));
    expect(result.totalFan).toBe(3);
    expect(meetsMinFaan(hand, [], ctx({ ...common, minFaan: 3 }))).toBe(true);
  });

  it('a hand worth 2 faan fails minFaan 3', () => {
    // Mixed One Suit alone is worth 3, so build a 2-faan hand: a single dragon
    // pung (1) in a hand that also earns No Flowers (1) and nothing else.
    const hand = [
      dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3),
      dot(1, 1), dot(2, 1), dot(3, 1),
      bam(4, 1), bam(5, 1), bam(6, 1),
      char(4, 1), char(5, 1), char(6, 1),
      dot(8, 1),
    ];
    const win = dot(8, 2);
    // Red Dragon (1) + No Flowers (1) = 2 faan. Mixed suits, so no one-suit fan;
    // not all chows (dragon pung present); seat/round give no wind fan.
    const result = calculateScore(hand, [], ctx({
      winningTile: win, seatWind: WindTile.SOUTH, prevailingWind: WindTile.WEST, flowers: [],
    }));
    expect(result.totalFan).toBe(2);
    expect(meetsMinFaan(hand, [], ctx({
      winningTile: win, seatWind: WindTile.SOUTH, prevailingWind: WindTile.WEST, flowers: [], minFaan: 3,
    }))).toBe(false);
  });
});

// ---- local helper: season tile (testHelpers only exposes flowerTile) ----
function seasonTile(name: string, index: number): Tile {
  return {
    id: `season_${index}`,
    suit: TileSuit.SEASON,
    type: TileType.BONUS,
    season: name,
    nameEnglish: `${name} Season`,
    nameChinese: '',
    nameJapanese: '',
    assetPath: '',
  };
}
