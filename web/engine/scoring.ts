/**
 * Hong Kong Old Style Mahjong Scoring.
 * Fan-based system. Payment = basePoints × 2^fan (capped at limit).
 * Pure TypeScript — no framework deps.
 */

import { Tile, TileSuit, TileType, DragonTile, WindTile, tileKey, tilesMatch } from '@/models/Tile';
import { MeldInfo } from '@/models/GameState';
import { ScoringContext, ScoringResult, FanItem, HandDecomposition, PaymentBreakdown, DEFAULT_MIN_FAAN } from './types';
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
  const realMelds = melds.filter(m => m.type !== 'pair');

  // === Limit hand checks (return immediately if found) ===

  // All Honors — all honor tiles
  if (allTiles.every(t => t.type === TileType.HONOR)) {
    return [{ name: 'All Honors', fan: LIMIT_FAN, description: 'All honor tiles (limit hand)' }];
  }

  // All Terminals — all 1s and 9s
  if (allTiles.every(t => t.type === TileType.SUIT && (t.number === 1 || t.number === 9))) {
    return [{ name: 'All Terminals', fan: LIMIT_FAN, description: 'All terminal tiles (limit hand)' }];
  }

  // Big Three Dragons — pung/kong of all 3 dragons
  const dragonMelds = realMelds.filter(m =>
    (m.type === 'pung' || m.type === 'kong') && m.tiles[0].suit === TileSuit.DRAGON
  );
  if (dragonMelds.length === 3) {
    return [{ name: 'Big Three Dragons', fan: LIMIT_FAN, description: 'Pung/kong of all three dragons (limit hand)' }];
  }

  // Big Four Winds — pung/kong of all 4 winds
  const windMelds = realMelds.filter(m =>
    (m.type === 'pung' || m.type === 'kong') && m.tiles[0].suit === TileSuit.WIND
  );
  if (windMelds.length === 4) {
    return [{ name: 'Big Four Winds', fan: LIMIT_FAN, description: 'Pung/kong of all four winds (limit hand)' }];
  }

  // Small Four Winds — 3 wind pungs + wind pair
  const pairIsWind = pair.length === 2 && pair[0].suit === TileSuit.WIND;
  if (windMelds.length === 3 && pairIsWind) {
    return [{ name: 'Small Four Winds', fan: LIMIT_FAN, description: 'Three wind pungs + wind pair (limit hand)' }];
  }

  // Four Concealed Pungs — all 4 melds are concealed pungs, self-draw win
  if (context.isConcealed && context.isSelfDrawn &&
      realMelds.length >= 4 && realMelds.every(m => m.type === 'pung' || m.type === 'kong')) {
    return [{ name: 'Four Concealed Pungs', fan: LIMIT_FAN, description: 'Four concealed pungs with self-draw (limit hand)' }];
  }

  // All Kongs — 4 kongs
  if (realMelds.length >= 4 && realMelds.every(m => m.type === 'kong')) {
    return [{ name: 'All Kongs', fan: LIMIT_FAN, description: 'Four kongs (limit hand)' }];
  }

  // === Standard fan patterns ===

  // Self-drawn
  if (context.isSelfDrawn) {
    fans.push({ name: 'Self-Drawn', fan: 1, description: 'Won by drawing own tile' });
  }

  // Concealed Hand
  if (context.isConcealed) {
    fans.push({ name: 'Concealed Hand', fan: 1, description: 'No exposed melds' });
  }

  // All Pungs
  if (realMelds.length >= 4 && realMelds.every(m => m.type === 'pung' || m.type === 'kong')) {
    fans.push({ name: 'All Pungs', fan: 3, description: 'All melds are pungs or kongs' });
  }

  // All Chows
  if (realMelds.length >= 4 && realMelds.every(m => m.type === 'chow')) {
    fans.push({ name: 'All Chows', fan: 1, description: 'All melds are chows' });
  }

  // Dragon pungs (1 fan each)
  for (const meld of dragonMelds) {
    const dragon = meld.tiles[0].dragon;
    const name = dragon === DragonTile.RED ? 'Red' : dragon === DragonTile.GREEN ? 'Green' : 'White';
    fans.push({ name: `${name} Dragon`, fan: 1, description: `Pung/Kong of ${name} Dragon` });
  }

  // Small Three Dragons — 2 dragon pungs + dragon pair (net 5 faan including the 2 individual dragon fans above)
  const pairIsDragon = pair.length === 2 && pair[0].suit === TileSuit.DRAGON;
  if (dragonMelds.length === 2 && pairIsDragon) {
    fans.push({ name: 'Small Three Dragons', fan: 3, description: 'Two dragon pungs + dragon pair' });
  }

  // Seat wind pung
  for (const meld of realMelds) {
    if ((meld.type === 'pung' || meld.type === 'kong') && meld.tiles[0].wind === context.seatWind) {
      fans.push({ name: 'Seat Wind', fan: 1, description: `Pung of own seat wind` });
    }
  }

  // Prevailing wind pung
  for (const meld of realMelds) {
    if ((meld.type === 'pung' || meld.type === 'kong') && meld.tiles[0].wind === context.prevailingWind) {
      fans.push({ name: 'Prevailing Wind', fan: 1, description: `Pung of prevailing wind` });
    }
  }

  // Mixed One Suit / Pure One Suit (mutually exclusive)
  const suitTiles = allTiles.filter(t => t.type === TileType.SUIT);
  const honorTiles = allTiles.filter(t => t.type === TileType.HONOR);
  const suits = new Set(suitTiles.map(t => t.suit));

  if (suits.size === 1 && honorTiles.length === 0 && suitTiles.length === allTiles.length) {
    fans.push({ name: 'Pure One Suit', fan: 7, description: 'All tiles of one suit' });
  } else if (suits.size === 1 && honorTiles.length > 0) {
    fans.push({ name: 'Mixed One Suit', fan: 3, description: 'One suit plus honors' });
  }

  // No Flowers
  if (context.flowers.length === 0) {
    fans.push({ name: 'No Flowers', fan: 1, description: 'No bonus tiles collected' });
  }

  // Flower bonus (total count)
  if (context.flowers.length > 0) {
    fans.push({ name: 'Flower Tiles', fan: context.flowers.length, description: `${context.flowers.length} flower/season tiles` });
  }

  // Seat Flower/Season matching (1 faan per match)
  const seatNumberMap: Record<string, number> = { east: 1, south: 2, west: 3, north: 4 };
  const seatNumber = seatNumberMap[context.seatWind] ?? 0;
  if (seatNumber > 0) {
    const flowerNames = ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'];
    const seasonNames = ['Spring', 'Summer', 'Autumn', 'Winter'];
    for (const f of context.flowers) {
      const flowerIdx = flowerNames.indexOf(f.flower ?? '');
      const seasonIdx = seasonNames.indexOf(f.season ?? '');
      if (flowerIdx + 1 === seatNumber || seasonIdx + 1 === seatNumber) {
        fans.push({ name: 'Seat Flower', fan: 1, description: 'Flower/season matches seat wind' });
      }
    }
  }

  // Win-method bonuses
  if (context.winMethod === 'robKong') {
    fans.push({ name: 'Robbing the Kong', fan: 1, description: 'Won by robbing a kong' });
  }
  if (context.winMethod === 'kongReplacement') {
    fans.push({ name: 'Win on Kong Replacement', fan: 1, description: 'Won from kong replacement draw' });
  }
  if (context.winMethod === 'lastTileDraw') {
    fans.push({ name: 'Last Tile Draw', fan: 1, description: 'Won by drawing the last wall tile' });
  }
  if (context.winMethod === 'lastTileClaim') {
    fans.push({ name: 'Last Tile Claim', fan: 1, description: 'Won by claiming the last discard' });
  }

  // Seven Pairs
  if (isSevenPairs(allTiles)) {
    fans.push({ name: 'Seven Pairs', fan: 4, description: 'Seven distinct pairs' });
  }

  // If no fans at all, it's a chicken hand
  if (fans.length === 0) {
    fans.push({ name: 'Chicken Hand', fan: 0, description: 'Minimum winning hand' });
  }

  return fans;
}

