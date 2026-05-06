/**
 * Local game statistics — persisted to localStorage.
 * No auth required, works offline.
 */

const STORAGE_KEY = '16bit-mahjong-stats';

export type QuizMode = 'tile-quiz' | 'scoring-quiz' | 'hand-recognition';

export interface QuizStatEntry {
  played: number;
  best: number;
  lastScore: number;
  lastPlayedAt: string;
}

export type QuizStats = Record<QuizMode, QuizStatEntry>;

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  totalHandsPlayed: number;
  bestFan: number;
  bestHandName: string | null;
  byDifficulty: {
    easy: { played: number; won: number };
    medium: { played: number; won: number };
    hard: { played: number; won: number };
  };
  byMode: {
    quick: { played: number; won: number };
    full: { played: number; won: number };
  };
  placementCounts: [number, number, number, number]; // [1st, 2nd, 3rd, 4th]
  lastPlayedAt: string | null;
  /** Practice-quiz completions, keyed by quiz mode. Absent entries mean "not yet played". */
  quizzes: Partial<QuizStats>;
}

const DEFAULT_STATS: GameStats = {
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
};

function cloneDefaults(): GameStats {
  return JSON.parse(JSON.stringify(DEFAULT_STATS));
}

export function loadStats(): GameStats {
  if (typeof window === 'undefined') return cloneDefaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle missing fields from older versions
    return { ...cloneDefaults(), ...parsed };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function saveStats(stats: GameStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // localStorage might be full or disabled
  }
}

export interface MatchResult {
  difficulty: 'easy' | 'medium' | 'hard';
  mode: 'quick' | 'full';
  humanPlacement: number; // 1-4
  totalHandsPlayed: number;
  bestFanThisMatch: number;
  bestHandNameThisMatch: string | null;
}

export function recordMatchResult(result: MatchResult): GameStats {
  const stats = loadStats();

  stats.gamesPlayed++;
  stats.totalHandsPlayed += result.totalHandsPlayed;
  stats.lastPlayedAt = new Date().toISOString();

  if (result.humanPlacement === 1) {
    stats.gamesWon++;
  }

  // Update placement counts (bounds-check: humanPlacement must be 1-4)
  const placementIdx = result.humanPlacement - 1;
  if (placementIdx >= 0 && placementIdx < stats.placementCounts.length) {
    stats.placementCounts[placementIdx]++;
  }

  // Difficulty breakdown
  stats.byDifficulty[result.difficulty].played++;
  if (result.humanPlacement === 1) {
    stats.byDifficulty[result.difficulty].won++;
  }

  // Mode breakdown
  stats.byMode[result.mode].played++;
  if (result.humanPlacement === 1) {
    stats.byMode[result.mode].won++;
  }

  // Best hand
  if (result.bestFanThisMatch > stats.bestFan) {
    stats.bestFan = result.bestFanThisMatch;
    stats.bestHandName = result.bestHandNameThisMatch;
  }

  saveStats(stats);
  return stats;
}

export interface QuizResult {
  mode: QuizMode;
  /** Final score for this attempt (e.g. 7 out of 10). */
  score: number;
}

/**
 * Record the completion of a practice quiz. Tracks play count, running best,
 * and the most recent score. Mirrors recordMatchResult — read-modify-write
 * of the same localStorage blob, keeping all local stats in one place.
 */
export function recordQuizCompletion(result: QuizResult): GameStats {
  const stats = loadStats();
  const now = new Date().toISOString();
  const existing = stats.quizzes?.[result.mode];
  const best = existing ? Math.max(existing.best, result.score) : result.score;
  const played = (existing?.played ?? 0) + 1;

  stats.quizzes = {
    ...(stats.quizzes ?? {}),
    [result.mode]: {
      played,
      best,
      lastScore: result.score,
      lastPlayedAt: now,
    },
  };

  saveStats(stats);
  return stats;
}
