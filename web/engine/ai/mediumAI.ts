/**
 * Medium AI — shanten-based discard with scoring pattern awareness.
 * Thin wrapper over the shared shanten policy (no danger/defense terms).
 */

import { GameState } from '@/models/GameState';
import { AIDecision, AvailableClaim } from '../types';
import { chooseDiscard, chooseClaim } from './shantenPolicy';

export function getMediumDiscard(gameState: GameState, playerIndex: number): AIDecision {
  return chooseDiscard(gameState, playerIndex, {
    label: 'Medium AI',
    defenseWeight: 0,
  });
}

export function getMediumClaimDecision(
  gameState: GameState,
  playerIndex: number,
  availableClaims: AvailableClaim[],
): AIDecision {
  return chooseClaim(gameState, playerIndex, availableClaims, {
    label: 'Medium AI',
    claimWhenClose: false,
  });
}
