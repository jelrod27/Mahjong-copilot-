/**
 * Local game statistics — persisted to localStorage.
 * No auth required, works offline.
 */

const STORAGE_KEY = '16bit-mahjong-stats';

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
};

export function loadStats(): GameStats {
  if (typeof window === 'undefined') return { ...DEFAULT_STATS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle missing fields from older versions
    return { ...DEFAULT_STATS, ...parsed };
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

  // Update placement counts
  stats.placementCounts[result.humanPlacement - 1]++;

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
