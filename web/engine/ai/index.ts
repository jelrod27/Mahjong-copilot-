/**
 * AI entry point — dispatches to the correct difficulty tier.
 */

import { GameState } from '@/models/GameState';
import { AIDecision, AvailableClaim } from '../types';
import { getEasyDiscard, getEasyClaimDecision } from './easyAI';
import { getMediumDiscard, getMediumClaimDecision } from './mediumAI';
import { getHardDiscard, getHardClaimDecision } from './hardAI';

/**
 * Get the AI's discard/kong/win decision during their turn.
 */
export function getAIDecision(gameState: GameState, playerIndex: number): AIDecision {
  const player = gameState.players[playerIndex];
  const difficulty = player.aiDifficulty || 'easy';

  switch (difficulty) {
    case 'medium':
      return getMediumDiscard(gameState, playerIndex);
    case 'hard':
      return getHardDiscard(gameState, playerIndex);
    case 'easy':
    default:
      return getEasyDiscard(gameState, playerIndex);
  }
}

/**
 * Get the AI's claim decision when another player discards.
 */
export function getAIClaimDecision(
  gameState: GameState,
  playerIndex: number,
  availableClaims: AvailableClaim[],
): AIDecision {
  const player = gameState.players[playerIndex];
  const difficulty = player.aiDifficulty || 'easy';

  switch (difficulty) {
    case 'medium':
      return getMediumClaimDecision(gameState, playerIndex, availableClaims);
    case 'hard':
      return getHardClaimDecision(gameState, playerIndex, availableClaims);
    case 'easy':
    default:
      return getEasyClaimDecision(gameState, playerIndex, availableClaims);
  }
}
