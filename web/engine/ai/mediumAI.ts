/**
 * Medium AI — shanten-based discard with scoring pattern awareness.
 * Claims more aggressively when it helps build fan-scoring patterns.
 */

import { Tile, TileType, TileSuit, tileKey, tilesMatch } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import { AIDecision, AvailableClaim } from '../types';
import { isWinningHand, calculateShanten } from '../winDetection';
import { tileDiscardPriority } from './aiUtils';

/** Bonus for keeping tiles that contribute to known fan patterns. */
function fanRetentionBonus(tile: Tile, hand: Tile[], gameState: GameState, playerIndex: number): number {
  let bonus = 0;
  const player = gameState.players[playerIndex];

  // Dragon tiles: keeping pairs/triplets toward dragon pung (1 faan each)
  if (tile.suit === TileSuit.DRAGON) {
    const count = hand.filter(t => t.suit === TileSuit.DRAGON && t.dragon === tile.dragon).length;
    if (count >= 2) bonus += 8;  // pair of dragons — keep strongly
    else bonus += 3;              // single dragon — moderate keep
  }

  // Seat wind: keeping toward seat wind pung (1 faan)
  if (tile.suit === TileSuit.WIND && tile.wind === player.seatWind) {
    const count = hand.filter(t => t.wind === player.seatWind).length;
    if (count >= 2) bonus += 8;
    else bonus += 3;
  }

  // Prevailing wind: keeping toward prevailing wind pung (1 faan)
  if (tile.suit === TileSuit.WIND && tile.wind === gameState.prevailingWind) {
    const count = hand.filter(t => t.wind === gameState.prevailingWind).length;
    if (count >= 2) bonus += 6;
    else bonus += 2;
  }

  // One-suit concentration: if 10+ tiles are same suit, keep tiles of that suit
  const suitCounts = new Map<string, number>();
  for (const t of hand) {
    if (t.type === TileType.SUIT) {
      suitCounts.set(t.suit, (suitCounts.get(t.suit) || 0) + 1);
    }
  }
  for (const [suit, count] of Array.from(suitCounts.entries())) {
    if (count >= 10 && tile.suit === suit) {
      bonus += 5; // pursuing one-suit hand
    } else if (count >= 8 && tile.suit === suit) {
      bonus += 2;
    }
  }

  return bonus;
}

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

  // Evaluate each tile: calculate shanten + fan retention
  const nonBonus = hand.filter(t => t.type !== TileType.BONUS);
  let bestTile = nonBonus[0];
  let bestScore = Infinity;

  for (const tile of nonBonus) {
    const remaining = hand.filter(t => t.id !== tile.id);
    const testHand = remaining.filter(t => t.type !== TileType.BONUS).slice(0, 13);
    if (testHand.length === 0) continue;

    const shanten = calculateShanten(testHand);
    const priority = tileDiscardPriority(tile);
    const fanBonus = fanRetentionBonus(tile, hand, gameState, playerIndex);

    // Combined score: lower = better to discard
    // Primary: keep shanten low. Secondary: keep fan-valuable tiles. Tertiary: isolated tiles first.
    let score = shanten * 100;
    score += fanBonus * 3;   // penalize discarding fan-valuable tiles
    score -= priority * 1;    // prefer discarding isolated/terminal tiles

    if (score < bestScore) {
      bestScore = score;
      bestTile = tile;
    }
  }

  return {
    action: { type: 'DISCARD', tile: bestTile },
    reasoning: `Medium AI: discard ${bestTile.nameEnglish} (score=${bestScore})`,
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

  const currentHand = player.hand.filter(t => t.type !== TileType.BONUS);
  const currentShanten = currentHand.length >= 13
    ? calculateShanten(currentHand.slice(0, 13))
    : 8;

  // For pung/kong: claim if it improves or maintains shanten, or if it's a valuable tile
  for (const claim of availableClaims) {
    if (claim.claimType === 'kong' || claim.claimType === 'pung') {
      const tiles = claim.tilesFromHand[0];
      if (!tiles) continue;

      const handAfter = player.hand.filter(t => !tiles.find(ct => ct.id === t.id));
      const testHand = handAfter.filter(t => t.type !== TileType.BONUS).slice(0, 13);

      if (testHand.length >= 10) {
        const newShanten = calculateShanten(testHand);

        // Claim if shanten improves
        if (newShanten < currentShanten) {
          return {
            action: { type: 'CLAIM', claimType: claim.claimType, tilesFromHand: tiles },
            reasoning: `Medium AI: claiming ${claim.claimType} (shanten ${currentShanten}→${newShanten})`,
          };
        }

        // Also claim dragons and wind pungs even at equal shanten (guaranteed 1 faan)
        if (newShanten === currentShanten && tiles[0]) {
          const claimedTile = tiles[0];
          const isDragon = claimedTile.suit === TileSuit.DRAGON;
          const isSeatWind = claimedTile.suit === TileSuit.WIND && claimedTile.wind === player.seatWind;
          const isPrevailingWind = claimedTile.suit === TileSuit.WIND && claimedTile.wind === gameState.prevailingWind;

          if (isDragon || isSeatWind || isPrevailingWind) {
            return {
              action: { type: 'CLAIM', claimType: claim.claimType, tilesFromHand: tiles },
              reasoning: `Medium AI: claiming valuable ${claim.claimType} at equal shanten`,
            };
          }
        }
      }
    }
  }

  // For chow: claim if it reduces shanten
  const chowClaim = availableClaims.find(c => c.claimType === 'chow');
  if (chowClaim && chowClaim.tilesFromHand[0]) {
    const tiles = chowClaim.tilesFromHand[0];
    const handAfter = player.hand.filter(t => !tiles.find(ct => ct.id === t.id));
    const testHand = handAfter.filter(t => t.type !== TileType.BONUS).slice(0, 13);

    if (testHand.length >= 10) {
      const newShanten = calculateShanten(testHand);
      if (newShanten < currentShanten) {
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
