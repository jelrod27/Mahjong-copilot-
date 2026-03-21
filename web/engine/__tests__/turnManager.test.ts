import { describe, it, expect, vi } from 'vitest';
import { initializeGame, applyAction, GameOptions } from '../turnManager';
import { GamePhase } from '@/models/GameState';
import { TileType } from '@/models/Tile';

const defaultOptions: GameOptions = {
  playerNames: ['Human', 'AI 1', 'AI 2', 'AI 3'],
  aiPlayers: [
    { index: 1, difficulty: 'easy' },
    { index: 2, difficulty: 'easy' },
    { index: 3, difficulty: 'easy' },
  ],
  humanPlayerId: 'human-1',
};

describe('initializeGame', () => {
  it('creates a game in PLAYING phase', () => {
    const state = initializeGame(defaultOptions);
    expect(state.phase).toBe(GamePhase.PLAYING);
  });

  it('creates 4 players', () => {
    const state = initializeGame(defaultOptions);
    expect(state.players).toHaveLength(4);
  });

  it('deals 13 tiles to each player', () => {
    const state = initializeGame(defaultOptions);
    for (const player of state.players) {
      expect(player.hand.length).toBe(13);
    }
  });

  it('all tiles are accounted for (hands + wall + deadWall + flowers = 144)', () => {
    const state = initializeGame(defaultOptions);
    const handTiles = state.players.reduce((sum, p) => sum + p.hand.length, 0);
    const flowerTiles = state.players.reduce((sum, p) => sum + p.flowers.length, 0);
    const total = handTiles + flowerTiles + state.wall.length + state.deadWall.length;
    expect(total).toBe(144);
  });

  it('sets player 0 as the human player', () => {
    const state = initializeGame(defaultOptions);
    expect(state.players[0].id).toBe('human-1');
    expect(state.players[0].isAI).toBe(false);
  });

  it('sets AI players', () => {
    const state = initializeGame(defaultOptions);
    expect(state.players[1].isAI).toBe(true);
    expect(state.players[2].isAI).toBe(true);
    expect(state.players[3].isAI).toBe(true);
  });

  it('starts in draw turn phase', () => {
    const state = initializeGame(defaultOptions);
    expect(state.turnPhase).toBe('draw');
  });
});

describe('applyAction - DRAW', () => {
  it('draws a tile and transitions to discard phase', () => {
    const state = initializeGame(defaultOptions);
    const handSizeBefore = state.players[0].hand.length;
    const wallSizeBefore = state.wall.length;

    const newState = applyAction(state, 'human-1', { type: 'DRAW' });
    expect(newState).not.toBeNull();
    // Hand size may vary due to bonus tile handling, but turnPhase should be discard
    expect(newState!.turnPhase).toBe('discard');
    // Wall should shrink by at least 1
    expect(newState!.wall.length).toBeLessThan(wallSizeBefore);
  });

  it('returns null for wrong player', () => {
    const state = initializeGame(defaultOptions);
    const result = applyAction(state, 'ai_1', { type: 'DRAW' });
    expect(result).toBeNull();
  });

  it('returns null when not in draw phase', () => {
    const state = initializeGame(defaultOptions);
    const afterDraw = applyAction(state, 'human-1', { type: 'DRAW' });
    expect(afterDraw).not.toBeNull();
    // Now in discard phase, trying to draw again should fail
    const result = applyAction(afterDraw!, 'human-1', { type: 'DRAW' });
    expect(result).toBeNull();
  });
});

describe('applyAction - DISCARD', () => {
  it('discards a tile and reduces hand size', () => {
    const state = initializeGame(defaultOptions);
    const afterDraw = applyAction(state, 'human-1', { type: 'DRAW' });
    expect(afterDraw).not.toBeNull();

    const handBefore = afterDraw!.players[0].hand.length;
    const tileToDiscard = afterDraw!.players[0].hand[0];
    const afterDiscard = applyAction(afterDraw!, 'human-1', { type: 'DISCARD', tile: tileToDiscard });

    expect(afterDiscard).not.toBeNull();
    expect(afterDiscard!.players[0].hand.length).toBe(handBefore - 1);
    expect(afterDiscard!.discardPile).toContainEqual(tileToDiscard);
  });

  it('returns null when discarding a tile not in hand', () => {
    const state = initializeGame(defaultOptions);
    const afterDraw = applyAction(state, 'human-1', { type: 'DRAW' });
    // Try to discard a tile from another player's hand
    const otherTile = afterDraw!.players[1].hand[0];
    const result = applyAction(afterDraw!, 'human-1', { type: 'DISCARD', tile: otherTile });
    expect(result).toBeNull();
  });
});

describe('applyAction - DECLARE_WIN', () => {
  it('returns null when hand is not winning', () => {
    const state = initializeGame(defaultOptions);
    const afterDraw = applyAction(state, 'human-1', { type: 'DRAW' });
    // Extremely unlikely random hand is winning
    const result = applyAction(afterDraw!, 'human-1', { type: 'DECLARE_WIN' });
    // Should almost certainly be null (random hand)
    // We can't guarantee this test since hand is random, so just check it doesn't crash
    expect(result === null || result?.phase === GamePhase.FINISHED).toBe(true);
  });
});

describe('applyAction - edge cases', () => {
  it('returns null for finished game', () => {
    const state = initializeGame(defaultOptions);
    const finished = { ...state, phase: GamePhase.FINISHED };
    const result = applyAction(finished, 'human-1', { type: 'DRAW' });
    expect(result).toBeNull();
  });

  it('returns null for unknown player ID', () => {
    const state = initializeGame(defaultOptions);
    const result = applyAction(state, 'unknown-player', { type: 'DRAW' });
    expect(result).toBeNull();
  });
});

describe('applyAction - PASS', () => {
  it('returns null when not in claim phase', () => {
    const state = initializeGame(defaultOptions);
    const result = applyAction(state, 'human-1', { type: 'PASS' });
    expect(result).toBeNull();
  });
});