/**
 * Calculate payment distribution after a win.
 */
export function calculatePayment(
  result: ScoringResult,
  winnerIndex: number,
  discarderIndex: number | undefined,
  isSelfDrawn: boolean,
  playerCount: number = 4,
): PaymentBreakdown {
  const payments: PaymentBreakdown['payments'] = [];
  const base = result.totalPoints;

  if (isSelfDrawn) {
    // Self-draw: all other players pay 2× base
    for (let i = 0; i < playerCount; i++) {
      if (i === winnerIndex) continue;
      payments.push({ fromPlayerIndex: i, toPlayerIndex: winnerIndex, amount: base * 2 });
    }
  } else if (discarderIndex !== undefined) {
    // Discard win: discarder pays 2×, others pay 1×
    for (let i = 0; i < playerCount; i++) {
      if (i === winnerIndex) continue;
      const amount = i === discarderIndex ? base * 2 : base;
      payments.push({ fromPlayerIndex: i, toPlayerIndex: winnerIndex, amount });
    }
  }

  return { payments };
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

/**
 * Check whether a would-be winning hand meets the configured minimum faan threshold.
 * HK standard is 3-faan minimum; overridable via `context.minFaan` (e.g. 1 or 0 for
 * beginner/learning modes). This is the legality gate used by the turn manager when
 * a player attempts to declare a win.
 *
 * A hand meets the threshold iff at least one valid decomposition scores >= minFaan.
 * The 0-faan "chicken hand" fallback is intentionally excluded — it is the signal
 * that no scoring decomposition was found and therefore the hand cannot legally win
 * under HK rules.
 */
export function meetsMinFaan(
  hand: Tile[],
  exposedMelds: MeldInfo[],
  context: ScoringContext,
): boolean {
  const min = context.minFaan ?? DEFAULT_MIN_FAAN;
  if (min <= 0) return true; // no threshold — any winning shape qualifies

  const result = calculateScore(hand, exposedMelds, context);
  // Treat the chicken-hand fallback as 0 faan regardless of what totalFan reports.
  const isChicken = result.fans.length === 1 && result.fans[0].name === 'Chicken Hand';
  const effectiveFaan = isChicken ? 0 : result.totalFan;
  return effectiveFaan >= min;
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
