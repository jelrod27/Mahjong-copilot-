import { describe, it, expect } from 'vitest';
import type { MatchState, GameMode, MatchPhase, HandResult } from '../MatchState';
import { matchStateToJson, matchStateFromJson } from '../MatchState';
import { WindTile } from '../Tile';
import { GamePhase } from '../GameState';

describe('MatchState types', () => {
  it('GameMode type accepts valid values', () => {
    const quick: GameMode = 'quick';
    const full: GameMode = 'full';
    expect(quick).toBe('quick');
    expect(full).toBe('full');
  });

  it('MatchPhase type accepts valid values', () => {
    const playing: MatchPhase = 'playing';
    const between: MatchPhase = 'betweenHands';
    const finished: MatchPhase = 'finished';
    expect(playing).toBe('playing');
    expect(between).toBe('betweenHands');
    expect(finished).toBe('finished');
  });

  it('HandResult can be constructed with expected shape', () => {
    const result: HandResult = {
      handNumber: 1,
      round: WindTile.EAST,
      dealerIndex: 0,
      winnerId: 'player-1',
      isSelfDrawn: true,
      scoringResult: null,
      scoreChanges: [64, -16, -16, -32],
    };
    expect(result.handNumber).toBe(1);
    expect(result.winnerId).toBe('player-1');
    expect(result.scoreChanges).toHaveLength(4);
  });

  it('MatchState can be constructed with expected shape', () => {
    const state: MatchState = {
      mode: 'quick',
      difficulty: 'easy',
      currentRound: WindTile.EAST,
      handNumber: 1,
      totalHandsPlayed: 0,
      initialDealerIndex: 0,
      currentDealerIndex: 0,
      initialDealerHasRotated: false,
      playerScores: [500, 500, 500, 500],
      startingScore: 500,
      handResults: [],
      currentHand: null,
      phase: 'playing',
      playerNames: ['Human', 'AI 1', 'AI 2', 'AI 3'],
      humanPlayerId: 'human-player',
    };
    expect(state.mode).toBe('quick');
    expect(state.playerScores).toHaveLength(4);
    expect(state.phase).toBe('playing');
  });

  describe('serialization round-trip', () => {
    it('matchStateToJson + matchStateFromJson preserves all scalar fields', () => {
      const state: MatchState = {
        mode: 'full',
        difficulty: 'hard',
        currentRound: WindTile.SOUTH,
        handNumber: 3,
        totalHandsPlayed: 2,
        initialDealerIndex: 0,
        currentDealerIndex: 1,
        initialDealerHasRotated: true,
        playerScores: [620, 480, 480, 420],
        startingScore: 500,
        handResults: [
          {
            handNumber: 1,
            round: WindTile.EAST,
            dealerIndex: 0,
            winnerId: 'human-player',
            isSelfDrawn: false,
            scoringResult: null,
            scoreChanges: [64, -16, -16, -32],
          },
        ],
        currentHand: null,
        phase: 'betweenHands',
        playerNames: ['You', 'AI 1', 'AI 2', 'AI 3'],
        humanPlayerId: 'human-player',
      };

      const json = matchStateToJson(state);
      expect(json.mode).toBe('full');
      expect(json.difficulty).toBe('hard');
      expect(json.handNumber).toBe(3);
      expect(json.playerScores).toEqual([620, 480, 480, 420]);
      expect(json.phase).toBe('betweenHands');

      const restored = matchStateFromJson(json);
      expect(restored.mode).toBe('full');
      expect(restored.difficulty).toBe('hard');
      expect(restored.currentRound).toBe(WindTile.SOUTH);
      expect(restored.handNumber).toBe(3);
      expect(restored.playerScores).toEqual([620, 480, 480, 420]);
      expect(restored.handResults).toHaveLength(1);
      expect(restored.handResults[0].winnerId).toBe('human-player');
      expect(restored.handResults[0].scoreChanges).toEqual([64, -16, -16, -32]);
      expect(restored.currentHand).toBeNull();
    });

    it('round-trip includes GameState when currentHand is present', () => {
      // Minimal valid GameState for test
      const hand = {
        id: 'hand-test-1',
        variant: 'hk-standard',
        phase: GamePhase.PLAYING,
        turnPhase: 'draw',
        players: [],
        currentPlayerIndex: 0,
        wall: [],
        deadWall: [],
        discardPile: [],
        playerDiscards: {},
        pendingClaims: [],
        claimablePlayers: [],
        passedPlayers: [],
        prevailingWind: WindTile.EAST,
        finalScores: {},
        createdAt: new Date('2024-06-01T12:00:00Z'),
        turnHistory: [],
        turnTimeLimit: 20,
      } as any;

      const state: MatchState = {
        mode: 'quick',
        difficulty: 'easy',
        currentRound: WindTile.EAST,
        handNumber: 1,
        totalHandsPlayed: 0,
        initialDealerIndex: 0,
        currentDealerIndex: 0,
        initialDealerHasRotated: false,
        playerScores: [500, 500, 500, 500],
        startingScore: 500,
        handResults: [],
        currentHand: hand,
        phase: 'playing',
        playerNames: ['You', 'W1', 'N1', 'E1'],
        humanPlayerId: 'human-player',
      };

      const json = matchStateToJson(state);
      expect(json.currentHand).not.toBeNull();
      expect(json.currentHand.id).toBe('hand-test-1');

      const restored = matchStateFromJson(json);
      expect(restored.currentHand).not.toBeNull();
      expect(restored.currentHand!.id).toBe('hand-test-1');
      expect(restored.currentHand!.createdAt).toBeInstanceOf(Date);
    });
  });
});
