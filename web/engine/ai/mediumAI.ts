/**
 * Medium AI — shanten-based discard, claims when beneficial.
 */

import { Tile, TileType, tileKey, tilesMatch } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import { AIDecision, AvailableClaim } from '../types';
import { isWinningHand, calculateShanten } from '../winDetection';
import { tileDiscardPriority } from './aiUtils';

export function getMediumDiscard(gameState: GameState, playerIndex: number): AIDecision {
  const player = gameState.players[playerIndex];
  const hand = player.hand;

  // Check for self-drawn win
  if (isWinningHand(hand)) {
    return { action: { type: 'DECLARE_WIN' }, reasoning: 'Medium AI: winning hand' };
  }

  // Check for concealed kong (4 of a kind)
  const keyCounts = new Map<string, Tile[]>();
  for (const t of hand) {
    const key = tileKey(t);
    const arr = keyCounts.get(key) || [];
    arr.push(t);
    keyCounts.set(key, arr);
  }
  const entries = Array.from(keyCounts.entries());
  for (const [, tiles] of entries) {
    if (tiles.length === 4) {
      // Declare kong if it doesn't hurt shanten
      const handWithout = hand.filter(t => !tilesMatch(t, tiles[0]));
      const shantenWithout = calculateShanten(handWithout.slice(0, 13));
      const shantenWith = calculateShanten(hand.slice(0, 13));
      if (shantenWithout <= shantenWith) {
        return {
          action: { type: 'DECLARE_KONG', tile: tiles[0] },
          reasoning: 'Medium AI: declaring kong (no shanten loss)',
        };
      }
    }
  }

  // Evaluate each tile: calculate shanten if we discard it
  const nonBonus = hand.filter(t => t.type !== TileType.BONUS);
  let bestTile = nonBonus[0];
  let bestShanten = Infinity;
  let bestPriority = Infinity;

  for (const tile of nonBonus) {
    const remaining = hand.filter(t => t.id !== tile.id);
    // calculateShanten expects 13 tiles
    const testHand = remaining.filter(t => t.type !== TileType.BONUS).slice(0, 13);
    if (testHand.length < 13) continue;

    const shanten = calculateShanten(testHand);
    const priority = tileDiscardPriority(tile);

    // Pick lowest shanten; on tie, prefer lower priority (safer to discard)
    if (shanten < bestShanten || (shanten === bestShanten && priority < bestPriority)) {
      bestShanten = shanten;
      bestPriority = priority;
      bestTile = tile;
    }
  }

  return {
    action: { type: 'DISCARD', tile: bestTile },
    reasoning: `Medium AI: discard ${bestTile.nameEnglish} (shanten=${bestShanten})`,
  };
}

export function getMediumClaimDecision(
  gameState: GameState,
  playerIndex: number,
  availableClaims: AvailableClaim[],
): AIDecision {
  const player = gameState.players[playerIndex];

  // Always claim win
  const winClaim = availableClaims.find(c => c.claimType === 'win');
  if (winClaim) {
    return {
      action: { type: 'CLAIM', claimType: 'win', tilesFromHand: winClaim.tilesFromHand[0] || [] },
      reasoning: 'Medium AI: claiming win',
    };
  }

  // For pung/kong: claim if it reduces shanten
  for (const claim of availableClaims) {
    if (claim.claimType === 'kong' || claim.claimType === 'pung') {
      const tiles = claim.tilesFromHand[0];
      if (!tiles) continue;

      // Simulate: remove tiles from hand, add the meld
      const handAfter = player.hand.filter(t => !tiles.find(ct => ct.id === t.id));
      const testHand = handAfter.filter(t => t.type !== TileType.BONUS).slice(0, 13);

      if (testHand.length >= 10) {
        const currentShanten = calculateShanten(
          player.hand.filter(t => t.type !== TileType.BONUS).slice(0, 13)
        );
        const newShanten = calculateShanten(testHand);

        if (newShanten < currentShanten) {
          return {
            action: { type: 'CLAIM', claimType: claim.claimType, tilesFromHand: tiles },
            reasoning: `Medium AI: claiming ${claim.claimType} (shanten ${currentShanten}→${newShanten})`,
          };
        }
      }
    }
  }

  // For chow: claim if it reduces shanten by at least 1
  const chowClaim = availableClaims.find(c => c.claimType === 'chow');
  if (chowClaim && chowClaim.tilesFromHand[0]) {
    const tiles = chowClaim.tilesFromHand[0];
    const handAfter = player.hand.filter(t => !tiles.find(ct => ct.id === t.id));
    const testHand = handAfter.filter(t => t.type !== TileType.BONUS).slice(0, 13);

    if (testHand.length >= 10) {
      const currentShanten = calculateShanten(
        player.hand.filter(t => t.type !== TileType.BONUS).slice(0, 13)
      );
      const newShanten = calculateShanten(testHand);

      if (newShanten < currentShanten - 0) {
        return {
          action: { type: 'CLAIM', claimType: 'chow', tilesFromHand: tiles },
          reasoning: `Medium AI: claiming chow (shanten ${currentShanten}→${newShanten})`,
        };
      }
    }
  }

  return {
    action: { type: 'PASS' },
    reasoning: 'Medium AI: no beneficial claim',
  };
}
