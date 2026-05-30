/**
 * Graduation tiers — pure functions that turn match stats into a play-gated
 * progression ladder. No persistence, no Redux, just stats in / tier out.
 * Mirrors the shape of mastery.ts.
 *
 * The ladder is the goal the player climbs toward across matches. The recap
 * screen leads with it so finishing a match always answers "what am I working
 * toward, and how close am I?" — directly closing the Training Table
 * "no graduation criteria" gap.
 */

import type { GameStats } from './gameStats';

export interface GraduationTier {
  id: string;
  /** Short title shown on the recap and progress screens. */
  label: string;
  /** Human-readable unlock criterion, e.g. "Win 3 matches on Easy". */
  requirement: string;
  /**
   * Progress toward THIS tier given current stats, as [current, target].
   * The tier is achieved once current >= target. Because every input stat is
   * monotonic (counts only ever increase), achievement is permanent.
   */
  progress: (stats: GameStats) => { current: number; target: number };
}

/**
 * Ordered tier ladder. Treated as a linear quest chain: the player's current
 * tier is the last one whose requirement is met before the first gap, and the
 * next tier is that first unmet requirement. Order is therefore deliberately
 * arranged so requirements escalate along a sensible beginner-to-expert path.
 */
export const GRADUATION_TIERS: GraduationTier[] = [
  {
    id: 'first-steps',
    label: 'First Steps',
    requirement: 'Play your first match',
    progress: (s) => ({ current: Math.min(s.gamesPlayed, 1), target: 1 }),
  },
  {
    id: 'finding-feet',
    label: 'Finding Your Feet',
    requirement: 'Play 3 matches',
    progress: (s) => ({ current: Math.min(s.gamesPlayed, 3), target: 3 }),
  },
  {
    id: 'first-victory',
    label: 'First Victory',
    requirement: 'Win a match',
    progress: (s) => ({ current: Math.min(s.gamesWon, 1), target: 1 }),
  },
  {
    id: 'easy-master',
    label: 'Easy Table Master',
    requirement: 'Win 3 matches on Easy',
    progress: (s) => ({ current: Math.min(s.byDifficulty.easy.won, 3), target: 3 }),
  },
  {
    id: 'seasoned',
    label: 'Seasoned Player',
    requirement: 'Win 5 matches',
    progress: (s) => ({ current: Math.min(s.gamesWon, 5), target: 5 }),
  },
  {
    id: 'rising',
    label: 'Rising Challenger',
    requirement: 'Win a match on Medium',
    progress: (s) => ({ current: Math.min(s.byDifficulty.medium.won, 1), target: 1 }),
  },
  {
    id: 'hard-contender',
    label: 'Hard Table Contender',
    requirement: 'Win a match on Hard',
    progress: (s) => ({ current: Math.min(s.byDifficulty.hard.won, 1), target: 1 }),
  },
  {
    id: 'table-master',
    label: 'Table Master',
    requirement: 'Win 5 matches on Hard',
    progress: (s) => ({ current: Math.min(s.byDifficulty.hard.won, 5), target: 5 }),
  },
];

function isAchieved(tier: GraduationTier, stats: GameStats): boolean {
  const { current, target } = tier.progress(stats);
  return current >= target;
}

export interface GraduationStatus {
  /**
   * The highest tier the player has earned, or null if they haven't cleared
   * even the first tier yet (a brand-new player).
   */
  currentTier: GraduationTier | null;
  /**
   * The next tier to chase, or null once every tier is earned. Carries the
   * live progress so the UI can render a "2 / 3" bar without recomputing.
   */
  nextTier: (GraduationTier & { current: number; target: number }) | null;
  /** How many tiers have been earned, for a compact "3 / 8" summary. */
  earnedCount: number;
  totalCount: number;
}

/**
 * Walk the ladder as a linear chain: stop at the first unmet requirement.
 * Everything before the gap is earned; the gap itself is the next goal.
 *
 * Linear-chain semantics (rather than "highest tier achieved anywhere") keep
 * the next goal stable and meaningful even though some later tiers can be
 * satisfied out of order — e.g. three Easy wins also implies a first win.
 */
export function getGraduationStatus(stats: GameStats): GraduationStatus {
  let earnedCount = 0;
  for (const tier of GRADUATION_TIERS) {
    if (isAchieved(tier, stats)) {
      earnedCount++;
    } else {
      break;
    }
  }

  const currentTier = earnedCount > 0 ? GRADUATION_TIERS[earnedCount - 1] : null;
  const nextRaw = earnedCount < GRADUATION_TIERS.length ? GRADUATION_TIERS[earnedCount] : null;
  const nextTier = nextRaw
    ? { ...nextRaw, ...nextRaw.progress(stats) }
    : null;

  return {
    currentTier,
    nextTier,
    earnedCount,
    totalCount: GRADUATION_TIERS.length,
  };
}
