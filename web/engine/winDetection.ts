/**
 * Win detection for Hong Kong Mahjong.
 * Checks if a hand of tiles forms a valid winning hand.
 * Pure TypeScript — no framework deps.
 */

import { Tile, TileSuit, TileType, tileKey, tilesMatch } from '@/models/Tile';
import { MeldInfo } from '@/models/GameState';
import { HandDecomposition } from './types';

/**
 * Check if a set of tiles (typically 14) forms a winning hand.
 * Standard win: 4 melds (chow or pung) + 1 pair.
 * Also checks special hands.
 */
export function isWinningHand(tiles: Tile[]): boolean {
  // Remove bonus tiles (flowers/seasons) — they don't count in hand
  const handTiles = tiles.filter(t => t.type !== TileType.BONUS);

  if (handTiles.length !== 14) return false;

  // Check special hands first
  if (isThirteenOrphans(handTiles)) return true;
  if (isSevenPairs(handTiles)) return true;

  // Check standard 4 melds + 1 pair
  return findStandardDecomposition(handTiles) !== null;
}

/**
 * Find all valid decompositions of a winning hand.
 * Returns all ways to arrange tiles into 4 melds + 1 pair.
 */
export function findDecompositions(tiles: Tile[]): HandDecomposition[] {
  const handTiles = tiles.filter(t => t.type !== TileType.BONUS);
  if (handTiles.length !== 14) return [];

  const results: HandDecomposition[] = [];

  // Check special hands
  if (isThirteenOrphans(handTiles)) {
    results.push({
      melds: [], // special hand, no standard melds
      pair: handTiles, // entire hand is the "pair" conceptually
    });
  }

  if (isSevenPairs(handTiles)) {
    const pairs = getSevenPairsDecomposition(handTiles);
    if (pairs) {
      results.push({
        melds: pairs.map(p => ({ tiles: p, type: 'pair' as const, isConcealed: true })),
        pair: [],
      });
    }
  }

  // Standard decomposition
  const sorted = sortTiles(handTiles);
  findStandardDecompositions(sorted, [], results);

  return results;
}

// ============================================
// Standard decomposition: 4 melds + 1 pair
// ============================================

function findStandardDecomposition(tiles: Tile[]): HandDecomposition | null {
  const sorted = sortTiles(tiles);
  const results: HandDecomposition[] = [];
  findStandardDecompositions(sorted, [], results);
  return results.length > 0 ? results[0] : null;
}

function findStandardDecompositions(
  remaining: Tile[],
  currentMelds: MeldInfo[],
  results: HandDecomposition[],
): void {
  // If we've found enough melds, check if remaining 2 tiles form a pair
  if (currentMelds.length === 4) {
    if (remaining.length === 2 && tilesMatch(remaining[0], remaining[1])) {
      results.push({
        melds: [...currentMelds],
        pair: [...remaining],
      });
    }
    return;
  }

  if (remaining.length < 2) return;

  // If we still need melds, first try extracting a pair (only when we have 0 melds extracted,
  // since pair must be extracted exactly once). Actually, the pair can be at any position,
  // so we should try extracting pair at the start when we have exactly 2+3*n remaining.
  const meldsNeeded = 4 - currentMelds.length;
  const expectedRemaining = meldsNeeded * 3 + 2; // melds*3 + pair(2)

  if (remaining.length !== expectedRemaining) return;

  // Try using the first tile in a pair
  for (let i = 1; i < remaining.length; i++) {
    if (tilesMatch(remaining[0], remaining[i])) {
      if (meldsNeeded === 0) {
        // This is the pair
        if (remaining.length === 2) {
          results.push({
            melds: [...currentMelds],
            pair: [remaining[0], remaining[i]],
          });
        }
      }
      // Try extracting as pair (only if we haven't committed to all melds yet)
      // We detect "pair extraction" by checking if remaining count matches pair scenario
      break; // only need to try the first match
    }
  }

  // Try extracting the first tile as part of a pung
  if (remaining.length >= 3) {
    const first = remaining[0];
    const pungTiles = remaining.filter(t => tilesMatch(t, first));

    if (pungTiles.length >= 3) {
      const pung = pungTiles.slice(0, 3);
      const rest = removeFromArray(remaining, pung);
      findStandardDecompositions(rest, [
        ...currentMelds,
        { tiles: pung, type: 'pung', isConcealed: true },
      ], results);
    }

    // Try extracting as part of a chow (suit tiles only)
    if (first.type === TileType.SUIT && first.number !== undefined) {
      const n = first.number;
      const suit = first.suit;
      const t2 = remaining.find(t => t.suit === suit && t.number === n + 1 && t.id !== first.id);
      const t3 = remaining.find(t => t.suit === suit && t.number === n + 2 && t.id !== first.id && t.id !== t2?.id);

      if (t2 && t3) {
        const chow = [first, t2, t3];
        const rest = removeFromArray(remaining, chow);
        findStandardDecompositions(rest, [
          ...currentMelds,
          { tiles: chow, type: 'chow', isConcealed: true },
        ], results);
      }
    }
  }

  // Try extracting the first tile as part of a pair (if we have exactly pair + melds remaining)
  if (remaining.length === expectedRemaining) {
    for (let i = 1; i < remaining.length; i++) {
      if (tilesMatch(remaining[0], remaining[i])) {
        const pair = [remaining[0], remaining[i]];
        const rest = removeFromArray(remaining, pair);
        // Now try to decompose the rest into exactly meldsNeeded melds (no more pair)
        findMeldsOnly(rest, currentMelds, pair, results);
        break; // Only try one pair extraction per position to avoid duplicates
      }
    }
  }
}

