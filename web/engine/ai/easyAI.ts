/**
 * Easy AI — heuristic discard preferring isolated tiles, claims pungs on valuable tiles.
 */

import { Tile, TileType, TileSuit, tileKey } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import { GameAction, AIDecision, AvailableClaim } from '../types';
import { isWinningHand, canPlayerWin } from '../winDetection';

/**
 * Score a tile for discard desirability (higher = more desirable to discard).
 */
function discardScore(tile: Tile, hand: Tile[]): number {
  const key = tileKey(tile);
  const count = hand.filter(t => tileKey(t) === key).length;

  // Part of a pung or better — strongly keep
  if (count >= 3) return -10;
  // Part of a pair — prefer keeping
  if (count === 2) return -5;

  // Single tile — check connectivity
  let score = 0;

  if (tile.type === TileType.HONOR) {
    // Isolated honor: prime discard candidate
    score += 10;
  } else if (tile.type === TileType.SUIT && tile.number !== undefined) {
    const num = tile.number;
    const sameSuit = hand.filter(t => t.suit === tile.suit && t.type === TileType.SUIT && t.id !== tile.id);
    const hasAdjacent = sameSuit.some(t => t.number !== undefined && Math.abs(t.number - num) === 1);
    const hasGap = sameSuit.some(t => t.number !== undefined && Math.abs(t.number - num) === 2);

    if (hasAdjacent) {
      score -= 3; // connected to a potential chow
    } else if (hasGap) {
      score -= 1; // gap connection (e.g. 3 and 5)
    } else if (num === 1 || num === 9) {
      score += 5; // isolated terminal
    } else {
      score += 3; // isolated middle tile
    }
  }

  // Small random jitter for variety
  score += Math.random() * 2;

  return score;
}

export function getEasyDiscard(gameState: GameState, playerIndex: number): AIDecision {
  const player = gameState.players[playerIndex];
  const hand = player.hand;

  // Check for self-drawn win first
  if (canPlayerWin(hand, player.melds)) {
    return { action: { type: 'DECLARE_WIN' }, reasoning: 'Easy AI: winning hand detected' };
  }

  // Score each non-bonus tile for discard desirability
  const nonBonus = hand.filter(t => t.type !== TileType.BONUS);
  if (nonBonus.length === 0) {
    const tile = hand[Math.floor(Math.random() * hand.length)];
    return { action: { type: 'DISCARD', tile }, reasoning: 'Easy AI: no non-bonus tiles, random discard' };
  }

  let bestTile = nonBonus[0];
  let bestScore = -Infinity;

  for (const tile of nonBonus) {
    const score = discardScore(tile, hand);
    if (score > bestScore) {
      bestScore = score;
      bestTile = tile;
    }
  }

  return {
    action: { type: 'DISCARD', tile: bestTile },
    reasoning: `Easy AI: discard ${bestTile.nameEnglish} (score=${bestScore.toFixed(1)})`,
  };
}

export function getEasyClaimDecision(
  gameState: GameState,
  playerIndex: number,
  availableClaims: AvailableClaim[],
): AIDecision {
  // Always claim for win
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

  // Claim pung on valuable tiles (dragons, seat wind) with 70% probability
  const pungClaim = availableClaims.find(c => c.claimType === 'pung');
  if (pungClaim && pungClaim.tilesFromHand[0] && pungClaim.tilesFromHand[0].length > 0) {
    const tile = pungClaim.tilesFromHand[0][0];
    const player = gameState.players[playerIndex];
    const isDragon = tile.suit === TileSuit.DRAGON;
    const isSeatWind = tile.suit === TileSuit.WIND && tile.wind === player.seatWind;

    if (tile && (isDragon || isSeatWind) && Math.random() < 0.7) {
      return {
        action: {
          type: 'CLAIM',
          claimType: 'pung',
          tilesFromHand: pungClaim.tilesFromHand[0],
        },
        reasoning: `Easy AI: claiming pung on valuable tile (${tile.nameEnglish})`,
      };
    }
  }

  return {
    action: { type: 'PASS' },
    reasoning: 'Easy AI: passing on claim',
  };
}
