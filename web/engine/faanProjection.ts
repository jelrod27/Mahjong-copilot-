/**
 * Live Faan Projection — what faan is the current (possibly incomplete) hand
 * working toward? This is *learning aid* code, not engine correctness code:
 * it makes HK Mahjong's scoring system legible in real time so beginners can
 * see which pattern they're building, what's already locked in, and what
 * still needs to fall into place.
 *
 * Unlike `scoring.ts`, which requires a complete winning hand, these
 * projections run on any hand + melds combination mid-play. Output is
 * deliberately conservative: we only surface patterns we are highly
 * confident the player is pursuing.
 */

import { Tile, TileSuit, TileType, DragonTile } from '@/models/Tile';
import { MeldInfo } from '@/models/GameState';
import { WindTile } from '@/models/Tile';
import { FanItem, ScoringContext, ScoringResult } from './types';
import { calculateShanten, canPlayerWin } from './winDetection';
import { calculateScore } from './scoring';

/** A fan the player is partway toward, with what's still needed. */
export interface ProjectedFan {
  /** Canonical fan name, matches names from scoring.ts */
  name: string;
  /** Faan awarded if the pattern completes */
  fan: number;
  /** 0..1 — how close we are to completing this pattern */
  progress: number;
  /** Plain-English hint on what's still needed */
  hint: string;
}

export interface FaanProjection {
  /** Fans effectively guaranteed no matter which winning tile arrives */
  lockedIn: FanItem[];
  /** Fans the player is actively pursuing (not yet complete) */
  inProgress: ProjectedFan[];
  /** Shanten (distance from tenpai). -1 = winning, 0 = tenpai. */
  shanten: number;
  /** Wait tiles (English names) if tenpai, else empty */
  waits: string[];
  /** Best-case scoring result across all waits, if tenpai */
  bestCase: ScoringResult | null;
  /** Lower bound of projected total faan on a successful win */
  projectedMin: number;
  /** Upper bound of projected total faan on a successful win */
  projectedMax: number;
}

const ALL_SUITS = [TileSuit.BAMBOO, TileSuit.CHARACTER, TileSuit.DOT];

/**
 * Project the faan landscape for a partial hand.
 *
 * @param hand           Player's concealed hand (may include bonus flowers)
 * @param exposedMelds   Exposed melds (from claimed chows/pungs/kongs)
 * @param seatWind       Player's seat wind
 * @param prevailingWind Round wind
 * @param flowers        Flowers/seasons the player has collected (bonus tiles)
 */
