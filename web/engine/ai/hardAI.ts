/**
 * Hard AI — strategic and defensive.
 * Same policy stack as medium, with danger/defense terms and near-tenpai claim aggression.
 */

import { GameState } from '@/models/GameState';
import { AIDecision, AvailableClaim } from '../types';
import { chooseDiscard, chooseClaim } from './shantenPolicy';

export function getHardDiscard(gameState: GameState, playerIndex: number): AIDecision {
  return chooseDiscard(gameState, playerIndex, {
    label: 'Hard AI',
    defenseWeight: 1,
  });
}

export function getHardClaimDecision(
  gameState: GameState,
  playerIndex: number,
  availableClaims: AvailableClaim[],
): AIDecision {
  return chooseClaim(gameState, playerIndex, availableClaims, {
    label: 'Hard AI',
    claimWhenClose: true,
  });
}
