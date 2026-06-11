/**
 * SPIKE: seed + action-log replay determinism proof-of-concept.
 *
 * Verifies empirically that:
 *   1. Same seed → identical wall + player hands (deal is deterministic).
 *   2. Same seed + same action sequence → identical end state (action replay works).
 *   3. getAIDecision is stateless/deterministic for identical inputs.
 *
 * Non-deterministic fields discovered here are documented inline and feed
 * directly into plans/spikes/replay-format-design.md §5.
 */

import { describe, it, expect } from 'vitest';
import { initializeGame, applyAction, GameOptions } from '../turnManager';
import { gameStateToJson } from '@/models/GameState';
import { GameState, GamePhase } from '@/models/GameState';
import { getAIDecision } from '../ai';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * Strip every non-deterministic timestamp field from a serialised state so two
 * states initialised at different wall-clock times can be compared structurally.
 *
 * Non-deterministic fields identified in this spike (§5 in the design doc):
 *   - createdAt      — wall-clock time of initializeGame call
 *   - turnStartedAt  — wall-clock time the current turn began
 *   - finishedAt     — wall-clock time the hand ended (present when phase=FINISHED)
 *   - turnHistory[*].timestamp — wall-clock time of each recorded turn
 *
 * All other fields on GameState are derived deterministically from (seed, actions).
 */
function stripTimestamps(json: Record<string, unknown>): Record<string, unknown> {
  const { createdAt, turnStartedAt, finishedAt, ...rest } = json as Record<string, unknown>;
  void createdAt; void turnStartedAt; void finishedAt; // intentionally excluded
  const turnHistory = Array.isArray(rest.turnHistory)
    ? (rest.turnHistory as Record<string, unknown>[]).map(({ timestamp, ...t }) => { void timestamp; return t; })
    : rest.turnHistory;
  return { ...rest, turnHistory };
}

/** Drive at most `steps` applyAction calls and return the resulting state. */
function driveSteps(initial: GameState, steps: number): GameState {
  let state = initial;
  for (let i = 0; i < steps && state.phase === GamePhase.PLAYING; i++) {
    const current = state.players[state.currentPlayerIndex];
    if (state.turnPhase === 'draw') {
      const next = applyAction(state, current.id, { type: 'DRAW' });
      if (!next) break;
      state = next;
    } else if (state.turnPhase === 'discard') {
      const decision = getAIDecision(state, state.currentPlayerIndex);
      const next = applyAction(state, current.id, decision.action);
      if (!next) break;
      state = next;
    } else if (state.turnPhase === 'claim') {
      const next = applyAction(state, current.id, { type: 'PASS' });
      if (!next) break;
      state = next;
    } else {
      break;
    }
  }
  return state;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('replay determinism spike', () => {
  it('case 1: same seed produces identical wall and player hands after initializeGame', () => {
    const a = initializeGame(allAIOptions('spike-1'));
    const b = initializeGame(allAIOptions('spike-1'));

    // Walls should be byte-for-byte equal
    expect(a.wall.map(t => t.id)).toEqual(b.wall.map(t => t.id));
    expect(a.deadWall.map(t => t.id)).toEqual(b.deadWall.map(t => t.id));

    // Every player's dealt hand should be identical
    for (let i = 0; i < 4; i++) {
      expect(a.players[i].hand.map(t => t.id)).toEqual(b.players[i].hand.map(t => t.id));
    }

    // Bonus: different seed → different deal (sanity check that RNG is actually seeded)
    const c = initializeGame(allAIOptions('spike-2'));
    expect(a.wall.map(t => t.id)).not.toEqual(c.wall.map(t => t.id));
  });

  it('case 2: same seed + same action sequence produces identical end state', () => {
    const STEPS = 40; // enough to cover a draw-discard-claim cycle several times

    const stateA = driveSteps(initializeGame(allAIOptions('spike-replay')), STEPS);
    const stateB = driveSteps(initializeGame(allAIOptions('spike-replay')), STEPS);

    const jsonA = stripTimestamps(gameStateToJson(stateA));
    const jsonB = stripTimestamps(gameStateToJson(stateB));

    // After stripping timestamps, all structural state must be identical
    expect(jsonA).toEqual(jsonB);
  });

  it('case 3: getAIDecision is stateless — repeated calls on identical state return the same decision', () => {
    const state = initializeGame(allAIOptions('spike-ai'));
    // Advance to a discard phase so there's an interesting decision to make
    const afterDraw = applyAction(state, state.players[0].id, { type: 'DRAW' });
    expect(afterDraw).not.toBeNull();
    expect(afterDraw!.turnPhase).toBe('discard');

    const dec1 = getAIDecision(afterDraw!, 0);
    const dec2 = getAIDecision(afterDraw!, 0);
    const dec3 = getAIDecision(afterDraw!, 0);

    expect(dec1.action).toEqual(dec2.action);
    expect(dec2.action).toEqual(dec3.action);
  });
});
