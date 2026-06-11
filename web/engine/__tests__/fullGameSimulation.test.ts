/**
 * Full-game simulation: drives 4 AI players through complete hands and full
 * matches purely through the engine, asserting structural invariants that
 * must hold no matter how the game unfolds:
 * - 144-tile conservation at every step
 * - games terminate (win or wall-exhaustion draw)
 * - payments are zero-sum
 * - dealer rotation and prevailing wind progress legally
 * - determinism: the same seed replays to the identical outcome
 */

import { describe, it, expect } from 'vitest';
import { initializeGame, applyAction, getLegalClaims, buildWinScoringContext, GameOptions } from '../turnManager';
import { initializeMatch, advanceMatch } from '../matchManager';
import { calculateScore, calculatePayment } from '../scoring';
import { getAIDecision, getAIClaimDecision } from '../ai';
import { GameState, GamePhase } from '@/models/GameState';
import { ScoringResult } from '../types';

function allAIOptions(seed: string): GameOptions {
  return {
    playerNames: ['P0', 'P1', 'P2', 'P3'],
    aiPlayers: [
      { index: 0, difficulty: 'easy' },
      { index: 1, difficulty: 'medium' },
      { index: 2, difficulty: 'hard' },
      { index: 3, difficulty: 'medium' },
    ],
    humanPlayerId: 'p0',
    minFaan: 1,
    seed,
  };
}

function countTiles(state: GameState): number {
  const inHands = state.players.reduce((s, p) => s + p.hand.length, 0);
  const inMelds = state.players.reduce((s, p) => s + p.melds.reduce((m, meld) => m + meld.tiles.length, 0), 0);
  const inFlowers = state.players.reduce((s, p) => s + p.flowers.length, 0);
  return inHands + inMelds + inFlowers + state.wall.length + state.deadWall.length + state.discardPile.length;
}

/** Drive a single hand to completion through the engine. Returns final state. */
function playHand(initial: GameState, maxSteps = 2000): GameState {
  let state = initial;
  let steps = 0;

  while (state.phase === GamePhase.PLAYING && steps < maxSteps) {
    steps++;
    expect(countTiles(state)).toBe(144);

    const current = state.players[state.currentPlayerIndex];

    if (state.turnPhase === 'draw') {
      const next = applyAction(state, current.id, { type: 'DRAW' });
      expect(next).not.toBeNull();
      state = next!;
    } else if (state.turnPhase === 'discard') {
      const decision = getAIDecision(state, state.currentPlayerIndex);
      let next = applyAction(state, current.id, decision.action);
      if (!next) {
        // AI suggested an illegal action — that itself is a bug
        throw new Error(
          `Illegal AI action by ${current.id}: ${JSON.stringify(decision.action.type)} (${decision.reasoning})`,
        );
      }
      state = next;
    } else if (state.turnPhase === 'claim') {
      // Current player in claim phase decides claim or pass
      const claims = getLegalClaims(state, state.currentPlayerIndex);
      const decision = claims.length > 0
        ? getAIClaimDecision(state, state.currentPlayerIndex, claims)
        : { action: { type: 'PASS' as const } };
      let next = applyAction(state, current.id, decision.action);
      if (!next) {
        // Claim may have been invalidated (e.g. min-faan gate); pass instead
        next = applyAction(state, current.id, { type: 'PASS' });
      }
      expect(next).not.toBeNull();
      state = next!;
    } else {
      throw new Error(`Unexpected turn phase: ${state.turnPhase}`);
    }
  }

  expect(steps).toBeLessThan(maxSteps);
  expect(state.phase).toBe(GamePhase.FINISHED);
  return state;
}

function scoreHand(state: GameState): ScoringResult | null {
  if (!state.winnerId) return null;
  const winner = state.players.find(p => p.id === state.winnerId)!;
  const winnerIndex = state.players.findIndex(p => p.id === state.winnerId);
  const ctx = buildWinScoringContext(state)!;
  const result = calculateScore(winner.hand, winner.melds, ctx);
  result.payment = calculatePayment(result, winnerIndex, ctx.discarderIndex, ctx.isSelfDrawn);
  return result;
}

describe('full-game simulation', () => {
  const seeds = ['sim-alpha', 'sim-bravo', 'sim-charlie', 'sim-delta', 'sim-echo'];

  it.each(seeds)('hand with seed %s terminates legally with 144 tiles conserved', (seed) => {
    const state = playHand(initializeGame(allAIOptions(seed)));
    expect(countTiles(state)).toBe(144);

    if (state.winnerId) {
      const result = scoreHand(state)!;
      expect(result.totalFan).toBeGreaterThanOrEqual(0);
      expect(result.totalPoints).toBeGreaterThanOrEqual(8);
      expect(result.totalPoints).toBeLessThanOrEqual(8192);
      // Payments are zero-sum by construction (winner receives all)
      const totalPaid = result.payment!.payments.reduce((s, p) => s + p.amount, 0);
      expect(totalPaid).toBeGreaterThan(0);
      for (const p of result.payment!.payments) {
        expect(p.toPlayerIndex).toBe(state.players.findIndex(pl => pl.id === state.winnerId));
      }
    } else {
      // Draw game: settlement must be zero-sum
      expect(state.drawResult).toBeDefined();
      const sum = state.drawResult!.scoreChanges.reduce((s, c) => s + c, 0);
      expect(Math.abs(sum)).toBeLessThanOrEqual(3); // floor() rounding slack
    }
  });

  it('same seed replays to the identical outcome', () => {
    const a = playHand(initializeGame(allAIOptions('replay-test')));
    const b = playHand(initializeGame(allAIOptions('replay-test')));
    expect(a.winnerId).toBe(b.winnerId);
    expect(a.wall.length).toBe(b.wall.length);
    expect(a.turnHistory.length).toBe(b.turnHistory.length);
    expect(a.players.map(p => p.hand.map(t => t.id))).toEqual(
      b.players.map(p => p.hand.map(t => t.id)),
    );
  });

  it('a full quick match (East round) advances dealership legally', () => {
    let match = initializeMatch({
      mode: 'quick',
      difficulty: 'medium',
      playerNames: ['P0', 'P1', 'P2', 'P3'],
      humanPlayerId: 'p0',
      minFaan: 1,
    });

    let hands = 0;
    const maxHands = 30;

    while (match.phase !== 'finished' && hands < maxHands) {
      hands++;
      const state = playHand(initializeGame({
        ...allAIOptions(`match-hand-${hands}`),
        dealerIndex: match.currentDealerIndex,
        prevailingWind: match.currentRound,
        seatWinds: undefined,
      }));
      const result = state.winnerId ? scoreHand(state) : null;
      match = advanceMatch(match, state, result);
    }

    expect(match.phase).toBe('finished');
    expect(hands).toBeGreaterThanOrEqual(4);
    // Quick match never leaves the East round
    expect(match.currentRound).toBe('east');
    // Final scores: zero-sum relative to starting stacks
    const sum = match.playerScores.reduce((s, v) => s + v, 0);
    expect(Math.abs(sum - match.startingScore * 4)).toBeLessThanOrEqual(12); // rounding slack
  });
});
