import type { TileType, HandArray, HandGroup, HandParsing, WaitType } from './types.js';

// ============================================================================
// Tile Helpers (inlined to avoid circular deps)
// ============================================================================

function isSuitedType(type: TileType): boolean {
  return type >= 0 && type <= 26;
}

function suitOf(type: TileType): number {
  return Math.floor(type / 9);
}

function valueOf(type: TileType): number {
  return (type % 9) + 1;
}

const TERMINAL_HONOR_TYPES: readonly TileType[] = [
  0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
];

// ============================================================================
// Standard Hand Parsing (4 sets + 1 pair)
// ============================================================================

/**
 * Try to decompose a hand (as HandArray) into 4 sets + 1 pair.
 * Returns all valid parsings (there may be multiple).
 */
export function parseStandardHand(hand: HandArray): HandParsing[] {
  const results: HandParsing[] = [];

  // Try each possible pair
  for (let pairType = 0; pairType < 34; pairType++) {
    if (hand[pairType]! < 2) continue;

    const remaining = [...hand];
    remaining[pairType]! -= 2;

    const groups: HandGroup[] = [];
    if (extractSets(remaining, 0, groups)) {
      results.push({
        groups: groups.map((g) => ({ ...g })),
        pair: pairType,
        isValid: true,
      });
    }
  }

  return results;
}

/**
 * Recursively extract sets (triplets and sequences) from the hand.
 * Tries triplets first at each position, then sequences.
 * Returns true if all tiles were consumed.
 */
function extractSets(
  hand: HandArray,
  startType: TileType,
  groups: HandGroup[],
): boolean {
  // Find next tile type that has remaining tiles
  let pos = startType;
  while (pos < 34 && hand[pos]! === 0) pos++;

  // All tiles consumed - success
  if (pos >= 34) return true;

  let found = false;

  // Try triplet first
  if (hand[pos]! >= 3) {
    hand[pos]! -= 3;
    groups.push({ type: 'triplet', tiles: [pos, pos, pos], isOpen: false });
    if (extractSets(hand, pos, groups)) {
      found = true;
    }
    if (!found) {
      groups.pop();
      hand[pos]! += 3;
    }
  }

  if (found) return true;

  // Try sequence (only for suited tiles, not at 8th or 9th of a suit)
  if (isSuitedType(pos) && valueOf(pos) <= 7) {
    const mid = pos + 1;
    const high = pos + 2;
    // Must be same suit
    if (suitOf(pos) === suitOf(mid) && suitOf(pos) === suitOf(high)) {
      if (hand[mid]! >= 1 && hand[high]! >= 1) {
        hand[pos]! -= 1;
        hand[mid]! -= 1;
        hand[high]! -= 1;
        groups.push({
          type: 'sequence',
          tiles: [pos, mid, high],
          isOpen: false,
        });
        if (extractSets(hand, pos, groups)) {
          found = true;
        }
        if (!found) {
          groups.pop();
          hand[pos]! += 1;
          hand[mid]! += 1;
          hand[high]! += 1;
        }
      }
    }
  }

  return found;
}

// ============================================================================
// Seven Pairs Detection
// ============================================================================

/**
 * Check if the hand is a valid seven pairs (chiitoitsu).
 * Must have exactly 7 distinct pairs, 14 tiles total, closed hand only.
 */
export function isSevenPairs(hand: HandArray): boolean {
  let pairCount = 0;
  let totalTiles = 0;

  for (let t = 0; t < 34; t++) {
    const count = hand[t]!;
    totalTiles += count;
    if (count === 2) {
      pairCount++;
    } else if (count !== 0) {
      return false;
    }
  }

  return pairCount === 7 && totalTiles === 14;
}

/**
 * Return a HandParsing for seven pairs (using pair entries for each pair).
 */
export function parseSevenPairs(hand: HandArray): HandParsing | null {
  if (!isSevenPairs(hand)) return null;

  let firstPair = -1;
  const groups: HandGroup[] = [];

  for (let t = 0; t < 34; t++) {
    if (hand[t]! === 2) {
      if (firstPair === -1) {
        firstPair = t;
      } else {
        // We treat additional pairs as "pair" groups
        // The first one is the canonical "pair"
        groups.push({ type: 'pair', tiles: [t, t], isOpen: false });
      }
    }
  }

  return {
    groups,
    pair: firstPair,
    isValid: true,
  };
}