/** Try to decompose tiles into exactly N melds (no pair) */
function findMeldsOnly(
  remaining: Tile[],
  currentMelds: MeldInfo[],
  pair: Tile[],
  results: HandDecomposition[],
): void {
  if (remaining.length === 0) {
    if (currentMelds.length === 4) {
      results.push({ melds: [...currentMelds], pair: [...pair] });
    }
    return;
  }

  if (remaining.length < 3) return;

  const first = remaining[0];

  // Try pung
  const pungTiles = remaining.filter(t => tilesMatch(t, first));
  if (pungTiles.length >= 3) {
    const pung = pungTiles.slice(0, 3);
    const rest = removeFromArray(remaining, pung);
    findMeldsOnly(rest, [
      ...currentMelds,
      { tiles: pung, type: 'pung', isConcealed: true },
    ], pair, results);
  }

  // Try chow
  if (first.type === TileType.SUIT && first.number !== undefined) {
    const n = first.number;
    const suit = first.suit;
    const t2 = remaining.find(t => t.suit === suit && t.number === n + 1 && t.id !== first.id);
    const t3 = remaining.find(t => t.suit === suit && t.number === n + 2 && t.id !== first.id && t.id !== t2?.id);

    if (t2 && t3) {
      const chow = [first, t2, t3];
      const rest = removeFromArray(remaining, chow);
      findMeldsOnly(rest, [
        ...currentMelds,
        { tiles: chow, type: 'chow', isConcealed: true },
      ], pair, results);
    }
  }
}

// ============================================
// Special hands
// ============================================

/** Thirteen Orphans: one each of all terminals + honors, plus one duplicate */
export function isThirteenOrphans(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;

  const required = new Set([
    'dot_1', 'dot_9', 'bamboo_1', 'bamboo_9', 'character_1', 'character_9',
    'wind_east', 'wind_south', 'wind_west', 'wind_north',
    'dragon_red', 'dragon_green', 'dragon_white',
  ]);

  const keys = tiles.map(t => tileKey(t));
  const found = new Set<string>();
  let extraCount = 0;

  for (const k of keys) {
    if (required.has(k)) {
      if (found.has(k)) {
        extraCount++;
      } else {
        found.add(k);
      }
    } else {
      return false; // non-terminal/non-honor tile
    }
  }

  return found.size === 13 && extraCount === 1;
}

/** Seven Pairs: 7 distinct pairs */
export function isSevenPairs(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;

  const keyCounts = new Map<string, number>();
  for (const t of tiles) {
    const k = tileKey(t);
    keyCounts.set(k, (keyCounts.get(k) || 0) + 1);
  }

  // Must have exactly 7 pairs
  if (keyCounts.size !== 7) return false;
  const values = Array.from(keyCounts.values());
  for (const count of values) {
    if (count !== 2) return false;
  }
  return true;
}

