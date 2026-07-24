/**
 * Match launch factories — keep mode-specific roster/minFaan/seed out of the
 * live game-loop hook.
 */

import { MatchState, GameMode } from '@/models/MatchState';
import { initializeMatch } from '@/engine/matchManager';
import { resolveMatchRoster, NpcRosterMode } from '@/lib/rosterRotation';
import { RosterId, getRoster } from '@/lib/cosmetics';
import { getFloor, floorSupportCast } from '@/lib/parlour';
import { dailySeed } from '@/lib/dailyHand';
import { NPCS } from '@/content/npcs';

const HUMAN_ID = 'human-player';

export interface LaunchMatchResult {
  match: MatchState;
  difficulty: 'easy' | 'medium' | 'hard';
  mode: GameMode;
  /** Roster id resolved for standard games (for portrait sync). */
  resolvedRoster?: RosterId;
}

export function launchDailyMatch(): LaunchMatchResult {
  const seats = getRoster('default').seats;
  const match = initializeMatch({
    mode: 'single',
    difficulty: 'medium',
    playerNames: ['You', NPCS[seats.right].name, NPCS[seats.top].name, NPCS[seats.left].name],
    humanPlayerId: HUMAN_ID,
    minFaan: 1,
    seed: dailySeed(),
    aiSeats: [
      { index: 1, difficulty: 'medium', personality: NPCS[seats.right].personality },
      { index: 2, difficulty: 'medium', personality: NPCS[seats.top].personality },
      { index: 3, difficulty: 'medium', personality: NPCS[seats.left].personality },
    ],
  });
  return { match, difficulty: 'medium', mode: 'single' };
}

export function launchParlourMatch(parlourFloor: number): LaunchMatchResult | null {
  const floorDef = getFloor(parlourFloor);
  if (!floorDef) return null;

  const rival = NPCS[floorDef.rival];
  const [castA, castB] = floorSupportCast(floorDef.floor);
  const supportDifficulty = floorDef.difficulty === 'hard' ? 'medium' : 'easy';
  const match = initializeMatch({
    mode: 'quick',
    difficulty: floorDef.difficulty,
    playerNames: ['You', NPCS[castA].name, rival.name, NPCS[castB].name],
    humanPlayerId: HUMAN_ID,
    minFaan: floorDef.minFaan,
    aiSeats: [
      { index: 1, difficulty: supportDifficulty, personality: NPCS[castA].personality },
      { index: 2, difficulty: floorDef.difficulty, personality: rival.personality },
      { index: 3, difficulty: supportDifficulty, personality: NPCS[castB].personality },
    ],
  });
  return { match, difficulty: floorDef.difficulty, mode: 'quick' };
}

export function launchStandardMatch(opts: {
  difficulty: 'easy' | 'medium' | 'hard';
  mode: GameMode;
  minFaan: number;
  npcRosterMode: NpcRosterMode;
  fixedNpcRoster: RosterId;
}): LaunchMatchResult {
  const matchRoster = resolveMatchRoster(opts.npcRosterMode, opts.fixedNpcRoster);
  const seats = getRoster(matchRoster).seats;
  const match = initializeMatch({
    mode: opts.mode,
    difficulty: opts.difficulty,
    playerNames: ['You', NPCS[seats.right].name, NPCS[seats.top].name, NPCS[seats.left].name],
    humanPlayerId: HUMAN_ID,
    minFaan: opts.minFaan,
    aiSeats: [
      { index: 1, difficulty: opts.difficulty, personality: NPCS[seats.right].personality },
      { index: 2, difficulty: opts.difficulty, personality: NPCS[seats.top].personality },
      { index: 3, difficulty: opts.difficulty, personality: NPCS[seats.left].personality },
    ],
  });
  return {
    match,
    difficulty: opts.difficulty,
    mode: opts.mode,
    resolvedRoster: matchRoster,
  };
}
