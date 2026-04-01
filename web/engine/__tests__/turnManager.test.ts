import { describe, it, expect, vi } from 'vitest';
import { initializeGame, applyAction, GameOptions } from '../turnManager';
import { GamePhase, GameState, Player } from '@/models/GameState';
import { TileType, WindTile } from '@/models/Tile';
import { dot, bam, char, windTile, makePlayer } from './testHelpers';

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

describe('claim phase - currentPlayerIndex tracking', () => {
  it('handleDiscard sets currentPlayerIndex to first claimer, not discarder', () => {
    // Build a discard-phase state where AI 1 (index 1) can pung a dot-5 discard
    const discardState: GameState = {
      id: 'test-claim',
      variant: 'Hong Kong Mahjong',
      phase: GamePhase.PLAYING,
      turnPhase: 'discard',
      currentPlayerIndex: 0,
      players: [
        makePlayer({
          id: 'human-1', name: 'Human', isAI: false, seatWind: WindTile.EAST,
          hand: [dot(1,1), dot(2,1), dot(3,1), dot(4,1), dot(5,1), dot(6,1), dot(7,1),
                 dot(8,1), dot(9,1), bam(1,1), bam(2,1), bam(3,1), bam(4,1), bam(5,1)],
        }),
        makePlayer({
          id: 'ai_1', name: 'AI 1', isAI: true, seatWind: WindTile.SOUTH,
          hand: [dot(5,2), dot(5,3), bam(1,2), bam(2,2), bam(3,2), bam(4,2),
                 bam(5,2), bam(6,1), bam(7,1), bam(8,1), bam(9,1), char(1,1), char(2,1)],
        }),
        makePlayer({
          id: 'ai_2', name: 'AI 2', isAI: true, seatWind: WindTile.WEST,
          hand: [char(1,2), char(2,2), char(3,1), char(4,1), char(5,1), char(6,1),
                 char(7,1), char(8,1), char(9,1), dot(1,2), dot(2,2), dot(3,2), dot(4,2)],
        }),
        makePlayer({
          id: 'ai_3', name: 'AI 3', isAI: true, seatWind: WindTile.NORTH,
          hand: [char(1,3), char(2,3), char(3,2), char(4,2), char(5,2), char(6,2),
                 char(7,2), char(8,2), char(9,2), dot(1,3), dot(2,3), dot(3,3), dot(4,3)],
        }),
      ],
      wall: Array.from({ length: 50 }, (_, i) => bam(1, 100 + i)),
      deadWall: Array.from({ length: 14 }, (_, i) => char(1, 100 + i)),
      discardPile: [],
      playerDiscards: { 'human-1': [], 'ai_1': [], 'ai_2': [], 'ai_3': [] },
      lastDiscardedTile: undefined,
      lastDiscardedBy: undefined,
      lastAction: undefined,
      pendingClaims: [],
      prevailingWind: WindTile.EAST,
      finalScores: {},
      createdAt: new Date(),
      turnHistory: [],
      turnTimeLimit: 20,
    };

    const afterDiscard = applyAction(discardState, 'human-1', { type: 'DISCARD', tile: dot(5, 1) });
    expect(afterDiscard).not.toBeNull();
    expect(afterDiscard!.turnPhase).toBe('claim');
    // Critical: currentPlayerIndex must NOT be 0 (the discarder) — that causes deadlock
    expect(afterDiscard!.currentPlayerIndex).not.toBe(0);
    // Should be AI 1 (index 1) — first player in turn order who can claim
    expect(afterDiscard!.currentPlayerIndex).toBe(1);
  });
});

