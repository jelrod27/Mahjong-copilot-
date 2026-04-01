import { describe, it, expect } from 'vitest';
import { getAIDecision, getAIClaimDecision } from '../index';
import { getMediumDiscard } from '../mediumAI';
import { getHardDiscard } from '../hardAI';
import { initializeGame } from '../../turnManager';
import { applyAction } from '../../turnManager';
import { getAvailableClaims } from '../../claiming';
import { GamePhase } from '@/models/GameState';
import {
  dot, bam, char, windTile, dragonTile, flowerTile, makePlayer, buildAllPungsHand,
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

describe('Medium AI - bonus tile edge case', () => {
  it('evaluates shanten correctly when hand has many bonus tiles', () => {
    // Create a player with 11 non-bonus + 3 bonus tiles (14 total after draw)
    // After filtering bonus and removing 1 for discard: only 10 non-bonus tiles
    // The bug: all tiles skipped because testHand.length < 13
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true, aiDifficulty: 'medium',
      hand: [
        dot(1,1), dot(2,1), dot(3,1), dot(4,1), dot(5,1),
        bam(1,1), bam(2,1), bam(3,1), bam(4,1), bam(5,1),
        char(1,1),
        // 3 bonus tiles
        flowerTile('Plum', 1), flowerTile('Orchid', 2), flowerTile('Chrysanthemum', 3),
      ],
      flowers: [],
    });

    const fakeState = {
      id: 'test',
      variant: 'Hong Kong Mahjong',
      phase: GamePhase.PLAYING,
      turnPhase: 'discard',
      currentPlayerIndex: 0,
      players: [player],
      wall: [],
      deadWall: [],
      discardPile: [],
      playerDiscards: {},
      pendingClaims: [],
      prevailingWind: WindTile.EAST,
      finalScores: {},
      createdAt: new Date(),
      turnHistory: [],
      turnTimeLimit: 20,
    };

    const decision = getMediumDiscard(fakeState, 0);
    // Should produce a valid DISCARD (not DECLARE_WIN)
    expect(decision.action.type).toBe('DISCARD');
    // The reasoning should show an actual shanten value, not Infinity
    expect(decision.reasoning).not.toContain('Infinity');
  });
});
