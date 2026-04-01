/**
 * Hard AI — strategic and defensive.
 * Builds on medium AI with danger analysis and opponent reading.
 */

import { Tile, TileType, tileKey, tilesMatch } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import { AIDecision, AvailableClaim } from '../types';
import { isWinningHand, calculateShanten } from '../winDetection';
import { tileDangerScore, isSafeTile, tileDiscardPriority } from './aiUtils';

export function getHardDiscard(gameState: GameState, playerIndex: number): AIDecision {
  const player = gameState.players[playerIndex];
  const hand = player.hand;

  // Check for self-drawn win
  if (isWinningHand(hand)) {
    return { action: { type: 'DECLARE_WIN' }, reasoning: 'Hard AI: winning hand' };
  }

  // Check for concealed kong
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
      const handWithout = hand.filter(t => !tilesMatch(t, tiles[0]));
      const shantenWithout = calculateShanten(handWithout.filter(t => t.type !== TileType.BONUS).slice(0, 13));
      const shantenWith = calculateShanten(hand.filter(t => t.type !== TileType.BONUS).slice(0, 13));
      if (shantenWithout <= shantenWith) {
        return {
          action: { type: 'DECLARE_KONG', tile: tiles[0] },
          reasoning: 'Hard AI: declaring kong',
        };
      }
    }
  }

  const nonBonus = hand.filter(t => t.type !== TileType.BONUS);
  const currentShanten = calculateShanten(nonBonus.slice(0, 13));

  // Score each tile for discard
  interface DiscardCandidate {
    tile: Tile;
    shanten: number;
    danger: number;
    priority: number;
    score: number;
  }

  const candidates: DiscardCandidate[] = [];

  for (const tile of nonBonus) {
    const remaining = hand.filter(t => t.id !== tile.id);
    const testHand = remaining.filter(t => t.type !== TileType.BONUS).slice(0, 13);
    if (testHand.length === 0) continue;

    const shanten = calculateShanten(testHand);
    const danger = tileDangerScore(tile, gameState, playerIndex);
    const priority = tileDiscardPriority(tile);

    // Combined score: lower is better to discard
    // Heavily weight shanten (don't increase it), then prefer safe tiles
    let score = shanten * 100; // primary: keep shanten low
    score += danger * 3;        // secondary: avoid dangerous tiles
    score -= priority * 1;      // tertiary: prefer discarding isolated/honor tiles

    // Bonus: if we're tenpai, heavily penalize dangerous discards
    if (currentShanten === 0 && danger > 4) {
      score += 50;
    }

    // Bonus for safe tiles
    if (isSafeTile(tile, gameState, playerIndex)) {
      score -= 20;
    }

    candidates.push({ tile, shanten, danger, priority, score });
  }

  // Sort by score (lowest = best discard)
  candidates.sort((a, b) => a.score - b.score);

  const best = candidates[0] || { tile: nonBonus[0] };

  return {
    action: { type: 'DISCARD', tile: best.tile },
    reasoning: `Hard AI: discard ${best.tile.nameEnglish} (score=${(best as DiscardCandidate).score})`,
  };
}

export function getHardClaimDecision(
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
      reasoning: 'Hard AI: claiming win',
    };
  }

  const currentHand = player.hand.filter(t => t.type !== TileType.BONUS);
  const currentShanten = currentHand.length >= 13
    ? calculateShanten(currentHand.slice(0, 13))
    : 8;

  // Evaluate all claims
  for (const claim of availableClaims) {
    if (claim.claimType === 'kong' || claim.claimType === 'pung') {
      const tiles = claim.tilesFromHand[0];
      if (!tiles) continue;

      const handAfter = player.hand.filter(t => !tiles.find(ct => ct.id === t.id));
      const testHand = handAfter.filter(t => t.type !== TileType.BONUS);

      if (testHand.length >= 10) {
        const newShanten = calculateShanten(testHand.slice(0, 13));

        // Hard AI is more aggressive — claim even if shanten stays same
        // if it builds toward a scoring hand
        if (newShanten <= currentShanten) {
          return {
            action: { type: 'CLAIM', claimType: claim.claimType, tilesFromHand: tiles },
            reasoning: `Hard AI: claiming ${claim.claimType} (shanten ${currentShanten}→${newShanten})`,
          };
        }
      }
    }
  }

  // Chow: claim if beneficial
  const chowClaim = availableClaims.find(c => c.claimType === 'chow');
  if (chowClaim && chowClaim.tilesFromHand[0]) {
    const tiles = chowClaim.tilesFromHand[0];
    const handAfter = player.hand.filter(t => !tiles.find(ct => ct.id === t.id));
    const testHand = handAfter.filter(t => t.type !== TileType.BONUS);

    if (testHand.length >= 10) {
      const newShanten = calculateShanten(testHand.slice(0, 13));

      if (newShanten < currentShanten) {
        return {
          action: { type: 'CLAIM', claimType: 'chow', tilesFromHand: tiles },
          reasoning: `Hard AI: claiming chow (shanten ${currentShanten}→${newShanten})`,
        };
      }
    }
  }

  return {
    action: { type: 'PASS' },
    reasoning: 'Hard AI: no beneficial claim',
  };
}