// ============================================================================
// Thirteen Orphans Detection
// ============================================================================

/**
 * Check if the hand is a valid thirteen orphans (kokushi musou).
 * Must have one of each terminal/honor + one duplicate.
 */
export function isThirteenOrphans(hand: HandArray): boolean {
  let totalTiles = 0;
  let hasDuplicate = false;

  for (let t = 0; t < 34; t++) {
    totalTiles += hand[t]!;
  }

  if (totalTiles !== 14) return false;

  for (const t of TERMINAL_HONOR_TYPES) {
    if (hand[t]! === 0) return false;
    if (hand[t]! === 2) hasDuplicate = true;
  }

  // Ensure no non-terminal/non-honor tiles
  for (let t = 0; t < 34; t++) {
    if (hand[t]! > 0 && !TERMINAL_HONOR_TYPES.includes(t)) return false;
  }

  return hasDuplicate;
}

// ============================================================================
// Complete Win Detection
// ============================================================================

/**
 * Check if a hand (as HandArray) is a winning hand.
 * Considers standard form, seven pairs, and thirteen orphans.
 */
export function isWinningHand(hand: HandArray): boolean {
  // Check standard form
  if (parseStandardHand(hand).length > 0) return true;

  // Check seven pairs
  if (isSevenPairs(hand)) return true;

  // Check thirteen orphans
  if (isThirteenOrphans(hand)) return true;

  return false;
}

/**
 * Get all valid parsings of a winning hand.
 * Includes standard parsings, seven pairs, and thirteen orphans.
 */
export function getAllParsings(hand: HandArray): HandParsing[] {
  const results: HandParsing[] = [];

  // Standard parsings
  results.push(...parseStandardHand(hand));

  // Seven pairs
  const sp = parseSevenPairs(hand);
  if (sp) results.push(sp);

  // Thirteen orphans gets a special "empty" parsing
  // (it's detected separately and doesn't follow the group+pair pattern)

  return results;
}

// ============================================================================
// Tenpai Detection (1-away from winning)
// ============================================================================

/**
 * Find all tile types that would complete the hand (waits/machi).
 * Returns array of TileType values.
 */
export function findWaits(hand: HandArray): TileType[] {
  const waits: TileType[] = [];

  // Verify hand has exactly 13 tiles
  let totalTiles = 0;
  for (let t = 0; t < 34; t++) {
    totalTiles += hand[t]!;
  }
  if (totalTiles !== 13) return waits;

  // Try adding each tile type and checking if it completes the hand
  for (let t = 0; t < 34; t++) {
    if (hand[t]! >= 4) continue; // Can't have 5 copies

    const testHand = [...hand];
    testHand[t]! += 1;

    if (isWinningHand(testHand)) {
      waits.push(t);
    }
  }

  return waits;
}

/**
 * Check if a hand is tenpai (one tile away from winning).
 */
export function isTenpai(hand: HandArray): boolean {
  return findWaits(hand).length > 0;
}

// ============================================================================
// Wait Type Determination
// ============================================================================

/**
 * Determine the wait type for a winning hand given the winning tile.
 * Returns the "best" wait type among all valid parsings.
 * Priority: ryanmen > shanpon > kanchan > penchan > tanki
 */
export function determineWaitType(
  hand: HandArray,
  winningTileType: TileType,
): WaitType {
  const parsings = getAllParsings(hand);
  if (parsings.length === 0) {
    // Might be thirteen orphans
    if (isThirteenOrphans(hand)) {
      return 'tanki' as WaitType;
    }
    return 'tanki' as WaitType;
  }

  const WAIT_PRIORITY: Record<string, number> = {
    ryanmen: 5,
    shanpon: 4,
    kanchan: 3,
    penchan: 2,
    tanki: 1,
  };

  let bestWait: WaitType = 'tanki' as WaitType;
  let bestPriority = 0;

  for (const parsing of parsings) {
    const waitType = classifyWaitForParsing(parsing, winningTileType);
    const priority = WAIT_PRIORITY[waitType] ?? 0;
    if (priority > bestPriority) {
      bestPriority = priority;
      bestWait = waitType as WaitType;
    }
  }

  return bestWait;
}

