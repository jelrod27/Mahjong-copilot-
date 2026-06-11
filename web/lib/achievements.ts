/**
 * Lightweight achievements with HK mahjong flavor. Pure derivations from
 * existing local stores (gameStats, parlour, daily) — no new write paths,
 * so they can never disagree with the stats screen. Each badge renders as
 * a pixel-styled tile in the progress screen.
 */

import { loadStats } from './gameStats';
import { getParlourProgress } from './parlour';
import { getDailyState } from './dailyHand';

export interface Achievement {
  id: string;
  name: string;
  flavor: string;
  /** Two-character badge glyph (rendered as the pixel tile face). */
  glyph: string;
  earned: boolean;
}

export function getAchievements(): Achievement[] {
  const stats = typeof window === 'undefined' ? null : loadStats();
  const parlour = typeof window === 'undefined' ? null : getParlourProgress();
  const daily = typeof window === 'undefined' ? null : getDailyState();

  const bestFan = stats?.bestFan ?? 0;
  const won = stats?.gamesWon ?? 0;
  const floors = parlour?.highestCleared ?? 0;

  return [
    {
      id: 'first-win', name: 'Sik Wu', glyph: '食',
      flavor: 'Your first winning hand. The table remembers.',
      earned: won >= 1,
    },
    {
      id: 'three-wins', name: 'Regular', glyph: '常',
      flavor: 'Three match wins. Gam knows your order.',
      earned: won >= 3,
    },
    {
      id: 'six-faan', name: 'Big Hand', glyph: '大',
      flavor: 'A 6-faan win. Aki raised an eyebrow.',
      earned: bestFan >= 6,
    },
    {
      id: 'limit-hand', name: 'Limit Breaker', glyph: '滿',
      flavor: 'A limit hand. The whole floor heard about it.',
      earned: bestFan >= 10,
    },
    {
      id: 'novice-wing', name: 'Third Floor Key', glyph: '三',
      flavor: 'Cleared the Novice wing of the Parlour.',
      earned: floors >= 3,
    },
    {
      id: 'adept-wing', name: 'Sixth Floor Key', glyph: '六',
      flavor: 'Cleared the Adept wing. The air is thinner here.',
      earned: floors >= 6,
    },
    {
      id: 'jade-room', name: 'The Jade Room', glyph: '玉',
      flavor: 'Beat Master Jin. The seat is warm again.',
      earned: floors >= 9,
    },
    {
      id: 'parlour-legend', name: 'Parlour Legend', glyph: '傳',
      flavor: 'Beat Jin with 6+ faan. Your plaque is on the wall.',
      earned: parlour?.epilogueUnlocked ?? false,
    },
    {
      id: 'daily-3', name: 'Three Mornings', glyph: '朝',
      flavor: 'A 3-day Daily Hand streak.',
      earned: (daily?.bestStreak ?? 0) >= 3,
    },
    {
      id: 'daily-7', name: 'The Full Week', glyph: '週',
      flavor: 'Seven days running. The kettle stays warm.',
      earned: (daily?.bestStreak ?? 0) >= 7,
    },
  ];
}
