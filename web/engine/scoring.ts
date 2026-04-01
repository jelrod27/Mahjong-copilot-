/**
 * Hong Kong Old Style Mahjong Scoring.
 * Fan-based system. Payment = basePoints × 2^fan (capped at limit).
 * Pure TypeScript — no framework deps.
 */

import { Tile, TileSuit, TileType, DragonTile, WindTile, tileKey, tilesMatch } from '@/models/Tile';
import { MeldInfo } from '@/models/GameState';
import { ScoringContext, ScoringResult, FanItem, HandDecomposition } from './types';
import { findDecompositions, isThirteenOrphans, isSevenPairs } from './winDetection';

const BASE_POINTS = 8; // base payment in HK Mahjong
const LIMIT_FAN = 10; // limit hand threshold
const MAX_PAYMENT = 256; // limit hand payment (base × 2^5 or flat cap)

/**
 * Calculate the score for a winning hand.
 * Tries all decompositions and returns the highest-scoring one.
 */
export function calculateScore(
  hand: Tile[],
  exposedMelds: MeldInfo[],
  context: ScoringContext,
): ScoringResult {
  const handTiles = hand.filter(t => t.type !== TileType.BONUS);

  // Check limit hands first
  if (isThirteenOrphans([...handTiles, context.winningTile])) {
    return buildLimitResult('Thirteen Orphans', 13, [], handTiles.slice(0, 2), context);
  }

  if (isNineGates(handTiles, context.winningTile)) {
    return buildLimitResult('Nine Gates', 13, [], handTiles.slice(0, 2), context);
  }

  // Find all decompositions
  const allTiles = [...handTiles];
  if (!allTiles.find(t => t.id === context.winningTile.id)) {
    allTiles.push(context.winningTile);
  }
  const decompositions = findDecompositions(allTiles);

  // Combine concealed decompositions with exposed melds
  let bestResult: ScoringResult | null = null;

  for (const decomp of decompositions) {
    const allMelds = [...decomp.melds, ...exposedMelds];
    const fans = evaluateFans(allMelds, decomp.pair, context, handTiles);
    const totalFan = fans.reduce((sum, f) => sum + f.fan, 0);
    const isLimit = totalFan >= LIMIT_FAN;
    const totalPoints = isLimit ? MAX_PAYMENT : BASE_POINTS * Math.pow(2, Math.min(totalFan, 10));

    const result: ScoringResult = {
      fans,
      totalFan,
      basePoints: BASE_POINTS,
      totalPoints,
      handName: getHandName(fans, totalFan),
      melds: allMelds,
      pair: decomp.pair,
    };

    if (!bestResult || result.totalPoints > bestResult.totalPoints) {
      bestResult = result;
    }
  }

  // Fallback: chicken hand (0 fan)
  if (!bestResult) {
    bestResult = {
      fans: [{ name: 'Chicken Hand', fan: 0, description: 'Minimum winning hand' }],
      totalFan: 0,
      basePoints: BASE_POINTS,
      totalPoints: BASE_POINTS,
      melds: exposedMelds,
      pair: [],
    };
  }

  return bestResult;
}

