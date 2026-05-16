/**
 * Mastery derivation — pure functions that turn raw quiz stats into the
 * beginner-friendly labels the Practice menu surfaces. No persistence,
 * no Redux, just stats in / label out.
 *
 * PRD PRACTICE-01 mastery labels: New / Needs Work / Improving / Mastered.
 */

import type { GameStats, QuizMode, QuizStatEntry } from './gameStats';

export type MasteryLevel = 'new' | 'needs-work' | 'improving' | 'mastered';

/**
 * Stable display order for cycling between mastery labels in tests / UI.
 * Order goes from least to most mastered.
 */
export const MASTERY_LEVELS: MasteryLevel[] = ['new', 'needs-work', 'improving', 'mastered'];

const MASTERY_LABEL_BY_LEVEL: Record<MasteryLevel, string> = {
  new: 'New',
  'needs-work': 'Needs Work',
  improving: 'Improving',
  mastered: 'Mastered',
};

/**
 * Map a mastery level to the label string the UI renders.
 */
export function masteryLabel(level: MasteryLevel): string {
  return MASTERY_LABEL_BY_LEVEL[level];
}

/**
 * Total questions in a quiz round — practice quizzes use 10 questions across
 * Tile / Scoring / Hand Recognition. Used to derive percentage thresholds.
 */
const QUIZ_TOTAL = 10;

/**
 * Derive a mastery level from a quiz's persisted stats.
 *
 * - `new` — never played
 * - `needs-work` — best score is at most 49% of the quiz total
 * - `improving` — best score is between 50% and 79%
 * - `mastered` — best score is 80%+ (8/10 or better) AND played at least twice,
 *   so a single lucky run doesn't immediately count as mastered
 *
 * The "played at least twice" gate matters: a player who scores 9/10 on their
 * first attempt could have guessed; we want them to demonstrate consistency.
 */
export function deriveMastery(entry: QuizStatEntry | undefined, total: number = QUIZ_TOTAL): MasteryLevel {
  if (!entry || entry.played === 0) return 'new';

  const ratio = total > 0 ? entry.best / total : 0;

  if (ratio >= 0.8 && entry.played >= 2) return 'mastered';
  if (ratio >= 0.5) return 'improving';
  return 'needs-work';
}

/**
 * Pick the quiz mode the player should be nudged toward next. Heuristic:
 *
 * 1. Prefer modes the player hasn't tried yet (`new`).
 * 2. Otherwise, pick the lowest-mastery mode (needs-work > improving > mastered).
 * 3. Among ties, pick the least-recently-played mode.
 *
 * Returns `null` only when the modes array is empty — even an all-mastered
 * lineup gets a "keep your skills sharp" recommendation pointing at the
 * least-recent quiz.
 */
export function getRecommendedQuiz(
  stats: GameStats,
  modes: QuizMode[],
): QuizMode | null {
  if (modes.length === 0) return null;

  // Tier 1: anything not yet played.
  const unplayed = modes.filter(m => !stats.quizzes?.[m] || stats.quizzes[m]!.played === 0);
  if (unplayed.length > 0) return unplayed[0];

  // Tier 2: rank by (mastery rank ascending, lastPlayedAt ascending).
  const masteryRank: Record<MasteryLevel, number> = {
    new: 0,
    'needs-work': 1,
    improving: 2,
    mastered: 3,
  };

  const ranked = [...modes].sort((a, b) => {
    const aMastery = deriveMastery(stats.quizzes?.[a]);
    const bMastery = deriveMastery(stats.quizzes?.[b]);
    if (masteryRank[aMastery] !== masteryRank[bMastery]) {
      return masteryRank[aMastery] - masteryRank[bMastery];
    }
    const aLast = stats.quizzes?.[a]?.lastPlayedAt ?? '';
    const bLast = stats.quizzes?.[b]?.lastPlayedAt ?? '';
    // Older (smaller ISO string) comes first — we want least recently played.
    return aLast < bLast ? -1 : aLast > bLast ? 1 : 0;
  });

  return ranked[0];
}
