/**
 * Hard AI — strategic and defensive.
 * Builds on medium AI with danger analysis, opponent reading, and defensive switching.
 */

import { Tile, TileType, TileSuit, tileKey, tilesMatch } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import { AIDecision, AvailableClaim } from '../types';
import { isWinningHand, canPlayerWin, calculateShanten } from '../winDetection';
import {
  tileDangerScore, isSafeTile, tileDiscardPriority,
  isOpponentDangerous, detectOpponentSuitFocus,
} from './aiUtils';

/** Check if any opponent appears dangerous. */
function shouldPlayDefensive(gameState: GameState, playerIndex: number): boolean {
  for (let i = 0; i < gameState.players.length; i++) {
    if (i === playerIndex) continue;
    if (isOpponentDangerous(gameState, i)) return true;
  }
  return false;
}

/** Extra danger from opponent suit concentration. */
function suitFocusDanger(tile: Tile, gameState: GameState, playerIndex: number): number {
  if (tile.type !== TileType.SUIT) return 0;
  let danger = 0;
  for (let i = 0; i < gameState.players.length; i++) {
    if (i === playerIndex) continue;
    const focused = detectOpponentSuitFocus(gameState, i);
    if (focused.has(tile.suit)) danger += 4;
  }
  return danger;
}

export function getHardDiscard(gameState: GameState, playerIndex: number): AIDecision {
  const player = gameState.players[playerIndex];
  const hand = player.hand;

  // Check for self-drawn win
  if (canPlayerWin(hand, player.melds)) {
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
  const defensive = shouldPlayDefensive(gameState, playerIndex);

  interface DiscardCandidate {
    tile: Tile;
    shanten: number;
    danger: number;
    score: number;
  }

  const candidates: DiscardCandidate[] = [];

  for (const tile of nonBonus) {
    const remaining = hand.filter(t => t.id !== tile.id);
    const testHand = remaining.filter(t => t.type !== TileType.BONUS).slice(0, 13);
    if (testHand.length === 0) continue;

    const shanten = calculateShanten(testHand);
    const baseDanger = tileDangerScore(tile, gameState, playerIndex);
    const focusDanger = suitFocusDanger(tile, gameState, playerIndex);
    const danger = baseDanger + focusDanger;
    const priority = tileDiscardPriority(tile);

    let score: number;

    if (defensive && currentShanten > 1) {
      // Defensive mode: prioritize safety over hand progress
      score = danger * 10;            // primary: avoid dangerous tiles
      score += shanten * 30;          // secondary: still try to reduce shanten
      score -= priority * 2;

      // Strong bonus for safe tiles in defensive mode
      if (isSafeTile(tile, gameState, playerIndex)) {
        score -= 50;
      }
    } else {
      // Aggressive mode: optimize for winning
      score = shanten * 100;          // primary: keep shanten low
      score += danger * 3;            // secondary: avoid dangerous tiles
      score -= priority * 1;

      // Bonus for safe tiles
      if (isSafeTile(tile, gameState, playerIndex)) {
        score -= 20;
      }

      // When tenpai, heavily penalize dangerous discards
      if (currentShanten === 0 && danger > 4) {
        score += 50;
      }
    }

    // Bonus: keep dragon pairs/triplets (fan value)
    if (tile.suit === TileSuit.DRAGON) {
      const dragonCount = hand.filter(t => t.suit === TileSuit.DRAGON && t.dragon === tile.dragon).length;
      if (dragonCount >= 2) score += 15;
    }

    // Bonus: keep seat/prevailing wind pairs+
    if (tile.suit === TileSuit.WIND) {
      const isValuable = tile.wind === player.seatWind || tile.wind === gameState.prevailingWind;
      if (isValuable) {
        const windCount = hand.filter(t => t.wind === tile.wind).length;
        if (windCount >= 2) score += 12;
      }
    }

    candidates.push({ tile, shanten, danger, score });
  }

  // Sort by score (lowest = best discard)
  candidates.sort((a, b) => a.score - b.score);

  const best = candidates[0] || { tile: nonBonus[0] };

  return {
    action: { type: 'DISCARD', tile: best.tile },
    reasoning: `Hard AI: discard ${best.tile.nameEnglish} (${defensive ? 'defensive' : 'aggressive'}, score=${(best as DiscardCandidate).score})`,
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

  // Evaluate all pung/kong claims
  for (const claim of availableClaims) {
    if (claim.claimType === 'kong' || claim.claimType === 'pung') {
      const tiles = claim.tilesFromHand[0];
      if (!tiles) continue;

      const handAfter = player.hand.filter(t => !tiles.find(ct => ct.id === t.id));
      const testHand = handAfter.filter(t => t.type !== TileType.BONUS);

      if (testHand.length >= 10) {
        const newShanten = calculateShanten(testHand.slice(0, 13));

        // Hard AI claims more aggressively:
        // - Always claim if shanten improves
        // - Claim at equal shanten for valuable tiles (dragons, winds)
        // - Claim at equal shanten if close to winning (shanten <= 1)
        if (newShanten < currentShanten) {
          return {
            action: { type: 'CLAIM', claimType: claim.claimType, tilesFromHand: tiles },
            reasoning: `Hard AI: claiming ${claim.claimType} (shanten ${currentShanten}→${newShanten})`,
          };
        }

        if (newShanten === currentShanten) {
          const claimedTile = tiles[0];
          const isDragon = claimedTile?.suit === TileSuit.DRAGON;
          const isValuableWind = claimedTile?.suit === TileSuit.WIND &&
            (claimedTile.wind === player.seatWind || claimedTile.wind === gameState.prevailingWind);
          const isCloseToWin = currentShanten <= 1;

          if (isDragon || isValuableWind || isCloseToWin) {
            return {
              action: { type: 'CLAIM', claimType: claim.claimType, tilesFromHand: tiles },
              reasoning: `Hard AI: aggressive claim ${claim.claimType} (close/valuable)`,
            };
          }
        }
      }
    }
  }

  // Chow: evaluate all combinations and pick the best
  const chowClaims = availableClaims.filter(c => c.claimType === 'chow');
  let bestChow: { tiles: Tile[]; shanten: number } | null = null;

  for (const claim of chowClaims) {
    for (const tiles of claim.tilesFromHand) {
      const handAfter = player.hand.filter(t => !tiles.find(ct => ct.id === t.id));
      const testHand = handAfter.filter(t => t.type !== TileType.BONUS);

      if (testHand.length >= 10) {
        const newShanten = calculateShanten(testHand.slice(0, 13));
        if (newShanten < currentShanten && (!bestChow || newShanten < bestChow.shanten)) {
          bestChow = { tiles, shanten: newShanten };
        }
      }
    }
  }

  if (bestChow) {
    return {
      action: { type: 'CLAIM', claimType: 'chow', tilesFromHand: bestChow.tiles },
      reasoning: `Hard AI: claiming best chow (shanten ${currentShanten}→${bestChow.shanten})`,
    };
  }

  return {
    action: { type: 'PASS' },
    reasoning: 'Hard AI: no beneficial claim',
  };
}
