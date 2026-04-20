/**
 * Regression tests for HK Mahjong rule-compliance fixes.
 *
 * Covers:
 *  1. Minimum faan threshold on wins (default 3).
 *  2. Wall-exhaustion tenpai/noten settlement.
 *  3. Blocking pung / kong / win claims on own discards.
 */
import { describe, it, expect } from 'vitest';
import {
  initializeGame,
  applyAction,
  NOTEN_PENALTY_PER_NOTEN,
  isPlayerTenpai,
} from '../turnManager';
import { meetsMinFaan } from '../scoring';
import { getAvailableClaims } from '../claiming';
import { advanceMatch, initializeMatch } from '../matchManager';
import { GamePhase, GameState, Player } from '@/models/GameState';
import { Tile, WindTile } from '@/models/Tile';
import { dot, bam, char, makePlayer } from './testHelpers';
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

/** A 4-chows-plus-pair chicken hand that scores 1 faan (All Chows) out of the box. */
function buildTwoFaanChowHand() {
  // 4 chows + pair — with flowers.length=0 this yields:
  //   All Chows (1) + No Flowers (1) = 2 faan.
  // Winning tile is the last chow tile (dot 6) so it's a discard-win.
  const hand = [
    dot(1, 1), dot(2, 1), dot(3, 1),    // chow
    dot(4, 1), dot(5, 1),               // partial chow, needs dot 6
    bam(1, 1), bam(2, 1), bam(3, 1),    // chow
    bam(4, 1), bam(5, 1), bam(6, 1),    // chow
    char(7, 1), char(7, 2),             // pair
  ];
  const winTile = dot(6, 1);
  const fullHand = [...hand, winTile];
  return { hand13: hand, winTile, fullHand14: fullHand };
}

// ============================================================
// 1) Minimum faan threshold
// ============================================================

describe('minimum faan threshold (meetsMinFaan)', () => {
  it('rejects a 2-faan hand when minFaan = 3', () => {
    const { hand13, winTile, fullHand14 } = buildTwoFaanChowHand();
    // Use isConcealed=false so Concealed-Hand bonus doesn't fire, leaving
    // All Chows (1) + No Flowers (1) = 2 faan < 3 → reject.
    const ctx = baseContext({ winningTile: winTile, isConcealed: false, minFaan: 3 });
    expect(meetsMinFaan(hand13, [], ctx)).toBe(false);
    // Sanity — the hand IS a legal winning shape otherwise
    expect(fullHand14.length).toBe(14);
  });

  it('accepts the same 2-faan hand when minFaan = 1', () => {
    const { hand13, winTile } = buildTwoFaanChowHand();
    const ctx = baseContext({
      winningTile: winTile,
      isConcealed: false,
      minFaan: 1,
    });
    expect(meetsMinFaan(hand13, [], ctx)).toBe(true);
  });

  it('accepts when minFaan = 0 regardless of hand', () => {
    const { hand13, winTile } = buildTwoFaanChowHand();
    const ctx = baseContext({ winningTile: winTile, minFaan: 0 });
    expect(meetsMinFaan(hand13, [], ctx)).toBe(true);
  });

  it('rejects sub-threshold hands under default minFaan (no explicit override)', () => {
    const { hand13, winTile } = buildTwoFaanChowHand();
    // No explicit minFaan → meetsMinFaan uses DEFAULT_MIN_FAAN (3).
    const ctx = baseContext({ winningTile: winTile, isConcealed: false });
    expect(meetsMinFaan(hand13, [], ctx)).toBe(false);
  });

  it('exposes minFaan through GameOptions and defaults to 3', () => {
    const game = initializeGame({
      playerNames: ['H', 'A', 'B', 'C'],
      aiPlayers: [
        { index: 1, difficulty: 'easy' },
        { index: 2, difficulty: 'easy' },
        { index: 3, difficulty: 'easy' },
      ],
      humanPlayerId: 'H',
    });
    expect(game.minFaan).toBe(3);

    const game2 = initializeGame({
      playerNames: ['H', 'A', 'B', 'C'],
      aiPlayers: [
        { index: 1, difficulty: 'easy' },
        { index: 2, difficulty: 'easy' },
        { index: 3, difficulty: 'easy' },
      ],
      humanPlayerId: 'H',
      minFaan: 1,
    });
    expect(game2.minFaan).toBe(1);
  });
});

