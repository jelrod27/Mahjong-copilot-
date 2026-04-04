/**
 * Claiming and set validation logic.
 * Extracted from SetBuilder + new claim validation for game play.
 * Pure TypeScript — no framework deps.
 */

import { Tile, TileSuit, TileType, tilesMatch, tileKey } from '@/models/Tile';
import { Player, ClaimType, MeldInfo } from '@/models/GameState';
import { AvailableClaim } from './types';
import { isWinningHand } from './winDetection';

// ============================================
// Basic set validation (extracted from SetBuilder)
// ============================================

/** Check if two tiles are the same type (suit, number, wind, dragon) */
export function isSameTile(t1: Tile, t2: Tile): boolean {
  return tilesMatch(t1, t2);
}

/** 3 identical tiles */
export function isPung(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false;
  return isSameTile(tiles[0], tiles[1]) && isSameTile(tiles[1], tiles[2]);
}

/** 3 consecutive numbered tiles of the same suit */
export function isChow(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false;
  if (tiles.some(t => t.type !== TileType.SUIT)) return false;
  if (tiles.some(t => t.suit !== tiles[0].suit)) return false;
  const numbers = tiles.map(t => t.number!).sort((a, b) => a - b);
  return numbers[1] === numbers[0] + 1 && numbers[2] === numbers[1] + 1;
}

/** 4 identical tiles */
export function isKong(tiles: Tile[]): boolean {
  if (tiles.length !== 4) return false;
  return tiles.every(t => isSameTile(t, tiles[0]));
}

/** 2 identical tiles */
export function isPair(tiles: Tile[]): boolean {
  if (tiles.length !== 2) return false;
  return isSameTile(tiles[0], tiles[1]);
}

// ============================================
// Claim validation for game play
// ============================================

/** Claim priority: Win=4, Kong=3, Pung=2, Chow=1 */
const CLAIM_PRIORITY: Record<ClaimType, number> = {
  win: 4,
  kong: 3,
  pung: 2,
  chow: 1,
};

/**
 * Get all valid claims a player can make on a discarded tile.
 * @param discardedTile The tile that was just discarded
 * @param player The player considering a claim
 * @param playerIndex Index of the claiming player
 * @param discarderIndex Index of the player who discarded
 * @param numPlayers Total players (4)
 */
export function getAvailableClaims(
  discardedTile: Tile,
  player: Player,
  playerIndex: number,
  discarderIndex: number,
  numPlayers: number = 4,
): AvailableClaim[] {
  const claims: AvailableClaim[] = [];
  const hand = player.hand;

  // Check for Win (any player can claim win from any discard)
  const handWithDiscard = [...hand, discardedTile];
  if (isWinningHand(handWithDiscard)) {
    claims.push({
      playerId: player.id,
      claimType: 'win',
      tilesFromHand: [hand], // whole hand used
      priority: CLAIM_PRIORITY.win,
    });
  }

  // Check for Kong (3 matching tiles in hand + discarded = 4)
  const kongMatches = hand.filter(t => isSameTile(t, discardedTile));
  if (kongMatches.length >= 3) {
    claims.push({
      playerId: player.id,
      claimType: 'kong',
      tilesFromHand: [kongMatches.slice(0, 3)],
      priority: CLAIM_PRIORITY.kong,
    });
  }

  // Check for Pung (2 matching tiles in hand + discarded = 3)
  if (kongMatches.length >= 2) {
    claims.push({
      playerId: player.id,
      claimType: 'pung',
      tilesFromHand: [kongMatches.slice(0, 2)],
      priority: CLAIM_PRIORITY.pung,
    });
  }

  // Check for Chow (only from the player to your left, i.e. previous player)
  const isLeftPlayer = (discarderIndex + 1) % numPlayers === playerIndex;
  if (isLeftPlayer && discardedTile.type === TileType.SUIT && discardedTile.number !== undefined) {
    const chowCombos = findChowCombinations(hand, discardedTile);
    if (chowCombos.length > 0) {
      claims.push({
        playerId: player.id,
        claimType: 'chow',
        tilesFromHand: chowCombos,
        priority: CLAIM_PRIORITY.chow,
      });
    }
  }

  return claims;
}

/**
 * Pick the highest-priority claim Mahjong rules allow (win > kong > pung > chow).
 * Uses the first valid tile combination when several exist (e.g. multiple chows).
 */
export function getBestClaimSubmission(
  claims: AvailableClaim[],
): { claimType: ClaimType; tilesFromHand: Tile[] } | null {
  if (claims.length === 0) return null;
  let best = claims[0];
  for (let i = 1; i < claims.length; i++) {
    if (claims[i].priority > best.priority) {
      best = claims[i];
    }
  }
  const combo = best.tilesFromHand[0];
  if (!combo) return null;
  return { claimType: best.claimType, tilesFromHand: combo };
}

/**
 * Find all possible chow combinations using 2 tiles from hand + the discarded tile.
 */
function findChowCombinations(hand: Tile[], discarded: Tile): Tile[][] {
  if (discarded.type !== TileType.SUIT || discarded.number === undefined) return [];

  const suit = discarded.suit;
  const num = discarded.number;
  const suitTiles = hand.filter(t => t.suit === suit && t.number !== undefined);
  const combos: Tile[][] = [];

  // Discarded tile could be low, middle, or high in the sequence
  const sequences = [
    [num - 2, num - 1], // discarded is high: [n-2, n-1, n]
    [num - 1, num + 1], // discarded is middle: [n-1, n, n+1]
    [num + 1, num + 2], // discarded is low: [n, n+1, n+2]
  ];

  for (const [a, b] of sequences) {
    if (a < 1 || b > 9) continue;
    const tileA = suitTiles.find(t => t.number === a);
    const tileB = suitTiles.find(t => t.number === b && t.id !== tileA?.id);
    if (tileA && tileB) {
      combos.push([tileA, tileB]);
    }
  }

  return combos;
}

/**
 * Resolve competing claims — highest priority wins.
 * On tie, closest to discarder in turn order wins.
 */
export function resolveClaims(
  claims: AvailableClaim[],
  discarderIndex: number,
  numPlayers: number,
  playerIndexMap: Record<string, number>,
): AvailableClaim | null {
  if (claims.length === 0) return null;

  return claims.sort((a, b) => {
    // Higher priority wins
    if (b.priority !== a.priority) return b.priority - a.priority;
    // On tie, closer to discarder in turn order wins
    const distA = ((playerIndexMap[a.playerId] - discarderIndex) + numPlayers) % numPlayers;
    const distB = ((playerIndexMap[b.playerId] - discarderIndex) + numPlayers) % numPlayers;
    return distA - distB;
  })[0];
}