export function projectFaan(
  hand: Tile[],
  exposedMelds: MeldInfo[],
  seatWind: WindTile,
  prevailingWind: WindTile,
  flowers: Tile[] = [],
): FaanProjection {
  const concealed = hand.filter(t => t.type !== TileType.BONUS);
  const allTiles = [...concealed, ...exposedMelds.flatMap(m => m.tiles)];

  const lockedIn: FanItem[] = [];
  const inProgress: ProjectedFan[] = [];

  // --- Concealed Hand (no non-concealed melds) ---
  // In HK rules concealed kongs still count as "concealed" for the hand-level bonus.
  const nonConcealedMelds = exposedMelds.filter(m => !m.isConcealed);
  if (nonConcealedMelds.length === 0) {
    lockedIn.push({
      name: 'Concealed Hand',
      fan: 1,
      description: 'No exposed melds — stays concealed until you win',
    });
  }

  // --- Flowers / No Flowers ---
  if (flowers.length === 0) {
    lockedIn.push({
      name: 'No Flowers',
      fan: 1,
      description: 'No bonus tiles drawn — hand stays clean',
    });
  } else {
    lockedIn.push({
      name: 'Flower Tiles',
      fan: flowers.length,
      description: `${flowers.length} flower/season tile${flowers.length > 1 ? 's' : ''} collected`,
    });
    // Seat flower match
    const seatNumberMap: Record<string, number> = { east: 1, south: 2, west: 3, north: 4 };
    const seatNumber = seatNumberMap[seatWind] ?? 0;
    const flowerNames = ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'];
    const seasonNames = ['Spring', 'Summer', 'Autumn', 'Winter'];
    for (const f of flowers) {
      const flowerIdx = flowerNames.indexOf(f.flower ?? '');
      const seasonIdx = seasonNames.indexOf(f.season ?? '');
      if (flowerIdx + 1 === seatNumber || seasonIdx + 1 === seatNumber) {
        lockedIn.push({
          name: 'Seat Flower',
          fan: 1,
          description: 'Flower/season matches your seat wind',
        });
      }
    }
  }

  // --- Exposed dragon/wind pungs + kongs are already locked in ---
  for (const m of exposedMelds) {
    if (m.type !== 'pung' && m.type !== 'kong') continue;
    const sample = m.tiles[0];
    if (sample.suit === TileSuit.DRAGON) {
      const name =
        sample.dragon === DragonTile.RED ? 'Red' :
          sample.dragon === DragonTile.GREEN ? 'Green' : 'White';
      lockedIn.push({
        name: `${name} Dragon`,
        fan: 1,
        description: `Exposed ${m.type} of ${name} Dragon`,
      });
    } else if (sample.suit === TileSuit.WIND) {
      if (sample.wind === seatWind) {
        lockedIn.push({
          name: 'Seat Wind',
          fan: 1,
          description: `Exposed ${m.type} of your seat wind`,
        });
      }
      if (sample.wind === prevailingWind) {
        lockedIn.push({
          name: 'Prevailing Wind',
          fan: 1,
          description: `Exposed ${m.type} of the round wind`,
        });
      }
    }
  }

  // --- Pure / Mixed One Suit (Half Flush / Full Flush) ---
  const suitTiles = allTiles.filter(t => t.type === TileType.SUIT);
  const honorTiles = allTiles.filter(t => t.type === TileType.HONOR);
  const offSuitTiles = countOffSuitMinorities(allTiles);

  if (allTiles.length >= 7 && offSuitTiles.worst <= 4 && suitTiles.length > 0) {
    // Player is visibly on a flush run — surface progress on the dominant suit.
    const dominant = offSuitTiles.dominant;
    const offSuitCount = offSuitTiles.worst;
    const hasOffSuit = offSuitCount > 0;
    const hasHonors = honorTiles.length > 0;

    if (!hasOffSuit && !hasHonors) {
      // Pure one suit already — locked, but needs to survive to the win
      inProgress.push({
        name: 'Pure One Suit',
        fan: 7,
        progress: 1,
        hint: `All ${dominant} so far — keep it pure to win +7 faan`,
      });
    } else if (!hasOffSuit && hasHonors) {
      inProgress.push({
        name: 'Mixed One Suit',
        fan: 3,
        progress: 1,
        hint: `One suit (${dominant}) + honors — complete for +3 faan`,
      });
    } else if (offSuitCount <= 2) {
      // Close to a flush — need to shed off-suit tiles
      const denom = Math.max(allTiles.length, 1);
      const progress = Math.max(0, 1 - offSuitCount / denom);
      inProgress.push({
        name: hasHonors ? 'Mixed One Suit' : 'Pure One Suit',
        fan: hasHonors ? 3 : 7,
        progress,
        hint: `Discard ${offSuitCount} non-${dominant} tile${offSuitCount > 1 ? 's' : ''} to lock this in`,
      });
    }
  }

  // --- All Pungs / All Chows progression ---
  // Count pung/kong-like structures in both exposed melds and concealed triplets.
  const realMelds = exposedMelds.filter(m => m.type !== 'pair');
  const exposedPungs = realMelds.filter(m => m.type === 'pung' || m.type === 'kong').length;
  const exposedChows = realMelds.filter(m => m.type === 'chow').length;
  const concealedTriplets = countConcealedTriplets(concealed);

  const totalPungs = exposedPungs + concealedTriplets;
  // 4 melds required for a standard hand; no point suggesting once contradicted.
  if (exposedChows === 0 && totalPungs >= 2) {
    inProgress.push({
      name: 'All Pungs',
      fan: 3,
      progress: Math.min(totalPungs / 4, 1),
      hint: `${totalPungs} of 4 triplets — avoid chows for +3 faan`,
    });
  }
  if (exposedPungs === 0 && concealedTriplets === 0 && exposedChows >= 2) {
    inProgress.push({
      name: 'All Chows',
      fan: 1,
      progress: Math.min(exposedChows / 4, 1),
      hint: `${exposedChows} of 4 chows — stay with sequences for +1 faan`,
    });
  }

  // --- Concealed dragon/wind pairs in hand (potential pungs) ---
  const pairsInHand = findHonorPairs(concealed);
  for (const pair of pairsInHand) {
    const sample = pair[0];
    if (sample.suit === TileSuit.DRAGON) {
      const name =
        sample.dragon === DragonTile.RED ? 'Red' :
          sample.dragon === DragonTile.GREEN ? 'Green' : 'White';
      inProgress.push({
        name: `${name} Dragon`,
        fan: 1,
        progress: 2 / 3,
        hint: `Pair of ${name} Dragons — one more makes a pung (+1 faan)`,
      });
    } else if (sample.suit === TileSuit.WIND) {
      if (sample.wind === seatWind) {
        inProgress.push({
          name: 'Seat Wind',
          fan: 1,
          progress: 2 / 3,
          hint: `Pair of seat winds — one more for a pung (+1 faan)`,
        });
      } else if (sample.wind === prevailingWind) {
        inProgress.push({
          name: 'Prevailing Wind',
          fan: 1,
          progress: 2 / 3,
          hint: `Pair of round winds — one more for a pung (+1 faan)`,
        });
      }
    }
  }

  // --- Shanten + best-case projection ---
  // Compute waits FIRST using canPlayerWin (which correctly accounts for
  // exposed melds). Deriving shanten from that avoids a subtle bug: running
  // calculateShanten on just the concealed portion mis-reports tenpai for
  // hands with exposed melds, which then silently skips wait-finding.
  const waitTiles = findTenpaiWaits(concealed, exposedMelds);
  const isTenpai = waitTiles.length > 0;
  const shanten = isTenpai ? 0 : calculateShanten(concealed);
  const waits: Tile[] = waitTiles;
  let bestCase: ScoringResult | null = null;

  for (const wait of waitTiles) {
    const candidateHand = [...concealed, wait];
    const context: ScoringContext = {
      winningTile: wait,
      isSelfDrawn: false, // conservative — don't assume self-draw bonus
      seatWind,
      prevailingWind,
      isConcealed: nonConcealedMelds.length === 0,
      flowers,
    };
    try {
      const result = calculateScore(candidateHand, exposedMelds, context);
      if (!bestCase || result.totalFan > bestCase.totalFan) {
        bestCase = result;
      }
    } catch {
      // calculateScore may throw on malformed hands — skip.
    }
  }

  // --- Faan range ---
  const lockedSum = lockedIn.reduce((s, f) => s + f.fan, 0);
  const inProgressMax = inProgress.reduce((s, f) => s + f.fan, 0);
  const projectedMin = lockedSum;
  const projectedMax = bestCase
    ? Math.max(bestCase.totalFan, lockedSum + inProgressMax)
    : lockedSum + inProgressMax;

  return {
    lockedIn,
    inProgress,
    shanten,
    waits: waits.map(w => w.nameEnglish),
    bestCase,
    projectedMin,
    projectedMax,
  };
}

