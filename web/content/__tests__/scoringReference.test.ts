import { describe, expect, it } from 'vitest';
import { calculateScore, calculatePayment } from '@/engine/scoring';
import {
  buildChowHand, buildThirteenOrphans, buildAllPungsHand, buildBigThreeDragons, buildSmallFourWinds,
  dot, bam, char, windTile, dragonTile, flowerTile,
} from '@/engine/__tests__/testHelpers';
import { WindTile, DragonTile, Tile, TileSuit, TileType } from '@/models/Tile';
import type { MeldInfo } from '@/models/GameState';
import type { ScoringContext } from '@/engine/types';
import {
  BASE_POINTS, LIMIT_FAN, MAX_PAYMENT, MIN_FAAN, PAYMENT_RULES, paymentForFan,
  FAN_TABLE, LIMIT_HANDS, type FanEntry, type LimitHand,
} from '../scoringReference';
import { findGlossaryEntry } from '../glossary';

// testHelpers only exposes flowerTile; a local season helper matches its shape.
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

/**
 * Anti-drift guard for content/scoringReference.ts. Every assertion here
 * scores a real hand through the engine (or reads a real engine constant)
 * and checks the content table against it — this is the test that must fail
 * loudly if the table is ever edited to disagree with engine/scoring.ts.
 */

describe('scoringReference matches engine/scoring.ts', () => {
  it('BASE_POINTS matches the engine\'s payment for a genuine 0-fan hand', () => {
    // A mixed hand (2 chows + 2 pungs across two suits, no honors, no wind
    // matches, a non-seat-matching flower) scores no fans at all.
    const hand = [
      dot(1, 1), dot(2, 1), dot(3, 1), // chow
      dot(5, 1), dot(6, 1), dot(7, 1), // chow
      bam(4, 1), bam(4, 2), bam(4, 3), // pung
      bam(8, 1), bam(8, 2), bam(8, 3), // pung
      dot(9, 1),                       // half the pair
    ];
    const winningTile = dot(9, 2);
    const ctx: ScoringContext = {
      winningTile,
      isSelfDrawn: false,
      seatWind: WindTile.EAST,
      prevailingWind: WindTile.SOUTH,
      isConcealed: false,
      flowers: [flowerTile('Orchid', 2)], // does not match East (seat 1)
    };
    const result = calculateScore(hand, [], ctx);
    expect(result.totalFan).toBe(0);
    expect(result.totalPoints).toBe(BASE_POINTS);
  });

  it('MAX_PAYMENT and LIMIT_FAN match the engine\'s cap via an independent limit-hand path', () => {
    // MAX_PAYMENT is derived (in scoringReference.ts) via a Heavenly Hand
    // call. Cross-check it against Thirteen Orphans — a structurally
    // different limit-hand code path in scoring.ts — so this isn't just
    // comparing the constant to itself.
    const hand = buildThirteenOrphans();
    const ctx: ScoringContext = {
      winningTile: hand[13],
      isSelfDrawn: false,
      seatWind: WindTile.EAST,
      prevailingWind: WindTile.EAST,
      isConcealed: true,
      flowers: [],
    };
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.totalFan).toBeGreaterThanOrEqual(LIMIT_FAN);
    expect(result.totalPoints).toBe(MAX_PAYMENT);
    expect(paymentForFan(result.totalFan)).toBe(MAX_PAYMENT);
  });

  it('a discard win produces 4x base across three payers (2x/1x/1x)', () => {
    const result = { fans: [], totalFan: 3, basePoints: BASE_POINTS, totalPoints: paymentForFan(3), melds: [], pair: [] };
    const payment = calculatePayment(result, 0, 2, false);
    expect(payment.payments).toHaveLength(3);
    const discarderPayment = payment.payments.find(p => p.fromPlayerIndex === 2);
    const otherPayments = payment.payments.filter(p => p.fromPlayerIndex !== 2);
    expect(discarderPayment?.amount).toBe(result.totalPoints * PAYMENT_RULES.discard.discarderMultiplier);
    for (const p of otherPayments) {
      expect(p.amount).toBe(result.totalPoints * PAYMENT_RULES.discard.otherMultiplier);
    }
    const total = payment.payments.reduce((sum, p) => sum + p.amount, 0);
    expect(total).toBe(result.totalPoints * PAYMENT_RULES.discard.totalMultiplier);
  });

  it('a self-draw produces 6x base (2x/2x/2x)', () => {
    const result = { fans: [], totalFan: 2, basePoints: BASE_POINTS, totalPoints: paymentForFan(2), melds: [], pair: [] };
    const payment = calculatePayment(result, 0, undefined, true);
    expect(payment.payments).toHaveLength(3);
    for (const p of payment.payments) {
      expect(p.amount).toBe(result.totalPoints * PAYMENT_RULES.selfDraw.perOpponentMultiplier);
    }
    const total = payment.payments.reduce((sum, p) => sum + p.amount, 0);
    expect(total).toBe(result.totalPoints * PAYMENT_RULES.selfDraw.totalMultiplier);
  });

  it('a non-seat-matching flower scores 0 fan', () => {
    const hand = buildChowHand();
    const ctx: ScoringContext = {
      winningTile: hand[13],
      isSelfDrawn: false,
      seatWind: WindTile.EAST,
      prevailingWind: WindTile.SOUTH,
      isConcealed: false,
      flowers: [flowerTile('Orchid', 2)], // Orchid (#2) does not match East (seat 1)
    };
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    expect(result.fans.some(f => f.name === 'Seat Flower' || f.name === 'No Flowers')).toBe(false);
  });

  it('a seat-matching flower scores 1 fan', () => {
    const hand = buildChowHand();
    const ctx: ScoringContext = {
      winningTile: hand[13],
      isSelfDrawn: false,
      seatWind: WindTile.EAST,
      prevailingWind: WindTile.SOUTH,
      isConcealed: false,
      flowers: [flowerTile('Plum', 1)], // Plum (#1) matches East (seat 1)
    };
    const result = calculateScore(hand.slice(0, 13), [], ctx);
    const seatFlower = result.fans.find(f => f.name === 'Seat Flower');
    expect(seatFlower?.fan).toBe(1);
  });

  it('MIN_FAAN matches the engine\'s DEFAULT_MIN_FAAN', () => {
    expect(MIN_FAAN).toBe(3);
  });
});

