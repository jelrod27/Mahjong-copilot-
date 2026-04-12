import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadStats, recordMatchResult, type MatchResult } from '../gameStats';

describe('gameStats', () => {
  const CLEAN_STATS = {
    gamesPlayed: 0,
    gamesWon: 0,
    totalHandsPlayed: 0,
    bestFan: 0,
    bestHandName: null,
    byDifficulty: {
      easy: { played: 0, won: 0 },
      medium: { played: 0, won: 0 },
      hard: { played: 0, won: 0 },
    },
    byMode: {
      quick: { played: 0, won: 0 },
      full: { played: 0, won: 0 },
    },
    placementCounts: [0, 0, 0, 0],
    lastPlayedAt: null,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loadStats returns defaults when localStorage is empty', () => {
    const stats = loadStats();
    expect(stats.gamesPlayed).toBe(0);
    expect(stats.gamesWon).toBe(0);
    expect(stats.bestFan).toBe(0);
    expect(stats.bestHandName).toBeNull();
    expect(stats.placementCounts).toEqual([0, 0, 0, 0]);
  });

  it('recordMatchResult increments games played', () => {
    // Seed so loadStats parses JSON (avoids shared DEFAULT_STATS array mutation)
    localStorage.setItem('16bit-mahjong-stats', JSON.stringify(CLEAN_STATS));
    const result: MatchResult = {
      difficulty: 'easy',
      mode: 'quick',
      humanPlacement: 3,
      totalHandsPlayed: 4,
      bestFanThisMatch: 1,
      bestHandNameThisMatch: null,
    };
    const stats = recordMatchResult(result);
    expect(stats.gamesPlayed).toBe(1);
  });

  it('recordMatchResult with placement 1 increments wins', () => {
    localStorage.setItem('16bit-mahjong-stats', JSON.stringify(CLEAN_STATS));
    const result: MatchResult = {
      difficulty: 'easy',
      mode: 'quick',
      humanPlacement: 1,
      totalHandsPlayed: 4,
      bestFanThisMatch: 2,
      bestHandNameThisMatch: 'All Chows',
    };
    const stats = recordMatchResult(result);
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(1);
    expect(stats.byDifficulty.easy.won).toBe(1);
    expect(stats.byMode.quick.won).toBe(1);
  });

  it('recordMatchResult updates best fan when new record', () => {
    localStorage.setItem('16bit-mahjong-stats', JSON.stringify(CLEAN_STATS));
    // First match with 2 fan
    recordMatchResult({
      difficulty: 'easy',
      mode: 'quick',
      humanPlacement: 2,
      totalHandsPlayed: 4,
      bestFanThisMatch: 2,
      bestHandNameThisMatch: 'All Chows',
    });

    // Second match with 5 fan — should update
    const stats = recordMatchResult({
      difficulty: 'medium',
      mode: 'full',
      humanPlacement: 1,
      totalHandsPlayed: 8,
      bestFanThisMatch: 5,
      bestHandNameThisMatch: 'Pure One Suit',
    });

    expect(stats.bestFan).toBe(5);
    expect(stats.bestHandName).toBe('Pure One Suit');
  });

  it('multiple calls accumulate correctly', () => {
    localStorage.setItem('16bit-mahjong-stats', JSON.stringify(CLEAN_STATS));

    const base: MatchResult = {
      difficulty: 'easy',
      mode: 'quick',
      humanPlacement: 2,
      totalHandsPlayed: 4,
      bestFanThisMatch: 1,
      bestHandNameThisMatch: null,
    };

    recordMatchResult(base);
    recordMatchResult({ ...base, humanPlacement: 1 });
    const stats = recordMatchResult({ ...base, difficulty: 'hard', humanPlacement: 4 });
    expect(stats.gamesPlayed).toBe(3);
    expect(stats.gamesWon).toBe(1);
    expect(stats.totalHandsPlayed).toBe(12);
    expect(stats.placementCounts).toEqual([1, 1, 0, 1]);
    expect(stats.byDifficulty.easy.played).toBe(2);
    expect(stats.byDifficulty.hard.played).toBe(1);
  });
});