/** Returns the dominant suit and the count of off-suit tiles in the minority. */
function countOffSuitMinorities(tiles: Tile[]): { dominant: string; worst: number } {
  const counts: Record<string, number> = {
    [TileSuit.BAMBOO]: 0,
    [TileSuit.CHARACTER]: 0,
    [TileSuit.DOT]: 0,
  };
  for (const t of tiles) {
    if (t.type === TileType.SUIT) counts[t.suit] = (counts[t.suit] ?? 0) + 1;
  }
  let dominant = TileSuit.BAMBOO as string;
  let dominantCount = -1;
  for (const s of ALL_SUITS) {
    if (counts[s] > dominantCount) {
      dominant = s;
      dominantCount = counts[s];
    }
  }
  const offSuit = ALL_SUITS
    .filter(s => s !== dominant)
    .reduce((sum, s) => sum + counts[s], 0);
  return { dominant, worst: offSuit };
}

/** Count concealed triplets (three identical tiles) in the hand. */
function countConcealedTriplets(hand: Tile[]): number {
  const counts = new Map<string, number>();
  for (const t of hand) {
    const key = tileKeyFor(t);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let triplets = 0;
  for (const c of Array.from(counts.values())) {
    if (c >= 3) triplets += 1;
  }
  return triplets;
}

/** Find honor tile pairs (exactly 2 copies) that could become pungs. */
function findHonorPairs(hand: Tile[]): Tile[][] {
  const groups = new Map<string, Tile[]>();
  for (const t of hand) {
    if (t.type !== TileType.HONOR) continue;
    const key = tileKeyFor(t);
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }
  const pairs: Tile[][] = [];
  for (const tiles of Array.from(groups.values())) {
    if (tiles.length === 2) pairs.push(tiles);
  }
  return pairs;
}

function tileKeyFor(t: Tile): string {
  if (t.number !== undefined) return `${t.suit}_${t.number}`;
  if (t.wind) return `wind_${t.wind}`;
  if (t.dragon) return `dragon_${t.dragon}`;
  return t.id;
}

/**
 * Find tiles that would complete the hand if drawn/claimed. Iterates
 * all 34 tile types and tests winning-hand validity.
 *
 * Skips tiles for which the player already holds all four copies (no draw
 * is possible). We can only count visible copies in the player's own hand
 * and melds — opponent discards/melds aren't passed in here — but that's
 * enough to avoid the most misleading case: teaching a learner to wait on
 * a tile whose last copy is already in their own pung.
 */
function findTenpaiWaits(hand: Tile[], melds: MeldInfo[]): Tile[] {
  const prototypes = allTilePrototypes();
  const waits: Tile[] = [];
  const seen = new Set<string>();
  const visibleCounts = new Map<string, number>();

  for (const tile of [...hand, ...melds.flatMap(m => m.tiles)]) {
    const key = tileKeyFor(tile);
    visibleCounts.set(key, (visibleCounts.get(key) ?? 0) + 1);
  }

  for (const proto of prototypes) {
    const key = tileKeyFor(proto);
    if (seen.has(key)) continue;
    seen.add(key);
    if ((visibleCounts.get(key) ?? 0) >= 4) continue;
    if (canPlayerWin([...hand, proto], melds)) {
      waits.push(proto);
    }
  }
  return waits;
}

/** One prototype Tile object per distinct tile type. */
function allTilePrototypes(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;
  for (const suit of ALL_SUITS) {
    for (let n = 1; n <= 9; n++) {
      tiles.push({
        id: `proto_${id++}`,
        suit,
        type: TileType.SUIT,
        number: n,
        nameEnglish: `${n} ${suit}`,
        nameChinese: '',
        nameJapanese: '',
        assetPath: '',
      });
    }
  }
  for (const wind of [WindTile.EAST, WindTile.SOUTH, WindTile.WEST, WindTile.NORTH]) {
    tiles.push({
      id: `proto_${id++}`,
      suit: TileSuit.WIND,
      type: TileType.HONOR,
      wind,
      nameEnglish: `${wind} Wind`,
      nameChinese: '',
      nameJapanese: '',
      assetPath: '',
    });
  }
  for (const dragon of [DragonTile.RED, DragonTile.GREEN, DragonTile.WHITE]) {
    tiles.push({
      id: `proto_${id++}`,
      suit: TileSuit.DRAGON,
      type: TileType.HONOR,
      dragon,
      nameEnglish: `${dragon} Dragon`,
      nameChinese: '',
      nameJapanese: '',
      assetPath: '',
    });
  }
  return tiles;
}