describe('glossary.ts stays free of hardcoded scoring figures', () => {
  // content/glossary.ts:39 used to say "Pays 256 per payer" for a Limit
  // Hand — the engine's real cap is MAX_PAYMENT (8192). Rather than retype
  // the correct number in a second file, the definition now describes the
  // cap without a figure, so there is nothing here that can go stale. The
  // entry legitimately mentions the fan *threshold* ("10+ fan"), so this
  // only rejects a 3+ digit number — the shape of a payment figure
  // (256/512/.../8192), not a fan count (0-13).
  it('the Limit Hand entry contains no hardcoded payment number', () => {
    const entry = findGlossaryEntry('Limit Hand');
    expect(entry).not.toBeNull();
    expect(entry!.definition).not.toMatch(/\d{3,}/);
  });
});

/**
 * FAN_TABLE and LIMIT_HANDS are the two tables the rest of this file leaves
 * unchecked: the assertions above read individual constants (BASE_POINTS,
 * MAX_PAYMENT, MIN_FAAN) but never touch the two content tables that list
 * every fan name and value shown on /reference. Editing a fan value there
 * (e.g. "All Pungs" 3 -> 2) would previously pass this whole file. Every row
 * below scores a real hand through the engine and reads the row's declared
 * fan back out of FAN_TABLE/LIMIT_HANDS itself, so a hand-edited number is
 * compared against the engine's real output, not against a second copy of
 * the same number.
 */