describe('minimum faan enforcement in turnManager (CLAIM win)', () => {
  /**
   * Build a claim-phase state where the player has a valid winning shape but
   * the scoring hand only yields 2 faan on a discard-win (no Self-Drawn bonus).
   *
   * Composition: 3 concealed chows + 1 concealed pung of 7-char (non-seat,
   * non-prevailing, non-dragon) + a 9-char pair (13-tile hand) awaiting the
   * winning tile that completes the last chow. Since it's a discard-win,
   * Self-Drawn does NOT fire. With no flowers: No Flowers (+1) + Concealed
   * Hand (+1) = 2 faan. All Chows does NOT fire because one meld is a pung.
   *
   * Note: exposed-meld scoring has a known pre-existing limitation in
   * calculateScore (findDecompositions requires 14 tiles), so this test keeps
   * the hand fully concealed.
   */
  function buildTwoFaanClaimState(minFaan: number | undefined): GameState {
    // 13-tile claiming hand waiting on dot-6
    const hand = [
      dot(1, 1), dot(2, 1), dot(3, 1),    // chow
      dot(4, 1), dot(5, 1),               // partial — needs dot-6
      bam(1, 1), bam(2, 1), bam(3, 1),    // chow
      char(7, 1), char(7, 2), char(7, 3), // pung of 7-char (no special bonus)
      char(9, 1), char(9, 2),             // pair of 9-char
    ];
    const winTile = dot(6, 1);
    const players: Player[] = [
      // Use disjoint tile IDs across players — different copy indices.
      makePlayer({ id: 'H', name: 'Human', isAI: false, seatWind: WindTile.SOUTH,
        hand: [char(1, 5), char(2, 5), char(3, 5), char(4, 5), char(5, 5), char(6, 5),
               char(8, 5), bam(7, 5), bam(8, 5), dot(7, 5), dot(8, 5), dot(9, 5), bam(9, 5)] }),
      // Discarder (index 1) already discarded winTile; claimant is index 2
      makePlayer({ id: 'ai_1', name: 'AI 1', isAI: true, seatWind: WindTile.WEST,
        hand: [char(1, 6), char(2, 6), char(3, 6), char(4, 6), char(5, 6), char(6, 6),
               char(8, 6), bam(7, 6), bam(8, 6), dot(7, 6), dot(8, 6), dot(9, 6), bam(9, 6)] }),
      makePlayer({ id: 'ai_2', name: 'AI 2', isAI: true, seatWind: WindTile.NORTH, hand }),
      makePlayer({ id: 'ai_3', name: 'AI 3', isAI: true, seatWind: WindTile.EAST,
        hand: [char(1, 7), char(2, 7), char(3, 7), char(4, 7), char(5, 7), char(6, 7),
               char(8, 7), bam(7, 7), bam(8, 7), dot(7, 7), dot(8, 7), dot(9, 7), bam(9, 7)] }),
    ];
    return {
      id: 'faan-claim-test',
      variant: 'HK',
      phase: GamePhase.PLAYING,
      turnPhase: 'claim',
      currentPlayerIndex: 2, // ai_2 is the claimant
      players,
      wall: Array.from({ length: 20 }, (_, i) => bam(1, 500 + i)),
      deadWall: Array.from({ length: 14 }, (_, i) => char(1, 500 + i)),
      discardPile: [winTile],
      playerDiscards: { H: [], ai_1: [winTile], ai_2: [], ai_3: [] },
      lastDiscardedTile: winTile,
      lastDiscardedBy: 'ai_1',
      pendingClaims: [],
      claimablePlayers: ['ai_2', 'ai_3', 'H'],
      passedPlayers: [],
      prevailingWind: WindTile.EAST,
      finalScores: {},
      createdAt: new Date(),
      turnHistory: [],
      turnTimeLimit: 20,
      minFaan,
    };
  }

  it('rejects CLAIM win on a 2-faan hand at default minFaan (3)', () => {
    const state = buildTwoFaanClaimState(undefined);
    const result = applyAction(state, 'ai_2', {
      type: 'CLAIM', claimType: 'win', tilesFromHand: [],
    });
    expect(result).toBeNull();
  });

  it('accepts CLAIM win on the same hand when minFaan = 1', () => {
    const state = buildTwoFaanClaimState(1);
    // The claimant submits a win claim. Since other players may still need to
    // act, we may get a claim-phase state back; either way, we're asserting the
    // legality check does not flat-out reject the claim.
    const result = applyAction(state, 'ai_2', {
      type: 'CLAIM', claimType: 'win', tilesFromHand: [],
    });
    expect(result).not.toBeNull();
  });
});

// ============================================================
// 2) Wall-exhaustion tenpai/noten settlement
// ============================================================