/**
 * Classify the wait type for a specific parsing.
 */
function classifyWaitForParsing(
  parsing: HandParsing,
  winningTileType: TileType,
): string {
  // Check if the winning tile completes the pair (tanki)
  if (parsing.pair === winningTileType) {
    // Could also be shanpon if a triplet also matches
    const matchesTriplet = parsing.groups.some(
      (g) => g.type === 'triplet' && g.tiles[0] === winningTileType,
    );
    if (matchesTriplet) {
      return 'shanpon';
    }
    return 'tanki';
  }

  // Check sequences for the winning tile
  for (const group of parsing.groups) {
    if (group.type === 'sequence') {
      const sorted = [...group.tiles].sort((a, b) => a - b);
      if (!sorted.includes(winningTileType)) continue;

      const idx = sorted.indexOf(winningTileType);
      const low = sorted[0]!;
      const high = sorted[2]!;

      // Kanchan: winning tile is the middle tile
      if (idx === 1) {
        return 'kanchan';
      }

      // Penchan: edge wait
      // Winning on 3 when holding 1-2 (low of sequence is 1 of suit)
      if (idx === 2 && valueOf(low) === 1) {
        return 'penchan';
      }
      // Winning on 7 when holding 8-9 (high of sequence is 9 of suit)
      if (idx === 0 && valueOf(high) === 9) {
        return 'penchan';
      }

      // Ryanmen: open-ended wait (winning tile on either end)
      if (idx === 0 || idx === 2) {
        return 'ryanmen';
      }
    }

    // Check triplets for shanpon
    if (group.type === 'triplet' && group.tiles[0] === winningTileType) {
      return 'shanpon';
    }
  }

  // Seven pairs -> tanki
  if (parsing.groups.some((g) => g.type === 'pair')) {
    return 'tanki';
  }

  return 'tanki';
}

// ============================================================================
// Shanten Calculation (basic)
// ============================================================================

/**
 * Calculate basic shanten number.
 * Shanten = minimum number of tiles needed to reach tenpai.
 * -1 = already a winning hand
 * 0 = tenpai (one tile away)
 * 1+ = that many tiles away from tenpai
 *
 * Uses a simplified approach: tries standard, seven pairs, and thirteen orphans.
 */
export function calculateShanten(hand: HandArray): number {
  const standard = standardShanten(hand);
  const pairs = sevenPairsShanten(hand);
  const orphans = thirteenOrphansShanten(hand);
  return Math.min(standard, pairs, orphans);
}

/**
 * Standard shanten: 8 - 2*(mentsu) - max(1, partial)
 * Uses recursive decomposition approach.
 */
function standardShanten(hand: HandArray): number {
  let best = 8; // Worst case: 8 shanten

  // Try each possible pair
  for (let pairType = 0; pairType < 34; pairType++) {
    if (hand[pairType]! < 2) continue;

    const remaining = [...hand];
    remaining[pairType]! -= 2;

    const result = countMentsuAndPartial(remaining, 0);
    const shanten = 8 - 2 * result.mentsu - result.partial - 1; // -1 for the pair
    if (shanten < best) best = shanten;
  }

  // Also try without removing a pair
  const result = countMentsuAndPartial([...hand], 0);
  const shanten = 8 - 2 * result.mentsu - result.partial;
  if (shanten < best) best = shanten;

  return best;
}

/**
 * Count complete mentsu (sets) and partial sets in remaining tiles.
 */