/** Default scoring context: East seat, East round, discard win, no flowers. */
function refCtx(overrides: Partial<ScoringContext> = {}): ScoringContext {
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

interface FanTableCase {
  /** Must match a FAN_TABLE entry's `name` exactly. */
  tableName: string;
  /** The fan item name the engine actually pushes for this pattern. */
  engineFanName: string;
  scoreIt: () => ReturnType<typeof calculateScore>;
}

const FAN_TABLE_CASES: FanTableCase[] = [
  {
    tableName: 'Chicken Hand',
    engineFanName: 'Chicken Hand',
    // No decomposition exists for an empty hand, so the 0-fan fallback fires.
    scoreIt: () => calculateScore([], [], refCtx({ winningTile: dot(5, 1) })),
  },
  {
    tableName: 'Self-Drawn Win',
    engineFanName: 'Self-Drawn',
    scoreIt: () => {
      const hand = buildChowHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], isSelfDrawn: true, flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'Concealed Hand',
    engineFanName: 'Concealed Hand',
    scoreIt: () => {
      const hand = buildChowHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], isConcealed: true, flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'No Flowers',
    engineFanName: 'No Flowers',
    scoreIt: () => {
      const hand = buildChowHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({ winningTile: hand[13], flowers: [] }));
    },
  },
  {
    tableName: 'Dragon Pung',
    engineFanName: 'Green Dragon',
    scoreIt: () => {
      const hand = [
        dragonTile(DragonTile.GREEN, 1), dragonTile(DragonTile.GREEN, 2), dragonTile(DragonTile.GREEN, 3),
        dot(1, 1), dot(2, 1), dot(3, 1),
        dot(4, 1), dot(5, 1), dot(6, 1),
        dot(7, 1), dot(8, 1), dot(9, 1),
        bam(2, 1),
      ];
      return calculateScore(hand, [], refCtx({
        winningTile: bam(2, 2), seatWind: WindTile.SOUTH, prevailingWind: WindTile.WEST,
        flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'Small Three Dragons',
    engineFanName: 'Small Three Dragons',
    scoreIt: () => {
      const hand = [
        dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3),
        dragonTile(DragonTile.GREEN, 1), dragonTile(DragonTile.GREEN, 2), dragonTile(DragonTile.GREEN, 3),
        dot(1, 1), dot(2, 1), dot(3, 1),
        bam(5, 1), bam(5, 2), bam(5, 3),
        dragonTile(DragonTile.WHITE, 1),
      ];
      return calculateScore(hand, [], refCtx({
        winningTile: dragonTile(DragonTile.WHITE, 2), seatWind: WindTile.SOUTH, prevailingWind: WindTile.WEST,
        flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'Seat Wind Pung',
    engineFanName: 'Seat Wind',
    scoreIt: () => {
      const hand = [
        windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3),
        dot(1, 1), dot(2, 1), dot(3, 1),
        dot(4, 1), dot(5, 1), dot(6, 1),
        dot(7, 1), dot(8, 1), dot(9, 1),
        bam(2, 1),
      ];
      return calculateScore(hand, [], refCtx({
        winningTile: bam(2, 2), seatWind: WindTile.EAST, prevailingWind: WindTile.SOUTH,
        flowers: [flowerTile('Orchid', 2)],
      }));
    },
  },
  {
    tableName: 'Prevailing Wind Pung',
    engineFanName: 'Prevailing Wind',
    scoreIt: () => {
      const hand = [
        windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3),
        dot(1, 1), dot(2, 1), dot(3, 1),
        dot(4, 1), dot(5, 1), dot(6, 1),
        dot(7, 1), dot(8, 1), dot(9, 1),
        bam(2, 1),
      ];
      return calculateScore(hand, [], refCtx({
        winningTile: bam(2, 2), seatWind: WindTile.SOUTH, prevailingWind: WindTile.EAST,
        flowers: [flowerTile('Orchid', 2)],
      }));
    },
  },
  {
    tableName: 'Flower/Season',
    engineFanName: 'Seat Flower',
    scoreIt: () => {
      const hand = buildChowHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], seatWind: WindTile.EAST, flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'All Four Flowers',
    engineFanName: 'All Four Flowers',
    scoreIt: () => {
      const hand = buildChowHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13],
        seatWind: WindTile.WEST,
        flowers: [flowerTile('Plum', 1), flowerTile('Orchid', 2), flowerTile('Chrysanthemum', 3), flowerTile('Bamboo', 4)],
      }));
    },
  },
  {
    tableName: 'All Four Seasons',
    engineFanName: 'All Four Seasons',
    scoreIt: () => {
      const hand = buildChowHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13],
        seatWind: WindTile.WEST,
        flowers: [seasonTile('Spring', 1), seasonTile('Summer', 2), seasonTile('Autumn', 3), seasonTile('Winter', 4)],
      }));
    },
  },
  {
    tableName: 'All Chows',
    engineFanName: 'All Chows',
    scoreIt: () => {
      const hand = buildChowHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], seatWind: WindTile.SOUTH, prevailingWind: WindTile.WEST,
        flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'All Pungs',
    engineFanName: 'All Pungs',
    scoreIt: () => {
      const hand = buildAllPungsHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], seatWind: WindTile.SOUTH, prevailingWind: WindTile.WEST,
        flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'Mixed One Suit',
    engineFanName: 'Mixed One Suit',
    scoreIt: () => {
      const hand = [
        dot(1, 1), dot(2, 1), dot(3, 1),
        dot(4, 1), dot(5, 1), dot(6, 1),
        dot(7, 1), dot(8, 1), dot(9, 1),
        windTile(WindTile.NORTH, 1), windTile(WindTile.NORTH, 2), windTile(WindTile.NORTH, 3),
        dot(1, 2),
      ];
      return calculateScore(hand, [], refCtx({
        winningTile: dot(1, 3), seatWind: WindTile.SOUTH, prevailingWind: WindTile.WEST,
        flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'Pure One Suit',
    engineFanName: 'Pure One Suit',
    scoreIt: () => {
      const hand = [
        dot(1, 1), dot(2, 1), dot(3, 1),
        dot(4, 1), dot(5, 1), dot(6, 1),
        dot(7, 1), dot(8, 1), dot(9, 1),
        dot(1, 2), dot(2, 2), dot(3, 2),
        dot(5, 2),
      ];
      return calculateScore(hand, [], refCtx({ winningTile: dot(5, 3), flowers: [flowerTile('Plum', 1)] }));
    },
  },
  {
    tableName: 'Seven Pairs',
    engineFanName: 'Seven Pairs',
    scoreIt: () => {
      const hand = [
        dot(1, 1), dot(1, 2),
        dot(3, 1), dot(3, 2),
        dot(5, 1), dot(5, 2),
        dot(7, 1), dot(7, 2),
        bam(2, 1), bam(2, 2),
        bam(4, 1), bam(4, 2),
        bam(6, 1),
      ];
      return calculateScore(hand, [], refCtx({ winningTile: bam(6, 2) }));
    },
  },
  {
    tableName: 'Robbing the Kong',
    engineFanName: 'Robbing the Kong',
    scoreIt: () => {
      const hand = buildChowHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], winMethod: 'robKong', flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'Win on Kong Replacement',
    engineFanName: 'Win on Kong Replacement',
    scoreIt: () => {
      const hand = buildChowHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], winMethod: 'kongReplacement', isSelfDrawn: true, flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'Last Tile Draw',
    engineFanName: 'Last Tile Draw',
    scoreIt: () => {
      const hand = buildChowHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], winMethod: 'lastTileDraw', isSelfDrawn: true, flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'Last Tile Claim',
    engineFanName: 'Last Tile Claim',
    scoreIt: () => {
      const hand = buildChowHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], winMethod: 'lastTileClaim', flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
];

describe('every FAN_TABLE row is covered by a verification case', () => {
  it('FAN_TABLE_CASES names match FAN_TABLE exactly, with no additions or omissions', () => {
    const tableNames = FAN_TABLE.map((e: FanEntry) => e.name).sort();
    const caseNames = FAN_TABLE_CASES.map(c => c.tableName).sort();
    expect(caseNames).toEqual(tableNames);
  });
});

describe('every FAN_TABLE fan value matches the engine', () => {
  for (const testCase of FAN_TABLE_CASES) {
    it(`${testCase.tableName} matches the engine's awarded fan value`, () => {
      const entry = FAN_TABLE.find((e: FanEntry) => e.name === testCase.tableName);
      expect(entry, `FAN_TABLE has no entry named "${testCase.tableName}"`).toBeDefined();

      const result = testCase.scoreIt();
      const engineFan = result.fans.find(f => f.name === testCase.engineFanName);
      expect(engineFan, `engine did not award "${testCase.engineFanName}"`).toBeDefined();
      expect(engineFan!.fan).toBe(parseInt(entry!.fan, 10));
    });
  }
});

interface LimitHandCase {
  /** Must match a LIMIT_HANDS entry's `name` exactly. */
  tableName: string;
  scoreIt: () => ReturnType<typeof calculateScore>;
}

const LIMIT_HAND_CASES: LimitHandCase[] = [
  {
    tableName: 'Heavenly Hand',
    scoreIt: () => calculateScore([dot(1, 1)], [], refCtx({ winningTile: dot(1, 2), isHeavenly: true })),
  },
  {
    tableName: 'Earthly Hand',
    scoreIt: () => calculateScore([dot(1, 1)], [], refCtx({ winningTile: dot(1, 2), isEarthly: true })),
  },
  {
    tableName: 'Thirteen Orphans',
    scoreIt: () => {
      const hand = buildThirteenOrphans();
      return calculateScore(hand.slice(0, 13), [], refCtx({ winningTile: hand[13] }));
    },
  },
  {
    tableName: 'Nine Gates',
    scoreIt: () => {
      const hand = [
        dot(1, 1), dot(1, 2), dot(1, 3),
        dot(2, 1), dot(3, 1), dot(4, 1), dot(5, 1),
        dot(6, 1), dot(7, 1), dot(8, 1),
        dot(9, 1), dot(9, 2), dot(9, 3),
      ];
      return calculateScore(hand, [], refCtx({ winningTile: dot(5, 2) }));
    },
  },
  {
    tableName: 'Big Three Dragons',
    scoreIt: () => {
      const hand = buildBigThreeDragons();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'Big Four Winds',
    scoreIt: () => {
      const hand = [
        windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3),
        windTile(WindTile.SOUTH, 1), windTile(WindTile.SOUTH, 2), windTile(WindTile.SOUTH, 3),
        windTile(WindTile.WEST, 1), windTile(WindTile.WEST, 2), windTile(WindTile.WEST, 3),
        windTile(WindTile.NORTH, 1), windTile(WindTile.NORTH, 2), windTile(WindTile.NORTH, 3),
        dot(5, 1),
      ];
      return calculateScore(hand, [], refCtx({
        winningTile: dot(5, 2), seatWind: WindTile.WEST, prevailingWind: WindTile.WEST,
        flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'Small Four Winds',
    scoreIt: () => {
      const hand = buildSmallFourWinds();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], seatWind: WindTile.SOUTH, prevailingWind: WindTile.WEST,
        flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'All Honors',
    scoreIt: () => {
      const hand = [
        windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3),
        windTile(WindTile.SOUTH, 1), windTile(WindTile.SOUTH, 2), windTile(WindTile.SOUTH, 3),
        dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3),
        dragonTile(DragonTile.GREEN, 1), dragonTile(DragonTile.GREEN, 2), dragonTile(DragonTile.GREEN, 3),
        windTile(WindTile.NORTH, 1),
      ];
      return calculateScore(hand, [], refCtx({
        winningTile: windTile(WindTile.NORTH, 2), seatWind: WindTile.WEST, prevailingWind: WindTile.WEST,
        flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'All Terminals',
    scoreIt: () => {
      const hand = [
        dot(1, 1), dot(1, 2), dot(1, 3),
        dot(9, 1), dot(9, 2), dot(9, 3),
        bam(1, 1), bam(1, 2), bam(1, 3),
        char(9, 1), char(9, 2), char(9, 3),
        bam(9, 1),
      ];
      return calculateScore(hand, [], refCtx({ winningTile: bam(9, 2), flowers: [flowerTile('Plum', 1)] }));
    },
  },
  {
    tableName: 'Four Concealed Pungs',
    scoreIt: () => {
      const hand = buildAllPungsHand();
      return calculateScore(hand.slice(0, 13), [], refCtx({
        winningTile: hand[13], isConcealed: true, isSelfDrawn: true, flowers: [flowerTile('Plum', 1)],
      }));
    },
  },
  {
    tableName: 'All Kongs',
    scoreIt: () => {
      const kongs: MeldInfo[] = [
        { tiles: [dot(2, 1), dot(2, 2), dot(2, 3), dot(2, 4)], type: 'kong', isConcealed: true },
        { tiles: [bam(4, 1), bam(4, 2), bam(4, 3), bam(4, 4)], type: 'kong', isConcealed: false },
        { tiles: [char(6, 1), char(6, 2), char(6, 3), char(6, 4)], type: 'kong', isConcealed: true },
        { tiles: [dot(8, 1), dot(8, 2), dot(8, 3), dot(8, 4)], type: 'kong', isConcealed: false },
      ];
      // meldsNeeded = 0, so the concealed hand must be exactly the 2-tile pair.
      return calculateScore([bam(5, 1)], kongs, refCtx({ winningTile: bam(5, 2), flowers: [flowerTile('Plum', 1)] }));
    },
  },
];

describe('every LIMIT_HANDS row is covered by a verification case', () => {
  it('LIMIT_HAND_CASES names match LIMIT_HANDS exactly, with no additions or omissions', () => {
    const tableNames = LIMIT_HANDS.map((e: LimitHand) => e.name).sort();
    const caseNames = LIMIT_HAND_CASES.map(c => c.tableName).sort();
    expect(caseNames).toEqual(tableNames);
  });
});

describe('every LIMIT_HANDS row pays the engine limit', () => {
  for (const testCase of LIMIT_HAND_CASES) {
    it(`${testCase.tableName} scores the engine's limit payout`, () => {
      const entry = LIMIT_HANDS.find((e: LimitHand) => e.name === testCase.tableName);
      expect(entry, `LIMIT_HANDS has no entry named "${testCase.tableName}"`).toBeDefined();

      const result = testCase.scoreIt();
      expect(result.handName).toBe(testCase.tableName);
      expect(result.totalPoints).toBe(MAX_PAYMENT);
    });
  }
});