function getSevenPairsDecomposition(tiles: Tile[]): Tile[][] | null {
  if (!isSevenPairs(tiles)) return null;
  const pairs: Tile[][] = [];
  const used = new Set<string>();

  for (const tile of tiles) {
    if (used.has(tile.id)) continue;
    const partner = tiles.find(t => t.id !== tile.id && !used.has(t.id) && tilesMatch(t, tile));
    if (partner) {
      pairs.push([tile, partner]);
      used.add(tile.id);
      used.add(partner.id);
    }
  }

  return pairs.length === 7 ? pairs : null;
}

// ============================================
// Utilities
// ============================================

/** Sort tiles by suit then number for consistent processing */
function sortTiles(tiles: Tile[]): Tile[] {
  const suitOrder: Record<string, number> = {
    [TileSuit.DOT]: 0,
    [TileSuit.BAMBOO]: 1,
    [TileSuit.CHARACTER]: 2,
    [TileSuit.WIND]: 3,
    [TileSuit.DRAGON]: 4,
  };

  return [...tiles].sort((a, b) => {
    const suitDiff = (suitOrder[a.suit] ?? 9) - (suitOrder[b.suit] ?? 9);
    if (suitDiff !== 0) return suitDiff;
    return (a.number ?? 0) - (b.number ?? 0);
  });
}

/** Remove specific tiles from array by id */
function removeFromArray(arr: Tile[], toRemove: Tile[]): Tile[] {
  const removeIds = new Set(toRemove.map(t => t.id));
  return arr.filter(t => !removeIds.has(t.id));
}

/**
 * Calculate shanten number — distance from winning.
 * 0 = tenpai (one tile away), -1 = already won, >0 = further away.
 * Simplified calculation for AI use.
 */
export function calculateShanten(hand: Tile[]): number {
  const tiles = hand.filter(t => t.type !== TileType.BONUS);

  // Already winning
  if (tiles.length === 14 && isWinningHand(tiles)) return -1;

  // For 13-tile hand, try adding each possible tile and check if it wins
  if (tiles.length === 13) {
    // Check thirteen orphans shanten
    const orphansShanten = thirteenOrphansShanten(tiles);

    // Check seven pairs shanten
    const sevenPairsShanten = sevenPairsShanten_calc(tiles);

    // Check standard shanten
    const standardShanten = standardShanten_calc(tiles);

    return Math.min(orphansShanten, sevenPairsShanten, standardShanten);
  }

  return 8; // worst case
}

function thirteenOrphansShanten(tiles: Tile[]): number {
  const required = [
    'dot_1', 'dot_9', 'bamboo_1', 'bamboo_9', 'character_1', 'character_9',
    'wind_east', 'wind_south', 'wind_west', 'wind_north',
    'dragon_red', 'dragon_green', 'dragon_white',
  ];

  const keys = tiles.map(t => tileKey(t));
  let found = 0;
  let hasPair = false;

  for (const req of required) {
    const count = keys.filter(k => k === req).length;
    if (count >= 1) found++;
    if (count >= 2) hasPair = true;
  }

  return 13 - found - (hasPair ? 1 : 0);
}

function sevenPairsShanten_calc(tiles: Tile[]): number {
  const keyCounts = new Map<string, number>();
  for (const t of tiles) {
    const k = tileKey(t);
    keyCounts.set(k, (keyCounts.get(k) || 0) + 1);
  }

  let pairs = 0;
  const vals = Array.from(keyCounts.values());
  for (const count of vals) {
    pairs += Math.floor(count / 2);
  }

  return 6 - pairs;
}

function standardShanten_calc(tiles: Tile[]): number {
  // Simplified: count mentsu (complete melds) and partial melds
  const sorted = sortTiles(tiles);
  let bestShanten = 8;

  // Try each possible pair
  for (let i = 0; i < sorted.length - 1; i++) {
    if (tilesMatch(sorted[i], sorted[i + 1])) {
      const remaining = [...sorted.slice(0, i), ...sorted.slice(i + 2)];
      const { melds, partials } = countMeldsAndPartials(remaining);
      const shanten = 8 - 2 * melds - partials - 1; // -1 for having pair
      bestShanten = Math.min(bestShanten, Math.max(shanten, -1));

      // Skip duplicate pair attempts
      while (i + 2 < sorted.length && tilesMatch(sorted[i], sorted[i + 2])) i++;
    }
  }

  // Try without extracting a pair
  const { melds, partials } = countMeldsAndPartials(sorted);
  const shanten = 8 - 2 * melds - partials;
  bestShanten = Math.min(bestShanten, shanten);

  return Math.max(bestShanten, -1);
}

