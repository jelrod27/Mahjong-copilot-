/**
 * Player rank ladder — visible identity instead of percent-complete.
 * Ranks derive from Parlour progress and real play stats; they never
 * decrease. HK parlour flavor per the story bible.
 */

import { getParlourProgress } from './parlour';
import { loadStats } from './gameStats';

export interface PlayerRank {
  tier: number;
  name: string;
  flavor: string;
}

export const RANKS: PlayerRank[] = [
  { tier: 0, name: 'Newcomer', flavor: 'Walked in out of the rain.' },
  { tier: 1, name: 'Table Student', flavor: 'Knows which end of a tile is up.' },
  { tier: 2, name: 'Floor Climber', flavor: 'The stairs know your footsteps.' },
  { tier: 3, name: 'Hand Builder', flavor: 'Bo nods when you pass the Den.' },
  { tier: 4, name: 'Counting Adept', flavor: 'Hana saves you a seat.' },
  { tier: 5, name: 'Faan Collector', flavor: 'Aki has framed one of your hands.' },
  { tier: 6, name: 'Table Reader', flavor: 'Sora speaks to you. Sometimes twice.' },
  { tier: 7, name: 'Jade Challenger', flavor: 'The top floor light is on.' },
  { tier: 8, name: 'Parlour Legend', flavor: 'Your plaque hangs under Gam’s.' },
];

/** Compute the current rank from local progress. Pure read, no writes. */
export function getCurrentRank(): PlayerRank {
  if (typeof window === 'undefined') return RANKS[0];
  const parlour = getParlourProgress();
  const stats = loadStats();

  let tier = 0;
  if (stats.gamesWon >= 1 || parlour.highestCleared >= 1) tier = 1;
  if (parlour.highestCleared >= 2) tier = 2;
  if (parlour.highestCleared >= 3) tier = 3;
  if (parlour.highestCleared >= 5) tier = 4;
  if (parlour.highestCleared >= 6) tier = 5;
  if (parlour.highestCleared >= 8) tier = 6;
  if (parlour.highestCleared >= 9) tier = 7;
  if (parlour.epilogueUnlocked) tier = 8;
  return RANKS[tier];
}

const RANK_SEEN_KEY = '16bit-mahjong-rank-seen';

/**
 * Detect a rank-up since the player last saw their rank (drives the
 * ceremony banner). Marks the new rank as seen when one is returned.
 */
export function consumeRankUp(): PlayerRank | null {
  if (typeof window === 'undefined') return null;
  const current = getCurrentRank();
  let lastSeen = 0;
  try {
    lastSeen = Number(window.localStorage.getItem(RANK_SEEN_KEY) ?? '0') || 0;
  } catch {
    return null;
  }
  if (current.tier > lastSeen) {
    try {
      window.localStorage.setItem(RANK_SEEN_KEY, String(current.tier));
    } catch {
      // ignore
    }
    // Don't celebrate tier 0->0 or first-load baseline for brand-new players
    return lastSeen === 0 && current.tier <= 1 && !window.localStorage.getItem('16bit-mahjong-parlour')
      ? null
      : current;
  }
  return null;
}