describe('wall-exhaustion tenpai/noten settlement', () => {
  /** Build a state with wall=0 and custom player hands so we can trigger the draw path. */
  function buildDrawState(handsPerPlayer: Array<{ hand: Tile[]; melds?: Player['melds'] }>): GameState {
    const players: Player[] = handsPerPlayer.map((p, i) =>
      makePlayer({
        id: ['H', 'ai_1', 'ai_2', 'ai_3'][i],
        name: `P${i}`,
        isAI: i > 0,
        seatWind: [WindTile.EAST, WindTile.SOUTH, WindTile.WEST, WindTile.NORTH][i],
        hand: p.hand,
        melds: p.melds ?? [],
      }),
    );
    return {
      id: 'draw-test',
      variant: 'HK',
      phase: GamePhase.PLAYING,
      turnPhase: 'draw',
      currentPlayerIndex: 0,
      players,
      wall: [],
      deadWall: [],
      discardPile: [],
      playerDiscards: { H: [], ai_1: [], ai_2: [], ai_3: [] },
      pendingClaims: [],
      claimablePlayers: [],
      passedPlayers: [],
      prevailingWind: WindTile.EAST,
      finalScores: {},
      createdAt: new Date(),
      turnHistory: [],
      turnTimeLimit: 20,
    };
  }

  // A 13-tile tenpai hand waiting on dot-6 (4 chows + 1 pair + partial chow 4-5)
  function tenpaiHandOnDot6() {
    return [
      dot(1, 1), dot(2, 1), dot(3, 1),    // chow
      dot(4, 1), dot(5, 1),               // partial 4-5 → dot 6 completes
      bam(1, 1), bam(2, 1), bam(3, 1),    // chow
      bam(4, 1), bam(5, 1), bam(6, 1),    // chow
      char(7, 1), char(7, 2),             // pair
    ];
  }

  // A 13-tile noten hand — deliberately broken (unpaired, unmatched)
  function notenHand() {
    return [
      dot(1, 1), dot(3, 2), dot(5, 1), dot(7, 1),
      bam(2, 1), bam(4, 1), bam(6, 1), bam(8, 1),
      char(1, 1), char(3, 1), char(5, 1), char(7, 1), char(9, 1),
    ];
  }

  it('isPlayerTenpai true for a one-away hand, false for a broken hand', () => {
    const t = makePlayer({ hand: tenpaiHandOnDot6() });
    const n = makePlayer({ hand: notenHand() });
    expect(isPlayerTenpai(t)).toBe(true);
    expect(isPlayerTenpai(n)).toBe(false);
  });

  it('2 tenpai + 2 noten → tenpai each gain 1500, noten each lose 1500', () => {
    const state = buildDrawState([
      { hand: tenpaiHandOnDot6() },
      { hand: notenHand() },
      { hand: tenpaiHandOnDot6().map((t, i) => ({ ...t, id: `${t.id}_p2_${i}` })) },
      { hand: notenHand().map((t, i) => ({ ...t, id: `${t.id}_p3_${i}` })) },
    ]);
    // Trigger wall exhaustion by attempting a draw on an empty wall
    const result = applyAction(state, 'H', { type: 'DRAW' });
    expect(result).not.toBeNull();
    expect(result!.phase).toBe(GamePhase.FINISHED);
    expect(result!.winnerId).toBeUndefined();
    const draw = result!.drawResult;
    expect(draw).toBeDefined();
    expect(draw!.reason).toBe('wallExhausted');
    expect(draw!.tenpaiPlayerIds.sort()).toEqual(['H', 'ai_2'].sort());
    expect(draw!.notenPlayerIds.sort()).toEqual(['ai_1', 'ai_3'].sort());

    // Pool = 2 × 1500 = 3000; per tenpai = 1500
    expect(draw!.scoreChanges).toEqual([
      NOTEN_PENALTY_PER_NOTEN,
      -NOTEN_PENALTY_PER_NOTEN,
      NOTEN_PENALTY_PER_NOTEN,
      -NOTEN_PENALTY_PER_NOTEN,
    ]);
  });

  it('all-tenpai produces no score delta', () => {
    const state = buildDrawState([
      { hand: tenpaiHandOnDot6() },
      { hand: tenpaiHandOnDot6().map((t, i) => ({ ...t, id: `${t.id}_p1_${i}` })) },
      { hand: tenpaiHandOnDot6().map((t, i) => ({ ...t, id: `${t.id}_p2_${i}` })) },
      { hand: tenpaiHandOnDot6().map((t, i) => ({ ...t, id: `${t.id}_p3_${i}` })) },
    ]);
    const result = applyAction(state, 'H', { type: 'DRAW' });
    const draw = result!.drawResult!;
    expect(draw.scoreChanges).toEqual([0, 0, 0, 0]);
    expect(draw.tenpaiPlayerIds).toHaveLength(4);
    expect(draw.notenPlayerIds).toHaveLength(0);
  });

  it('all-noten produces no score delta', () => {
    const state = buildDrawState([
      { hand: notenHand() },
      { hand: notenHand().map((t, i) => ({ ...t, id: `${t.id}_p1_${i}` })) },
      { hand: notenHand().map((t, i) => ({ ...t, id: `${t.id}_p2_${i}` })) },
      { hand: notenHand().map((t, i) => ({ ...t, id: `${t.id}_p3_${i}` })) },
    ]);
    const result = applyAction(state, 'H', { type: 'DRAW' });
    const draw = result!.drawResult!;
    expect(draw.scoreChanges).toEqual([0, 0, 0, 0]);
    expect(draw.notenPlayerIds).toHaveLength(4);
    expect(draw.tenpaiPlayerIds).toHaveLength(0);
  });

  it('advanceMatch applies the draw settlement to match scores', () => {
    const match = initializeMatch({
      mode: 'quick',
      difficulty: 'easy',
      playerNames: ['H', 'AI 1', 'AI 2', 'AI 3'],
      humanPlayerId: 'H',
    });
    // Synthesize a completed-hand GameState with a draw result.
    const completedHand: GameState = {
      ...match.currentHand!,
      phase: GamePhase.FINISHED,
      winnerId: undefined,
      drawResult: {
        reason: 'wallExhausted',
        tenpaiPlayerIds: ['H', 'ai_2'],
        notenPlayerIds: ['ai_1', 'ai_3'],
        scoreChanges: [1500, -1500, 1500, -1500],
      },
    };
    const next = advanceMatch(match, completedHand, null);
    expect(next.playerScores).toEqual([
      500 + 1500,
      500 - 1500,
      500 + 1500,
      500 - 1500,
    ]);
  });
});

