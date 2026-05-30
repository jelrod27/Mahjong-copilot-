import { describe, it, expect } from 'vitest';
import { getGraduationStatus, GRADUATION_TIERS } from '../graduation';
import type { GameStats } from '../gameStats';

function makeStats(overrides: Partial<GameStats> = {}): GameStats {
  return {
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
    currentTop2Streak: 0,
    bestTop2Streak: 0,
    lastPlayedAt: null,
    quizzes: {},
    ...overrides,
  };
}

describe('getGraduationStatus', () => {
  it('a brand-new player has no current tier and chases First Steps', () => {
    const status = getGraduationStatus(makeStats());
    expect(status.currentTier).toBeNull();
    expect(status.earnedCount).toBe(0);
    expect(status.nextTier?.id).toBe('first-steps');
    expect(status.nextTier).toMatchObject({ current: 0, target: 1 });
    expect(status.totalCount).toBe(GRADUATION_TIERS.length);
  });

  it('earns First Steps after one match and points at Finding Your Feet', () => {
    const status = getGraduationStatus(makeStats({ gamesPlayed: 1 }));
    expect(status.currentTier?.id).toBe('first-steps');
    expect(status.earnedCount).toBe(1);
    expect(status.nextTier?.id).toBe('finding-feet');
    expect(status.nextTier).toMatchObject({ current: 1, target: 3 });
  });

  it('stops at the first unmet requirement even when a later tier is satisfiable', () => {
    // 3 played, but 0 wins: First Victory is the gap, regardless of later tiers.
    const status = getGraduationStatus(makeStats({ gamesPlayed: 3, gamesWon: 0 }));
    expect(status.currentTier?.id).toBe('finding-feet');
    expect(status.nextTier?.id).toBe('first-victory');
  });

  it('reports live progress on the next tier', () => {
    const status = getGraduationStatus(
      makeStats({
        gamesPlayed: 10,
        gamesWon: 1,
        byDifficulty: {
          easy: { played: 5, won: 1 },
          medium: { played: 0, won: 0 },
          hard: { played: 0, won: 0 },
        },
      }),
    );
    // First Steps, Finding Feet, First Victory earned; Easy Master is next.
    expect(status.currentTier?.id).toBe('first-victory');
    expect(status.nextTier?.id).toBe('easy-master');
    expect(status.nextTier).toMatchObject({ current: 1, target: 3 });
  });

  it('returns null nextTier once every tier is earned', () => {
    const status = getGraduationStatus(
      makeStats({
        gamesPlayed: 50,
        gamesWon: 30,
        byDifficulty: {
          easy: { played: 20, won: 10 },
          medium: { played: 20, won: 10 },
          hard: { played: 20, won: 10 },
        },
      }),
    );
    expect(status.earnedCount).toBe(GRADUATION_TIERS.length);
    expect(status.currentTier?.id).toBe('table-master');
    expect(status.nextTier).toBeNull();
  });
});
