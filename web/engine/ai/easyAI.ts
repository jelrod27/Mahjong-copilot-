/**
 * Easy AI — random discard, never claims, always declares win.
 */

import { Tile, TileType } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import { GameAction, AIDecision, AvailableClaim } from '../types';
import { isWinningHand } from '../winDetection';

export function getEasyDiscard(gameState: GameState, playerIndex: number): AIDecision {
  const player = gameState.players[playerIndex];
  const hand = player.hand;

  // Check for self-drawn win first
  if (isWinningHand(hand)) {
    return { action: { type: 'DECLARE_WIN' }, reasoning: 'Easy AI: winning hand detected' };
  }

  // Random discard (avoid bonus tiles)
  const nonBonus = hand.filter(t => t.type !== TileType.BONUS);
  const candidates = nonBonus.length > 0 ? nonBonus : hand;
  const tile = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    action: { type: 'DISCARD', tile },
    reasoning: 'Easy AI: random discard',
  };
}

export function getEasyClaimDecision(
  gameState: GameState,
  playerIndex: number,
  availableClaims: AvailableClaim[],
): AIDecision {
  // Easy AI only claims for win
  const winClaim = availableClaims.find(c => c.claimType === 'win');
  if (winClaim) {
    return {
      action: {
        type: 'CLAIM',
        claimType: 'win',
        tilesFromHand: winClaim.tilesFromHand[0] || [],
      },
      reasoning: 'Easy AI: claiming win',
    };
  }

  return {
    action: { type: 'PASS' },
    reasoning: 'Easy AI: never claims (except win)',
  };
}
