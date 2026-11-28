import { computeFinalRankings } from '@/engine/matchManager';
import type { MatchState } from '@/models/MatchState';
import { recordMatchResult } from './gameStats';

/** Record a solo or Parlour match at completion, independently of its recap. */
export function recordCompletedMatch(match: MatchState, finalHandId: string) {
  let bestFan = 0;
  let bestHandName: string | null = null;
  for (const hand of match.handResults) {
    if (hand.winnerId === match.humanPlayerId && hand.scoringResult && hand.scoringResult.totalFan > bestFan) {
      bestFan = hand.scoringResult.totalFan;
      bestHandName = hand.scoringResult.handName ?? null;
    }
  }

  const placement = computeFinalRankings(match).find(r => r.playerIndex === 0)?.rank ?? 4;
  return recordMatchResult({
    difficulty: match.difficulty,
    mode: match.mode,
    humanPlacement: placement,
    totalHandsPlayed: match.totalHandsPlayed,
    bestFanThisMatch: bestFan,
    bestHandNameThisMatch: bestHandName,
  }, finalHandId);
}