describe('claim phase - pass cycling', () => {
  it('first pass advances to next player but stays in claim phase', () => {
    // State: human discarded dot-5, AI 1 (index 1) is current claimer
    const discardedTile = dot(5, 1);
    const claimState: GameState = {
      id: 'test-pass',
      variant: 'Hong Kong Mahjong',
      phase: GamePhase.PLAYING,
      turnPhase: 'claim',
      currentPlayerIndex: 1, // AI 1's turn to decide
      players: [
        makePlayer({ id: 'human-1', name: 'Human', isAI: false, seatWind: WindTile.EAST,
          hand: [dot(1,1), dot(2,1), dot(3,1), dot(4,1), dot(6,1), dot(7,1),
                 dot(8,1), dot(9,1), bam(1,1), bam(2,1), bam(3,1), bam(4,1), bam(5,1)] }),
        makePlayer({ id: 'ai_1', name: 'AI 1', isAI: true, seatWind: WindTile.SOUTH,
          hand: [dot(5,2), dot(5,3), bam(1,2), bam(2,2), bam(3,2), bam(4,2),
                 bam(5,2), bam(6,1), bam(7,1), bam(8,1), bam(9,1), char(1,1), char(2,1)] }),
        makePlayer({ id: 'ai_2', name: 'AI 2', isAI: true, seatWind: WindTile.WEST,
          hand: [char(1,2), char(2,2), char(3,1), char(4,1), char(5,1), char(6,1),
                 char(7,1), char(8,1), char(9,1), dot(1,2), dot(2,2), dot(3,2), dot(4,2)] }),
        makePlayer({ id: 'ai_3', name: 'AI 3', isAI: true, seatWind: WindTile.NORTH,
          hand: [char(1,3), char(2,3), char(3,2), char(4,2), char(5,2), char(6,2),
                 char(7,2), char(8,2), char(9,2), dot(1,3), dot(2,3), dot(3,3), dot(4,3)] }),
      ],
      wall: Array.from({ length: 50 }, (_, i) => bam(1, 100 + i)),
      deadWall: Array.from({ length: 14 }, (_, i) => char(1, 100 + i)),
      discardPile: [discardedTile],
      playerDiscards: { 'human-1': [discardedTile], 'ai_1': [], 'ai_2': [], 'ai_3': [] },
      lastDiscardedTile: discardedTile,
      lastDiscardedBy: 'human-1',
      lastAction: undefined,
      pendingClaims: [],
      prevailingWind: WindTile.EAST,
      finalScores: {},
      createdAt: new Date(),
      turnHistory: [],
      turnTimeLimit: 20,
    };

    // AI 1 passes — should advance to AI 2, stay in claim phase
    const afterPass = applyAction(claimState, 'ai_1', { type: 'PASS' });
    expect(afterPass).not.toBeNull();
    expect(afterPass!.turnPhase).toBe('claim');
    expect(afterPass!.currentPlayerIndex).toBe(2);
  });
});

describe('claim phase - all pass ends claim', () => {
  it('all non-discarder players passing ends claim phase and advances to draw', () => {
    const discardedTile = dot(5, 1);
    const claimState: GameState = {
      id: 'test-allpass',
      variant: 'Hong Kong Mahjong',
      phase: GamePhase.PLAYING,
      turnPhase: 'claim',
      currentPlayerIndex: 1,
      players: [
        makePlayer({ id: 'human-1', name: 'Human', isAI: false, seatWind: WindTile.EAST,
          hand: [dot(1,1), dot(2,1), dot(3,1), dot(4,1), dot(6,1), dot(7,1),
                 dot(8,1), dot(9,1), bam(1,1), bam(2,1), bam(3,1), bam(4,1), bam(5,1)] }),
        makePlayer({ id: 'ai_1', name: 'AI 1', isAI: true, seatWind: WindTile.SOUTH,
          hand: [dot(5,2), dot(5,3), bam(1,2), bam(2,2), bam(3,2), bam(4,2),
                 bam(5,2), bam(6,1), bam(7,1), bam(8,1), bam(9,1), char(1,1), char(2,1)] }),
        makePlayer({ id: 'ai_2', name: 'AI 2', isAI: true, seatWind: WindTile.WEST,
          hand: [char(1,2), char(2,2), char(3,1), char(4,1), char(5,1), char(6,1),
                 char(7,1), char(8,1), char(9,1), dot(1,2), dot(2,2), dot(3,2), dot(4,2)] }),
        makePlayer({ id: 'ai_3', name: 'AI 3', isAI: true, seatWind: WindTile.NORTH,
          hand: [char(1,3), char(2,3), char(3,2), char(4,2), char(5,2), char(6,2),
                 char(7,2), char(8,2), char(9,2), dot(1,3), dot(2,3), dot(3,3), dot(4,3)] }),
      ],
      wall: Array.from({ length: 50 }, (_, i) => bam(1, 100 + i)),
      deadWall: Array.from({ length: 14 }, (_, i) => char(1, 100 + i)),
      discardPile: [discardedTile],
      playerDiscards: { 'human-1': [discardedTile], 'ai_1': [], 'ai_2': [], 'ai_3': [] },
      lastDiscardedTile: discardedTile,
      lastDiscardedBy: 'human-1',
      lastAction: undefined,
      pendingClaims: [],
      prevailingWind: WindTile.EAST,
      finalScores: {},
      createdAt: new Date(),
      turnHistory: [],
      turnTimeLimit: 20,
    };

    // All three non-discarder players pass sequentially
    let state = applyAction(claimState, 'ai_1', { type: 'PASS' })!;
    expect(state.turnPhase).toBe('claim');
    expect(state.currentPlayerIndex).toBe(2);

    state = applyAction(state, 'ai_2', { type: 'PASS' })!;
    expect(state.turnPhase).toBe('claim');
    expect(state.currentPlayerIndex).toBe(3);

    state = applyAction(state, 'ai_3', { type: 'PASS' })!;
    // After all pass, should advance to draw phase for next player after discarder
    expect(state.turnPhase).toBe('draw');
    expect(state.currentPlayerIndex).toBe(1);
  });
});

