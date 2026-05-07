import { describe, expect, it } from 'vitest';
import { deriveMastery, getRecommendedQuiz, masteryLabel, MASTERY_LEVELS } from '../mastery';
import type { GameStats, QuizStatEntry } from '../gameStats';

const baseStats = (): GameStats => ({
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
  quizzes: {},
});

const entry = (overrides: Partial<QuizStatEntry> = {}): QuizStatEntry => ({
  played: 1,
  best: 0,
  lastScore: 0,
  lastPlayedAt: new Date().toISOString(),
  ...overrides,
});

describe('deriveMastery', () => {
  it('returns "new" for an unplayed quiz', () => {
    expect(deriveMastery(undefined)).toBe('new');
    expect(deriveMastery(entry({ played: 0 }))).toBe('new');
  });

  it('returns "needs-work" for a best score under 50%', () => {
    expect(deriveMastery(entry({ played: 1, best: 0 }))).toBe('needs-work');
    expect(deriveMastery(entry({ played: 3, best: 4 }))).toBe('needs-work');
  });

  it('returns "improving" for a best score between 50% and 79%', () => {
    expect(deriveMastery(entry({ played: 1, best: 5 }))).toBe('improving');
    expect(deriveMastery(entry({ played: 2, best: 7 }))).toBe('improving');
  });

  it('returns "improving" for a single 80%+ run — one lucky attempt does not count as mastered', () => {
    expect(deriveMastery(entry({ played: 1, best: 8 }))).toBe('improving');
    expect(deriveMastery(entry({ played: 1, best: 10 }))).toBe('improving');
  });

  it('returns "mastered" for 80%+ best score with at least two attempts', () => {
    expect(deriveMastery(entry({ played: 2, best: 8 }))).toBe('mastered');
    expect(deriveMastery(entry({ played: 5, best: 10 }))).toBe('mastered');
  });

  it('respects a custom total — adapts thresholds for non-10-question quizzes', () => {
    // 4/5 = 80% → mastered if 2+ plays
    expect(deriveMastery(entry({ played: 2, best: 4 }), 5)).toBe('mastered');
    // 3/5 = 60% → improving
    expect(deriveMastery(entry({ played: 1, best: 3 }), 5)).toBe('improving');
  });
});

describe('masteryLabel', () => {
  it('produces a beginner-friendly label per level', () => {
    expect(masteryLabel('new')).toBe('New');
    expect(masteryLabel('needs-work')).toBe('Needs Work');
    expect(masteryLabel('improving')).toBe('Improving');
    expect(masteryLabel('mastered')).toBe('Mastered');
  });

  it('exposes mastery levels in least-to-most order', () => {
    expect(MASTERY_LEVELS).toEqual(['new', 'needs-work', 'improving', 'mastered']);
  });
});

describe('getRecommendedQuiz', () => {
  it('returns null when no modes are provided', () => {
    expect(getRecommendedQuiz(baseStats(), [])).toBeNull();
  });

  it('recommends an unplayed quiz first', () => {
    const stats = baseStats();
    stats.quizzes = {
      'tile-quiz': entry({ played: 5, best: 10 }),
    };
    const recommended = getRecommendedQuiz(stats, ['tile-quiz', 'scoring-quiz']);
    expect(recommended).toBe('scoring-quiz');
  });

  it('recommends the lowest-mastery mode once everything has been played', () => {
    const stats = baseStats();
    stats.quizzes = {
      'tile-quiz': entry({ played: 5, best: 10 }), // mastered
      'scoring-quiz': entry({ played: 3, best: 4 }), // needs-work
      'hand-recognition': entry({ played: 2, best: 8 }), // mastered
    };
    expect(
      getRecommendedQuiz(stats, ['tile-quiz', 'scoring-quiz', 'hand-recognition']),
    ).toBe('scoring-quiz');
  });

  it('breaks mastery ties by least-recently-played', () => {
    const stats = baseStats();
    stats.quizzes = {
      'tile-quiz': entry({ played: 5, best: 10, lastPlayedAt: '2026-01-01T00:00:00Z' }),
      'scoring-quiz': entry({ played: 5, best: 10, lastPlayedAt: '2026-04-01T00:00:00Z' }),
      'hand-recognition': entry({ played: 5, best: 10, lastPlayedAt: '2026-03-01T00:00:00Z' }),
    };
    // All mastered → tile-quiz is oldest.
    expect(
      getRecommendedQuiz(stats, ['tile-quiz', 'scoring-quiz', 'hand-recognition']),
    ).toBe('tile-quiz');
  });
});
