import { describe, it, expect } from 'vitest';
import { getAIDecision, getAIClaimDecision } from '../index';
import { initializeGame } from '../../turnManager';
import { applyAction } from '../../turnManager';
import { getAvailableClaims } from '../../claiming';
import { GamePhase } from '@/models/GameState';
import {
  dot, bam, char, windTile, dragonTile, makePlayer, buildAllPungsHand,
} from '../../__tests__/testHelpers';
import { WindTile, DragonTile, TileType } from '@/models/Tile';

function createTestGame(difficulty: 'easy' | 'medium' | 'hard') {
  return initializeGame({
    playerNames: ['Human', 'AI 1', 'AI 2', 'AI 3'],
    aiPlayers: [
      { index: 1, difficulty },
      { index: 2, difficulty },
      { index: 3, difficulty },
    ],
    humanPlayerId: 'human-1',
  });
}

describe('Easy AI', () => {
  it('returns a DISCARD action during discard phase', () => {
    const game = createTestGame('easy');
    // Draw for AI player 1
    let state = applyAction(game, 'human-1', { type: 'DRAW' });
    expect(state).not.toBeNull();
    // Discard to advance to next player
    const humanTile = state!.players[0].hand[0];
    state = applyAction(state!, 'human-1', { type: 'DISCARD', tile: humanTile });
    if (!state || state.turnPhase === 'claim') {
      // Pass through claim phase
      state = applyAction(state!, 'human-1', { type: 'PASS' });
    }
    if (!state) return;
    // Now it should be AI's turn
    if (state.players[state.currentPlayerIndex].isAI && state.turnPhase === 'draw') {
      state = applyAction(state, state.players[state.currentPlayerIndex].id, { type: 'DRAW' });
    }
    if (!state || !state.players[state.currentPlayerIndex].isAI) return;

    const decision = getAIDecision(state, state.currentPlayerIndex);
    expect(['DISCARD', 'DECLARE_WIN', 'DECLARE_KONG']).toContain(decision.action.type);
  });

  it('never claims except for win', () => {
    const game = createTestGame('easy');
    // Create fake claims (pung and chow)
    const fakeClaims = [
      { playerId: 'ai_1', claimType: 'pung' as const, tilesFromHand: [[dot(1, 1), dot(1, 2)]], priority: 2 },
      { playerId: 'ai_1', claimType: 'chow' as const, tilesFromHand: [[dot(2, 1), dot(3, 1)]], priority: 1 },
    ];

    const decision = getAIClaimDecision(game, 1, fakeClaims);
    expect(decision.action.type).toBe('PASS');
  });

  it('claims win when available', () => {
    const game = createTestGame('easy');
    const winClaim = [
      { playerId: 'ai_1', claimType: 'win' as const, tilesFromHand: [game.players[1].hand], priority: 4 },
    ];

    const decision = getAIClaimDecision(game, 1, winClaim);
    expect(decision.action.type).toBe('CLAIM');
  });
});

describe('Medium AI', () => {
  it('returns a DISCARD action with reasoning', () => {
    const game = createTestGame('medium');
    let state = applyAction(game, 'human-1', { type: 'DRAW' });
    const humanTile = state!.players[0].hand[0];
    state = applyAction(state!, 'human-1', { type: 'DISCARD', tile: humanTile });
    if (!state || state.turnPhase === 'claim') {
      state = applyAction(state!, 'human-1', { type: 'PASS' });
    }
    if (!state) return;
    if (state.players[state.currentPlayerIndex].isAI && state.turnPhase === 'draw') {
      state = applyAction(state, state.players[state.currentPlayerIndex].id, { type: 'DRAW' });
    }
    if (!state || !state.players[state.currentPlayerIndex].isAI) return;

    const decision = getAIDecision(state, state.currentPlayerIndex);
    expect(['DISCARD', 'DECLARE_WIN', 'DECLARE_KONG']).toContain(decision.action.type);
    expect(decision.reasoning).toBeDefined();
  });

  it('always claims win', () => {
    const game = createTestGame('medium');
    const winClaim = [
      { playerId: 'ai_1', claimType: 'win' as const, tilesFromHand: [game.players[1].hand], priority: 4 },
    ];
    const decision = getAIClaimDecision(game, 1, winClaim);
    expect(decision.action.type).toBe('CLAIM');
  });
});

describe('Hard AI', () => {
  it('returns a DISCARD action with reasoning', () => {
    const game = createTestGame('hard');
    let state = applyAction(game, 'human-1', { type: 'DRAW' });
    const humanTile = state!.players[0].hand[0];
    state = applyAction(state!, 'human-1', { type: 'DISCARD', tile: humanTile });
    if (!state || state.turnPhase === 'claim') {
      state = applyAction(state!, 'human-1', { type: 'PASS' });
    }
    if (!state) return;
    if (state.players[state.currentPlayerIndex].isAI && state.turnPhase === 'draw') {
      state = applyAction(state, state.players[state.currentPlayerIndex].id, { type: 'DRAW' });
    }
    if (!state || !state.players[state.currentPlayerIndex].isAI) return;

    const decision = getAIDecision(state, state.currentPlayerIndex);
    expect(['DISCARD', 'DECLARE_WIN', 'DECLARE_KONG']).toContain(decision.action.type);
    expect(decision.reasoning).toBeDefined();
  });

  it('always claims win', () => {
    const game = createTestGame('hard');
    const winClaim = [
      { playerId: 'ai_1', claimType: 'win' as const, tilesFromHand: [game.players[1].hand], priority: 4 },
    ];
    const decision = getAIClaimDecision(game, 1, winClaim);
    expect(decision.action.type).toBe('CLAIM');
  });

  it('passes when no beneficial claims exist', () => {
    const game = createTestGame('hard');
    const decision = getAIClaimDecision(game, 1, []);
    expect(decision.action.type).toBe('PASS');
  });
});

describe('AI Integration', () => {
  it('all difficulty levels produce valid actions for a fresh game', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const game = createTestGame(difficulty);
      // Simulate: human draws and discards, then AI plays
      let state = applyAction(game, 'human-1', { type: 'DRAW' });
      if (!state) continue;
      const tile = state.players[0].hand[0];
      state = applyAction(state, 'human-1', { type: 'DISCARD', tile });
      if (!state) continue;

      // If in claim phase, pass
      if (state.turnPhase === 'claim') {
        state = applyAction(state, 'human-1', { type: 'PASS' });
      }
      if (!state) continue;

      // AI should be able to make a decision
      if (state.players[state.currentPlayerIndex].isAI) {
        if (state.turnPhase === 'draw') {
          state = applyAction(state, state.players[state.currentPlayerIndex].id, { type: 'DRAW' });
        }
        if (state && state.players[state.currentPlayerIndex].isAI && state.turnPhase === 'discard') {
          const decision = getAIDecision(state, state.currentPlayerIndex);
          expect(decision.action).toBeDefined();
          expect(decision.action.type).not.toBe('PASS'); // AI shouldn't pass during discard
        }
      }
    }
  });
});