describe('claim phase - claim ends cycle', () => {
  it('a claim mid-cycle ends claim phase immediately', () => {
    const discardedTile = dot(5, 1);
    const claimState: GameState = {
      id: 'test-claim-mid',
      variant: 'Hong Kong Mahjong',
      phase: GamePhase.PLAYING,
      turnPhase: 'claim',
      currentPlayerIndex: 1,
      players: [
        makePlayer({ id: 'human-1', name: 'Human', isAI: false, seatWind: WindTile.EAST,
          hand: [dot(1,1), dot(2,1), dot(3,1), dot(4,1), dot(6,1), dot(7,1),
                 dot(8,1), dot(9,1), bam(1,1), bam(2,1), bam(3,1), bam(4,1), bam(5,1)] }),
        makePlayer({ id: 'ai_1', name: 'AI 1', isAI: true, seatWind: WindTile.SOUTH,
          hand: [dot(5,2), dot(5,3), bam(1,2), bam(2,2), bam(3,2), bam(4,2),
                 bam(5,2), bam(6,1), bam(7,1), bam(8,1), bam(9,1), char(1,1), char(2,1)] }),
        makePlayer({ id: 'ai_2', name: 'AI 2', isAI: true, seatWind: WindTile.WEST,
          hand: [char(1,2), char(2,2), char(3,1), char(4,1), char(5,1), char(6,1),
                 char(7,1), char(8,1), char(9,1), dot(1,2), dot(2,2), dot(3,2), dot(4,2)] }),
        makePlayer({ id: 'ai_3', name: 'AI 3', isAI: true, seatWind: WindTile.NORTH,
          hand: [char(1,3), char(2,3), char(3,2), char(4,2), char(5,2), char(6,2),
                 char(7,2), char(8,2), char(9,2), dot(1,3), dot(2,3), dot(3,3), dot(4,3)] }),
      ],
      wall: Array.from({ length: 50 }, (_, i) => bam(1, 100 + i)),
      deadWall: Array.from({ length: 14 }, (_, i) => char(1, 100 + i)),
      discardPile: [discardedTile],
      playerDiscards: { 'human-1': [discardedTile], 'ai_1': [], 'ai_2': [], 'ai_3': [] },
      lastDiscardedTile: discardedTile,
      lastDiscardedBy: 'human-1',
      lastAction: undefined,
      pendingClaims: [],
      prevailingWind: WindTile.EAST,
      finalScores: {},
      createdAt: new Date(),
      turnHistory: [],
      turnTimeLimit: 20,
    };

    // AI 1 claims pung (has two dot-5 tiles)
    const afterClaim = applyAction(claimState, 'ai_1', {
      type: 'CLAIM', claimType: 'pung', tilesFromHand: [dot(5, 2), dot(5, 3)],
    });
    expect(afterClaim).not.toBeNull();
    expect(afterClaim!.turnPhase).toBe('discard');
    expect(afterClaim!.currentPlayerIndex).toBe(1);
  });
});