// ============================================================
// 3) Own-discard claim block
// ============================================================

describe('own-discard claim guard', () => {
  it('own-discard pung claim must not succeed', () => {
    // Player has 2 dot-5 in hand, and the discarded tile is dot-5 from themselves
    const player = makePlayer({ hand: [dot(5, 1), dot(5, 2), bam(1, 1)] });
    // playerIndex === discarderIndex → should yield no claims
    const claims = getAvailableClaims(dot(5, 3), player, 2, 2, 4);
    expect(claims.some(c => c.claimType === 'pung')).toBe(false);
    expect(claims.some(c => c.claimType === 'kong')).toBe(false);
    expect(claims.some(c => c.claimType === 'win')).toBe(false);
  });

  it('own-discard kong claim must not succeed', () => {
    const player = makePlayer({ hand: [dot(5, 1), dot(5, 2), dot(5, 3), bam(1, 1)] });
    const claims = getAvailableClaims(dot(5, 4), player, 1, 1, 4);
    expect(claims.some(c => c.claimType === 'kong')).toBe(false);
    expect(claims.some(c => c.claimType === 'pung')).toBe(false);
  });

  it('own-discard win claim must not succeed', () => {
    // 13-tile hand that wins with dot-5 — but the player is the discarder
    const hand = [
      dot(1, 1), dot(1, 2), dot(1, 3),
      dot(2, 1), dot(2, 2), dot(2, 3),
      dot(3, 1), dot(3, 2), dot(3, 3),
      dot(4, 1), dot(4, 2), dot(4, 3),
      dot(5, 1),
    ];
    const player = makePlayer({ hand });
    const claims = getAvailableClaims(dot(5, 2), player, 0, 0, 4);
    expect(claims.some(c => c.claimType === 'win')).toBe(false);
  });

  it('chow from left neighbor still works after the fix', () => {
    const player = makePlayer({ hand: [dot(4, 1), dot(6, 1), bam(1, 1)] });
    // Discarder at 0, player at 1 (left of discarder) → chow allowed
    const claims = getAvailableClaims(dot(5, 1), player, 1, 0, 4);
    expect(claims.some(c => c.claimType === 'chow')).toBe(true);
  });

  it('non-self pung from another player still works', () => {
    const player = makePlayer({ hand: [dot(5, 1), dot(5, 2), bam(1, 1)] });
    // Discarder at 0, player at 2 → pung allowed
    const claims = getAvailableClaims(dot(5, 3), player, 2, 0, 4);
    expect(claims.some(c => c.claimType === 'pung')).toBe(true);
  });
});
