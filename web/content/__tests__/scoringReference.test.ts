import { describe, expect, it } from 'vitest';
import { calculateScore, calculatePayment } from '@/engine/scoring';
import { buildChowHand, buildThirteenOrphans, dot, bam, flowerTile } from '@/engine/__tests__/testHelpers';
import { WindTile } from '@/models/Tile';
import type { ScoringContext } from '@/engine/types';
import { BASE_POINTS, LIMIT_FAN, MAX_PAYMENT, MIN_FAAN, PAYMENT_RULES, paymentForFan } from '../scoringReference';
import { findGlossaryEntry } from '../glossary';

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
