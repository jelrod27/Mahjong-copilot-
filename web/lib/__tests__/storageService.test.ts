import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveGame,
  loadGame,
  clearSavedGame,
  hasSavedGame,
  canResume,
} from '../matchStorage';
import { MatchState } from '@/models/MatchState';
import { GameState } from '@/models/GameState';
import { WindTile } from '@/models/Tile';

function createMockMatch(overrides: Partial<MatchState> = {}): MatchState {
  return {
    mode: 'quick',
    difficulty: 'easy',
    currentRound: WindTile.EAST,
    handNumber: 1,
    totalHandsPlayed: 0,
    initialDealerIndex: 0,
    currentDealerIndex: 0,
    initialDealerHasRotated: false,
    playerScores: [500, 0, 0, 0],
    startingScore: 500,
    handResults: [],
    currentHand: null,
    phase: 'playing',
    playerNames: ['You', 'West AI', 'North AI', 'East AI'],
    humanPlayerId: 'human-player',
    ...overrides,
  };
}

describe('storageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('hasSavedGame returns false when empty', () => {
    expect(hasSavedGame()).toBe(false);
  });

  it('hasSavedGame returns true after a save', () => {
    const match = createMockMatch();
    saveGame(match, null);
    expect(hasSavedGame()).toBe(true);
  });

  it('canResume returns false when empty', () => {
    expect(canResume()).toBe(false);
  });

  it('canResume returns false for a finished match', () => {
    const match = createMockMatch({ phase: 'finished' });
    saveGame(match, null);
    expect(canResume()).toBe(false);
  });

  it('canResume returns true for an in-progress match', () => {
    const match = createMockMatch({ phase: 'playing' });
    saveGame(match, null);
    expect(canResume()).toBe(true);
  });

  it('saves and loads a match round-trip', () => {
    const match = createMockMatch({ handNumber: 3, playerScores: [620, 480, 480, 420] });
    saveGame(match, null);

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.match).not.toBeNull();
    expect(loaded!.match!.handNumber).toBe(3);
    expect(loaded!.match!.playerScores).toEqual([620, 480, 480, 420]);
    expect(loaded!.match!.phase).toBe('playing');
    expect(loaded!.match!.difficulty).toBe('easy');
    expect(loaded!.match!.mode).toBe('quick');
  });

  it('cleared storage removes everything', () => {
    saveGame(createMockMatch(), null);
    clearSavedGame();
    expect(hasSavedGame()).toBe(false);
    expect(loadGame()).toBeNull();
  });

  it('loadGame handles corrupted JSON gracefully', () => {
    localStorage.setItem('mahjong_match_in_progress', 'not-json');
    expect(loadGame()).toBeNull();
    expect(hasSavedGame()).toBe(false);
  });

  it('loadGame handles version mismatch gracefully', () => {
    localStorage.setItem(
      'mahjong_match_in_progress',
      JSON.stringify({ match: { mode: 'quick' }, version: 999 })
    );
    expect(loadGame()).toBeNull();
    expect(hasSavedGame()).toBe(false);
  });

  it('saveGame + loadGame survive Date and tile roundtrip', () => {
    // Minimal hand snapshot to cover tile+date deserialization
    const game: Partial<GameState> = {
      id: 'test-hand',
      phase: 'playing' as any,
      turnPhase: 'draw',
      players: [],
      currentPlayerIndex: 0,
      wall: [],
      deadWall: [],
      discardPile: [],
      playerDiscards: {},
      prevailingWind: WindTile.EAST,
      finalScores: {},
      createdAt: new Date('2024-01-15T10:30:00Z'),
      turnHistory: [],
      turnTimeLimit: 20,
    };

    const match = createMockMatch({ currentHand: null });
    saveGame(match, game as GameState);

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.game).not.toBeNull();
    expect(loaded!.game!.id).toBe('test-hand');
    expect(loaded!.game!.createdAt).toBeInstanceOf(Date);
    expect(loaded!.match!.currentRound).toBe(WindTile.EAST);
  });
});