function countMeldsAndPartials(tiles: Tile[]): { melds: number; partials: number } {
  if (tiles.length === 0) return { melds: 0, partials: 0 };

  let bestMelds = 0;
  let bestPartials = 0;

  const first = tiles[0];
  const rest = tiles.slice(1);

  // Try pung
  const matching = tiles.filter(t => tilesMatch(t, first));
  if (matching.length >= 3) {
    const afterPung = removeFromArray(tiles, matching.slice(0, 3));
    const r = countMeldsAndPartials(afterPung);
    if (r.melds + 1 > bestMelds || (r.melds + 1 === bestMelds && r.partials > bestPartials)) {
      bestMelds = r.melds + 1;
      bestPartials = r.partials;
    }
  }

  // Try chow
  if (first.type === TileType.SUIT && first.number !== undefined) {
    const n = first.number;
    const suit = first.suit;
    const t2 = tiles.find(t => t.suit === suit && t.number === n + 1 && t.id !== first.id);
    const t3 = t2 ? tiles.find(t => t.suit === suit && t.number === n + 2 && t.id !== first.id && t.id !== t2.id) : null;

    if (t2 && t3) {
      const afterChow = removeFromArray(tiles, [first, t2, t3]);
      const r = countMeldsAndPartials(afterChow);
      if (r.melds + 1 > bestMelds || (r.melds + 1 === bestMelds && r.partials > bestPartials)) {
        bestMelds = r.melds + 1;
        bestPartials = r.partials;
      }
    }

    // Try partial: pair
    if (matching.length >= 2) {
      const afterPair = removeFromArray(tiles, matching.slice(0, 2));
      const r = countMeldsAndPartials(afterPair);
      if (r.melds > bestMelds || (r.melds === bestMelds && r.partials + 1 > bestPartials)) {
        bestMelds = r.melds;
        bestPartials = r.partials + 1;
      }
    }

    // Try partial: adjacent pair (e.g. 3,4 waiting for 2 or 5)
    if (t2) {
      const afterAdj = removeFromArray(tiles, [first, t2]);
      const r = countMeldsAndPartials(afterAdj);
      if (r.melds > bestMelds || (r.melds === bestMelds && r.partials + 1 > bestPartials)) {
        bestMelds = r.melds;
        bestPartials = r.partials + 1;
      }
    }

    // Try partial: gap pair (e.g. 3,5 waiting for 4)
    if (t3 && !t2) {
      const t3direct = tiles.find(t => t.suit === suit && t.number === n + 2 && t.id !== first.id);
      if (t3direct) {
        const afterGap = removeFromArray(tiles, [first, t3direct]);
        const r = countMeldsAndPartials(afterGap);
        if (r.melds > bestMelds || (r.melds === bestMelds && r.partials + 1 > bestPartials)) {
          bestMelds = r.melds;
          bestPartials = r.partials + 1;
        }
      }
    }
  } else {
    // Honor tile: try partial pair
    if (matching.length >= 2) {
      const afterPair = removeFromArray(tiles, matching.slice(0, 2));
      const r = countMeldsAndPartials(afterPair);
      if (r.melds > bestMelds || (r.melds === bestMelds && r.partials + 1 > bestPartials)) {
        bestMelds = r.melds;
        bestPartials = r.partials + 1;
      }
    }
  }

  // Try skipping first tile entirely
  const r = countMeldsAndPartials(rest);
  if (r.melds > bestMelds || (r.melds === bestMelds && r.partials > bestPartials)) {
    bestMelds = r.melds;
    bestPartials = r.partials;
  }

  // Cap partials: can't have more melds+partials than 4
  const cappedPartials = Math.min(bestPartials, 4 - bestMelds);

  return { melds: bestMelds, partials: cappedPartials };
}
