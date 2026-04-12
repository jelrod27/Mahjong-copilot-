import { describe, it, expect } from 'vitest';
import type { MatchState, GameMode, MatchPhase, HandResult } from '../MatchState';
import { WindTile } from '../Tile';

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
});