function countMentsuAndPartial(
  hand: HandArray,
  startType: TileType,
): { mentsu: number; partial: number } {
  // Find next tile
  let pos = startType;
  while (pos < 34 && hand[pos]! === 0) pos++;
  if (pos >= 34) return { mentsu: 0, partial: 0 };

  let bestMentsu = 0;
  let bestPartial = 0;

  // Try triplet
  if (hand[pos]! >= 3) {
    hand[pos]! -= 3;
    const sub = countMentsuAndPartial(hand, pos);
    const m = 1 + sub.mentsu;
    const p = sub.partial;
    if (2 * m + p > 2 * bestMentsu + bestPartial) {
      bestMentsu = m;
      bestPartial = p;
    }
    hand[pos]! += 3;
  }

  // Try sequence
  if (isSuitedType(pos) && valueOf(pos) <= 7) {
    const mid = pos + 1;
    const high = pos + 2;
    if (
      suitOf(pos) === suitOf(mid) &&
      suitOf(pos) === suitOf(high) &&
      hand[mid]! >= 1 &&
      hand[high]! >= 1
    ) {
      hand[pos]! -= 1;
      hand[mid]! -= 1;
      hand[high]! -= 1;
      const sub = countMentsuAndPartial(hand, pos);
      const m = 1 + sub.mentsu;
      const p = sub.partial;
      if (2 * m + p > 2 * bestMentsu + bestPartial) {
        bestMentsu = m;
        bestPartial = p;
      }
      hand[pos]! += 1;
      hand[mid]! += 1;
      hand[high]! += 1;
    }
  }

  // Try pair (partial)
  if (hand[pos]! >= 2) {
    hand[pos]! -= 2;
    const sub = countMentsuAndPartial(hand, pos);
    const m = sub.mentsu;
    const p = 1 + sub.partial;
    if (2 * m + p > 2 * bestMentsu + bestPartial && m + p <= 4) {
      bestMentsu = m;
      bestPartial = p;
    }
    hand[pos]! += 2;
  }

  // Try partial sequence (adjacent)
  if (isSuitedType(pos) && valueOf(pos) <= 8) {
    const next = pos + 1;
    if (suitOf(pos) === suitOf(next) && hand[next]! >= 1) {
      hand[pos]! -= 1;
      hand[next]! -= 1;
      const sub = countMentsuAndPartial(hand, pos);
      const m = sub.mentsu;
      const p = 1 + sub.partial;
      if (2 * m + p > 2 * bestMentsu + bestPartial && m + p <= 4) {
        bestMentsu = m;
        bestPartial = p;
      }
      hand[pos]! += 1;
      hand[next]! += 1;
    }
  }

  // Try partial sequence (gap)
  if (isSuitedType(pos) && valueOf(pos) <= 7) {
    const skip = pos + 2;
    if (suitOf(pos) === suitOf(skip) && hand[skip]! >= 1) {
      hand[pos]! -= 1;
      hand[skip]! -= 1;
      const sub = countMentsuAndPartial(hand, pos);
      const m = sub.mentsu;
      const p = 1 + sub.partial;
      if (2 * m + p > 2 * bestMentsu + bestPartial && m + p <= 4) {
        bestMentsu = m;
        bestPartial = p;
      }
      hand[pos]! += 1;
      hand[skip]! += 1;
    }
  }

  // Skip this tile entirely
  {
    const originalCount = hand[pos]!;
    hand[pos] = 0;
    const sub = countMentsuAndPartial(hand, pos + 1);
    if (2 * sub.mentsu + sub.partial > 2 * bestMentsu + bestPartial) {
      bestMentsu = sub.mentsu;
      bestPartial = sub.partial;
    }
    hand[pos] = originalCount;
  }

  return { mentsu: bestMentsu, partial: bestPartial };
}

/**
 * Seven pairs shanten: 6 - pairs
 */
function sevenPairsShanten(hand: HandArray): number {
  let pairs = 0;
  let kinds = 0;

  for (let t = 0; t < 34; t++) {
    if (hand[t]! >= 2) pairs++;
    if (hand[t]! >= 1) kinds++;
  }

  // Need 7 distinct pairs. If kinds < 7, need to fill in.
  const missing = Math.max(0, 7 - kinds);
  return 6 - pairs + missing;
}

/**
 * Thirteen orphans shanten: 12 - unique orphan types held
 * Plus adjust if we have a duplicate orphan.
 */
function thirteenOrphansShanten(hand: HandArray): number {
  let unique = 0;
  let hasDuplicate = false;

  for (const t of TERMINAL_HONOR_TYPES) {
    if (hand[t]! >= 1) {
      unique++;
      if (hand[t]! >= 2) hasDuplicate = true;
    }
  }

  return 13 - unique - (hasDuplicate ? 1 : 0);
}
