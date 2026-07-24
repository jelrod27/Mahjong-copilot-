/**
 * Shared shanten-driven AI policy stack.
 * Medium and hard are the same evaluators parameterized by personality/defense.
 */

import { Tile, TileType, TileSuit, tileKey, tilesMatch } from '@/models/Tile';
import { GameState, MeldInfo } from '@/models/GameState';
import { AIDecision, AvailableClaim, ClaimType } from '../types';
import { calculateShanten } from '../winDetection';
import { canDeclareSelfDrawnWin } from '../turnManager';
import {
  tileDangerScore, isSafeTile, tileDiscardPriority,
  isOpponentDangerous, detectOpponentSuitFocus,
} from './aiUtils';
import { normalizePersonality, AIPersonality } from './personality';

/** Provisional meld formed by claiming the live discard with tiles from hand. */
export function claimMeld(
  claimType: ClaimType,
  tilesFromHand: Tile[],
  discarded: Tile | undefined,
): MeldInfo {
  const type = claimType === 'chow' ? 'chow' : claimType === 'kong' ? 'kong' : 'pung';
  return {
    type,
    tiles: discarded ? [...tilesFromHand, discarded] : tilesFromHand,
    isConcealed: false,
  };
}

/** Bonus for keeping tiles that contribute to known fan patterns. */
export function fanRetentionBonus(
  tile: Tile,
  hand: Tile[],
  gameState: GameState,
  playerIndex: number,
): number {
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

/** Check if any opponent appears dangerous, scaled by defenseBias. */
function shouldPlayDefensive(
  gameState: GameState,
  playerIndex: number,
  personality: AIPersonality,
): boolean {
  let dangerousCount = 0;
  for (let i = 0; i < gameState.players.length; i++) {
    if (i === playerIndex) continue;
    if (isOpponentDangerous(gameState, i)) dangerousCount++;
    // Paranoid players treat any opponent with 2+ exposed melds as a threat
    if (personality.defenseBias >= 1.5 && gameState.players[i].melds.length >= 2) {
      dangerousCount++;
    }
  }
  // Reckless players need to see danger from more than one seat to fold
  const threshold = personality.defenseBias <= 0.6 ? 2 : 1;
  return dangerousCount >= threshold;
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

export interface DiscardPolicyOptions {
  /** Prefix for reasoning strings, e.g. "Medium AI" / "Hard AI". */
  label: string;
  /**
   * Weight on danger/defense terms. 0 = medium (personality only).
   * >0 enables hard-style danger scoring and defensive switching.
   */
  defenseWeight: number;
}

export interface ClaimPolicyOptions {
  /** Prefix for reasoning strings, e.g. "Medium AI" / "Hard AI". */
  label: string;
  /**
   * When true, also claim pung/kong at equal shanten if currentShanten <= 1
   * (hard-style aggression near tenpai).
   */
  claimWhenClose: boolean;
}

/**
 * Shared concealed-kong evaluator. Declares when shanten does not worsen
 * (kong-declared remaining hand vs keeping the quad in hand).
 */
export function evaluateKong(
  gameState: GameState,
  playerIndex: number,
  label: string,
): AIDecision | null {
  const player = gameState.players[playerIndex];
  const hand = player.hand;

  const keyCounts = new Map<string, Tile[]>();
  for (const t of hand) {
    const key = tileKey(t);
    const arr = keyCounts.get(key) || [];
    arr.push(t);
    keyCounts.set(key, arr);
  }

  for (const [, tiles] of Array.from(keyCounts.entries())) {
    if (tiles.length !== 4) continue;

    // Kong-declared: remaining concealed tiles + kong as a completed set.
    // Kong-kept: full hand (preserves seven-pairs option the kong would forfeit).
    const nonBonusHand = hand.filter(t => t.type !== TileType.BONUS);
    const remaining = nonBonusHand.filter(t => !tilesMatch(t, tiles[0]));
    const kongMeld: MeldInfo = { type: 'kong', tiles, isConcealed: true };
    const shantenWithout = calculateShanten(remaining, [...player.melds, kongMeld]);
    const shantenWith = calculateShanten(nonBonusHand, player.melds);
    if (shantenWithout <= shantenWith) {
      return {
        action: { type: 'DECLARE_KONG', tile: tiles[0] },
        reasoning: `${label}: declaring kong (shanten ${shantenWith}→${shantenWithout})`,
      };
    }
  }

  return null;
}

/**
 * Shared discard evaluator. Base score is shanten + fan retention + priority;
 * defenseWeight > 0 adds danger/defense terms from hard AI.
 */
export function chooseDiscard(
  gameState: GameState,
  playerIndex: number,
  options: DiscardPolicyOptions,
): AIDecision {
  const { label, defenseWeight } = options;
  const player = gameState.players[playerIndex];
  const hand = player.hand;
  const personality = normalizePersonality(player.aiPersonality);

  if (canDeclareSelfDrawnWin(gameState, playerIndex)) {
    return { action: { type: 'DECLARE_WIN' }, reasoning: `${label}: winning hand` };
  }

  const kongDecision = evaluateKong(gameState, playerIndex, label);
  if (kongDecision) return kongDecision;

  const nonBonus = hand.filter(t => t.type !== TileType.BONUS);

  // Guard: bonus-only hand (shouldn't happen in normal play, but prevents crashes)
  if (nonBonus.length === 0) {
    const tile = hand[0];
    return {
      action: { type: 'DISCARD', tile },
      reasoning: `${label}: discard ${tile?.nameEnglish || 'tile'} (bonus-only)`,
    };
  }

  const currentShanten = calculateShanten(nonBonus, player.melds);
  const defensive = defenseWeight > 0 && shouldPlayDefensive(gameState, playerIndex, personality);

  let bestTile = nonBonus[0];
  let bestScore = Infinity;

  for (const tile of nonBonus) {
    const remaining = hand.filter(t => t.id !== tile.id);
    const testHand = remaining.filter(t => t.type !== TileType.BONUS);
    if (testHand.length === 0) continue;

    const shanten = calculateShanten(testHand, player.melds);
    const priority = tileDiscardPriority(tile);
    const fanBonus = fanRetentionBonus(tile, hand, gameState, playerIndex);

    // Base (medium) score: lower = better to discard
    let score = shanten * 100;
    // fanGreed scales value-chasing; speedBias erodes it (racers drop value
    // tiles to keep tempo)
    score += fanBonus * 3 * (personality.fanGreed / Math.max(1, personality.speedBias));
    score -= priority * 1; // prefer discarding isolated/terminal tiles

    if (defenseWeight > 0) {
      const baseDanger = tileDangerScore(tile, gameState, playerIndex);
      const focusDanger = suitFocusDanger(tile, gameState, playerIndex);
      const danger = baseDanger + focusDanger;

      if (defensive && currentShanten > 1) {
        // Defensive mode: prioritize safety over hand progress
        score = danger * 10 * personality.defenseBias * defenseWeight;
        score += shanten * 30;
        score -= priority * 2;
        if (isSafeTile(tile, gameState, playerIndex)) {
          score -= 50;
        }
        // Keep fan-valuable tiles even when folding
        score += fanBonus * 2 * personality.fanGreed;
      } else {
        // Aggressive mode with danger awareness
        score += danger * 3 * defenseWeight;
        if (isSafeTile(tile, gameState, playerIndex)) {
          score -= 20;
        }
        // When tenpai, heavily penalize dangerous discards
        if (currentShanten === 0 && danger > 4) {
          score += 50 * defenseWeight;
        }
      }
    }

    if (score < bestScore) {
      bestScore = score;
      bestTile = tile;
    }
  }

  const modeNote = defenseWeight > 0
    ? ` (${defensive ? 'defensive' : 'aggressive'}, score=${bestScore})`
    : ` (score=${bestScore})`;

  return {
    action: { type: 'DISCARD', tile: bestTile },
    reasoning: `${label}: discard ${bestTile.nameEnglish}${modeNote}`,
  };
}

/**
 * Shared claim evaluator. Win always; pung/kong/chow by shanten + fan value,
 * with personality gating and optional near-tenpai aggression.
 */
export function chooseClaim(
  gameState: GameState,
  playerIndex: number,
  availableClaims: AvailableClaim[],
  options: ClaimPolicyOptions,
): AIDecision {
  const { label, claimWhenClose } = options;
  const player = gameState.players[playerIndex];
  const personality = normalizePersonality(player.aiPersonality);
  // High appetite or raw speed lowers the bar for taking tiles off the table
  const aggressive = Math.max(personality.claimAppetite, personality.speedBias) >= 1.4;
  const reluctant = personality.claimAppetite <= 0.7;

  const winClaim = availableClaims.find(c => c.claimType === 'win');
  if (winClaim) {
    return {
      action: { type: 'CLAIM', claimType: 'win', tilesFromHand: winClaim.tilesFromHand[0] || [] },
      reasoning: `${label}: claiming win`,
    };
  }

  const currentHand = player.hand.filter(t => t.type !== TileType.BONUS);
  const currentShanten = calculateShanten(currentHand, player.melds);
  const discarded = gameState.lastDiscardedTile;

  for (const claim of availableClaims) {
    if (claim.claimType !== 'kong' && claim.claimType !== 'pung') continue;
    const tiles = claim.tilesFromHand[0];
    if (!tiles) continue;

    const handAfter = player.hand
      .filter(t => !tiles.find(ct => ct.id === t.id))
      .filter(t => t.type !== TileType.BONUS);
    const newMelds = [...player.melds, claimMeld(claim.claimType, tiles, discarded)];
    const newShanten = calculateShanten(handAfter, newMelds);

    if (newShanten < currentShanten) {
      return {
        action: { type: 'CLAIM', claimType: claim.claimType, tilesFromHand: tiles },
        reasoning: `${label}: claiming ${claim.claimType} (shanten ${currentShanten}→${newShanten})`,
      };
    }

    if (newShanten === currentShanten && !reluctant) {
      const claimedTile = tiles[0];
      const isDragon = claimedTile?.suit === TileSuit.DRAGON;
      const isSeatWind = claimedTile?.suit === TileSuit.WIND && claimedTile.wind === player.seatWind;
      const isPrevailingWind = claimedTile?.suit === TileSuit.WIND
        && claimedTile.wind === gameState.prevailingWind;
      const isCloseToWin = claimWhenClose && currentShanten <= 1;

      if (isDragon || isSeatWind || isPrevailingWind || aggressive || isCloseToWin) {
        return {
          action: { type: 'CLAIM', claimType: claim.claimType, tilesFromHand: tiles },
          reasoning: isCloseToWin && !(isDragon || isSeatWind || isPrevailingWind || aggressive)
            ? `${label}: aggressive claim ${claim.claimType} (close/valuable)`
            : `${label}: claiming ${claim.claimType} at equal shanten`,
        };
      }
    }
  }

  // Chow: evaluate all combinations and pick the best shanten improvement.
  // Reluctant claimers never chow — it opens the hand for the least value.
  if (!reluctant) {
    const chowClaims = availableClaims.filter(c => c.claimType === 'chow');
    let bestChow: { tiles: Tile[]; shanten: number } | null = null;

    for (const claim of chowClaims) {
      for (const tiles of claim.tilesFromHand) {
        const handAfter = player.hand
          .filter(t => !tiles.find(ct => ct.id === t.id))
          .filter(t => t.type !== TileType.BONUS);
        const newMelds = [...player.melds, claimMeld('chow', tiles, discarded)];
        const newShanten = calculateShanten(handAfter, newMelds);
        if (newShanten < currentShanten && (!bestChow || newShanten < bestChow.shanten)) {
          bestChow = { tiles, shanten: newShanten };
        }
      }
    }

    if (bestChow) {
      return {
        action: { type: 'CLAIM', claimType: 'chow', tilesFromHand: bestChow.tiles },
        reasoning: `${label}: claiming chow (shanten ${currentShanten}→${bestChow.shanten})`,
      };
    }
  }

  return {
    action: { type: 'PASS' },
    reasoning: `${label}: no beneficial claim`,
  };
}