function evaluateFans(
  melds: MeldInfo[],
  pair: Tile[],
  context: ScoringContext,
  concealedTiles: Tile[],
): FanItem[] {
  const fans: FanItem[] = [];
  const allMeldTiles = melds.flatMap(m => m.tiles);
  const allTiles = [...allMeldTiles, ...pair];

  // === Self-drawn ===
  if (context.isSelfDrawn) {
    fans.push({ name: 'Self-Drawn', fan: 1, description: 'Won by drawing own tile' });
  }

  // === Concealed Hand ===
  if (context.isConcealed) {
    fans.push({ name: 'Concealed Hand', fan: 1, description: 'No exposed melds' });
  }

  // === All Pungs ===
  const realMelds = melds.filter(m => m.type !== 'pair');
  if (realMelds.length >= 4 && realMelds.every(m => m.type === 'pung' || m.type === 'kong')) {
    fans.push({ name: 'All Pungs', fan: 3, description: 'All melds are pungs or kongs' });
  }

  // === All Chows ===
  if (realMelds.length >= 4 && realMelds.every(m => m.type === 'chow')) {
    fans.push({ name: 'All Chows', fan: 1, description: 'All melds are chows' });
  }

  // === Dragon pungs ===
  for (const meld of realMelds) {
    if ((meld.type === 'pung' || meld.type === 'kong') && meld.tiles[0].suit === TileSuit.DRAGON) {
      const dragon = meld.tiles[0].dragon;
      const name = dragon === DragonTile.RED ? 'Red' : dragon === DragonTile.GREEN ? 'Green' : 'White';
      fans.push({ name: `${name} Dragon`, fan: 1, description: `Pung/Kong of ${name} Dragon` });
    }
  }

  // === Seat wind pung ===
  for (const meld of realMelds) {
    if ((meld.type === 'pung' || meld.type === 'kong') && meld.tiles[0].wind === context.seatWind) {
      fans.push({ name: 'Seat Wind', fan: 1, description: `Pung of own seat wind` });
    }
  }

  // === Prevailing wind pung ===
  for (const meld of realMelds) {
    if ((meld.type === 'pung' || meld.type === 'kong') && meld.tiles[0].wind === context.prevailingWind) {
      fans.push({ name: 'Prevailing Wind', fan: 1, description: `Pung of prevailing wind` });
    }
  }

  // === Mixed One Suit (mixed with honors) ===
  const suitTiles = allTiles.filter(t => t.type === TileType.SUIT);
  const honorTiles = allTiles.filter(t => t.type === TileType.HONOR);
  const suits = new Set(suitTiles.map(t => t.suit));

  if (suits.size === 1 && honorTiles.length > 0) {
    fans.push({ name: 'Mixed One Suit', fan: 3, description: 'One suit plus honors' });
  }

  // === Pure One Suit (no honors) ===
  if (suits.size === 1 && honorTiles.length === 0 && suitTiles.length === allTiles.length) {
    fans.push({ name: 'Pure One Suit', fan: 7, description: 'All tiles of one suit' });
  }

  // === All Honors ===
  if (allTiles.every(t => t.type === TileType.HONOR)) {
    fans.push({ name: 'All Honors', fan: 10, description: 'All honor tiles (limit hand)' });
  }

  // === All Terminals ===
  if (allTiles.every(t => t.type === TileType.SUIT && (t.number === 1 || t.number === 9))) {
    fans.push({ name: 'All Terminals', fan: 10, description: 'All terminal tiles (limit hand)' });
  }

  // === No Flowers ===
  if (context.flowers.length === 0) {
    fans.push({ name: 'No Flowers', fan: 1, description: 'No bonus tiles collected' });
  }

  // === Flower bonus ===
  if (context.flowers.length > 0) {
    fans.push({ name: 'Flower Tiles', fan: context.flowers.length, description: `${context.flowers.length} flower/season tiles` });
  }

  // === Seven Pairs ===
  if (isSevenPairs(allTiles)) {
    fans.push({ name: 'Seven Pairs', fan: 4, description: 'Seven distinct pairs' });
  }

  // If no fans at all, it's a chicken hand
  if (fans.length === 0) {
    fans.push({ name: 'Chicken Hand', fan: 0, description: 'Minimum winning hand' });
  }

  return fans;
}

function isNineGates(handTiles: Tile[], winningTile: Tile): boolean {
  const allTiles = [...handTiles, winningTile];
  if (allTiles.length !== 14) return false;

  // All must be same suit
  const suits = new Set(allTiles.map(t => t.suit));
  if (suits.size !== 1) return false;
  if (allTiles[0].type !== TileType.SUIT) return false;

  // Count numbers
  const counts = new Map<number, number>();
  for (const t of allTiles) {
    if (t.number === undefined) return false;
    counts.set(t.number, (counts.get(t.number) || 0) + 1);
  }

  // Pattern: 1112345678999 + any tile of suit
  // That means: 1 appears 3+, 9 appears 3+, 2-8 appear 1+, total 14
  const base = [3, 1, 1, 1, 1, 1, 1, 1, 3]; // counts for 1-9
  let extraFound = false;

  for (let n = 1; n <= 9; n++) {
    const count = counts.get(n) || 0;
    const needed = base[n - 1];
    if (count < needed) return false;
    if (count > needed) {
      if (count === needed + 1 && !extraFound) {
        extraFound = true;
      } else {
        return false;
      }
    }
  }

  return true;
}

function buildLimitResult(
  name: string,
  fan: number,
  melds: MeldInfo[],
  pair: Tile[],
  context: ScoringContext,
): ScoringResult {
  return {
    fans: [{ name, fan, description: `${name} — limit hand` }],
    totalFan: fan,
    basePoints: BASE_POINTS,
    totalPoints: MAX_PAYMENT,
    handName: name,
    melds,
    pair,
  };
}

function getHandName(fans: FanItem[], totalFan: number): string | undefined {
  // Return the most impressive fan name
  const namedFans = fans.filter(f => f.fan >= 3);
  if (namedFans.length > 0) {
    return namedFans.sort((a, b) => b.fan - a.fan)[0].name;
  }
  if (totalFan === 0) return 'Chicken Hand';
  return undefined;
}
