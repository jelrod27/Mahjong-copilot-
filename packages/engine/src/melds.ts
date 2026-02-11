import { TileId, TileType, PlayerId, Meld } from './types.js';

// ============================================================================
// Tile Helpers (inlined to avoid circular deps with tiles.ts)
// ============================================================================

function tileIdToType(id: TileId): TileType {
  return Math.floor(id / 4);
}

function isSuitedType(type: TileType): boolean {
  return type >= 0 && type <= 26;
}

function suitOf(type: TileType): number {
  return Math.floor(type / 9);
}

function valueOf(type: TileType): number {
  return (type % 9) + 1;
}

// ============================================================================
// Chi (Sequence) Detection
// ============================================================================

/**
 * Check if caller is to the left of discarder (next in turn order).
 * Turn order: 0 → 1 → 2 → 3 → 0
 */
export function canCallChi(callerSeat: PlayerId, discarderSeat: PlayerId): boolean {
  return callerSeat === ((discarderSeat + 1) % 4);
}

/**
 * Find all valid chi calls a player can make with a discarded tile.
 */
export function findValidChi(
  discardedTile: TileId,
  hand: TileId[],
  callerSeat: PlayerId,
  discarderSeat: PlayerId,
): Meld[] {
  // Chi only from player to the left
  if (!canCallChi(callerSeat, discarderSeat)) return [];

  const discardType = tileIdToType(discardedTile);

  // Only suited tiles can form chi
  if (!isSuitedType(discardType)) return [];

  const discardSuit = suitOf(discardType);
  const discardValue = valueOf(discardType);
  const results: Meld[] = [];

  // Find all hand tiles of the same suit with their types
  const suitTiles = hand
    .map((id) => ({ id, type: tileIdToType(id) }))
    .filter((t) => isSuitedType(t.type) && suitOf(t.type) === discardSuit);

  // Group by value
  const byValue = new Map<number, TileId[]>();
  for (const t of suitTiles) {
    const v = valueOf(t.type);
    const arr = byValue.get(v) ?? [];
    arr.push(t.id);
    byValue.set(v, arr);
  }

  // Try 3 configurations:
  // Config 1: discard is LOW (need discard+1, discard+2)
  if (discardValue <= 7) {
    const mid = byValue.get(discardValue + 1);
    const high = byValue.get(discardValue + 2);
    if (mid && mid.length > 0 && high && high.length > 0) {
      results.push({
        type: 'chi',
        tiles: [discardedTile, mid[0]!, high[0]!],
        calledFrom: discarderSeat,
        calledTile: discardedTile,
      });
    }
  }

  // Config 2: discard is MIDDLE (need discard-1, discard+1)
  if (discardValue >= 2 && discardValue <= 8) {
    const low = byValue.get(discardValue - 1);
    const high = byValue.get(discardValue + 1);
    if (low && low.length > 0 && high && high.length > 0) {
      results.push({
        type: 'chi',
        tiles: [low[0]!, discardedTile, high[0]!],
        calledFrom: discarderSeat,
        calledTile: discardedTile,
      });
    }
  }

  // Config 3: discard is HIGH (need discard-2, discard-1)
  if (discardValue >= 3) {
    const low = byValue.get(discardValue - 2);
    const mid = byValue.get(discardValue - 1);
    if (low && low.length > 0 && mid && mid.length > 0) {
      results.push({
        type: 'chi',
        tiles: [low[0]!, mid[0]!, discardedTile],
        calledFrom: discarderSeat,
        calledTile: discardedTile,
      });
    }
  }

  return results;
}

// ============================================================================
// Pon (Triplet) Detection
// ============================================================================

/**
 * Find valid pon call for a discarded tile.
 * Player needs 2+ tiles of the same type in hand.
 */
export function findValidPon(
  discardedTile: TileId,
  hand: TileId[],
  callerSeat: PlayerId,
  discarderSeat: PlayerId,
): Meld | null {
  if (callerSeat === discarderSeat) return null;

  const discardType = tileIdToType(discardedTile);
  const matching = hand.filter((id) => tileIdToType(id) === discardType);

  if (matching.length < 2) return null;

  return {
    type: 'pon',
    tiles: [discardedTile, matching[0]!, matching[1]!],
    calledFrom: discarderSeat,
    calledTile: discardedTile,
  };
}

// ============================================================================
// Kan (Quad) Detection
// ============================================================================

/**
 * Find valid open kan call (player holds 3, calls 4th from discard).
 */
export function findValidOpenKan(
  discardedTile: TileId,
  hand: TileId[],
  callerSeat: PlayerId,
  discarderSeat: PlayerId,
): Meld | null {
  if (callerSeat === discarderSeat) return null;

  const discardType = tileIdToType(discardedTile);
  const matching = hand.filter((id) => tileIdToType(id) === discardType);

  if (matching.length < 3) return null;

  return {
    type: 'kan',
    tiles: [discardedTile, matching[0]!, matching[1]!, matching[2]!],
    calledFrom: discarderSeat,
    calledTile: discardedTile,
  };
}

/**
 * Find all possible closed kans in a player's hand.
 * Player holds all 4 copies of a tile type.
 */
export function findClosedKans(hand: TileId[]): Meld[] {
  const counts = new Map<TileType, TileId[]>();
  for (const id of hand) {
    const type = tileIdToType(id);
    const arr = counts.get(type) ?? [];
    arr.push(id);
    counts.set(type, arr);
  }

  const results: Meld[] = [];
  for (const [, tiles] of counts) {
    if (tiles.length === 4) {
      results.push({
        type: 'closedKan',
        tiles: [...tiles],
      });
    }
  }

  return results;
}

/**
 * Find possible added kans (shouminkan).
 * Player drew a tile matching an existing open pon.
 */
export function findAddedKans(drawnTile: TileId, openMelds: Meld[]): Meld[] {
  const drawnType = tileIdToType(drawnTile);
  const results: Meld[] = [];

  for (const meld of openMelds) {
    if (meld.type === 'pon') {
      const meldType = tileIdToType(meld.tiles[0]!);
      if (meldType === drawnType) {
        results.push({
          type: 'addedKan',
          tiles: [...meld.tiles, drawnTile],
          calledFrom: meld.calledFrom,
          calledTile: meld.calledTile,
        });
      }
    }
  }

  return results;
}

// ============================================================================
// Call Priority Resolution
// ============================================================================

export type CallType = 'ron' | 'pon' | 'kan' | 'chi' | 'pass';

export interface PendingCall {
  playerId: PlayerId;
  callType: CallType;
  meld?: Meld;
}

const CALL_PRIORITY: Record<CallType, number> = {
  ron: 4,
  pon: 3,
  kan: 3, // Same priority as pon
  chi: 2,
  pass: 0,
};

/**
 * Resolve call priority when multiple players want to act on a discard.
 * Ron > Pon/Kan > Chi > Pass.
 * Multiple ron winners are all returned.
 * Among same priority (non-ron), closest in turn order to discarder wins.
 */
export function resolveCallPriority(
  calls: PendingCall[],
  discarderSeat: PlayerId,
): PendingCall[] {
  // Filter out passes
  const activeCalls = calls.filter((c) => c.callType !== 'pass');
  if (activeCalls.length === 0) return [];

  // Find highest priority
  const maxPriority = Math.max(...activeCalls.map((c) => CALL_PRIORITY[c.callType]));

  // If highest priority is ron, return ALL ron callers
  if (maxPriority === CALL_PRIORITY.ron) {
    return activeCalls.filter((c) => c.callType === 'ron');
  }

  // For pon/kan/chi, return the one closest in turn order to discarder
  const samePriority = activeCalls.filter(
    (c) => CALL_PRIORITY[c.callType] === maxPriority,
  );

  // Sort by distance from discarder in turn order
  samePriority.sort((a, b) => {
    const distA = ((a.playerId - discarderSeat + 4) % 4);
    const distB = ((b.playerId - discarderSeat + 4) % 4);
    return distA - distB;
  });

  return samePriority.slice(0, 1);
}

// ============================================================================
// Validation Utilities
// ============================================================================

/** Check if a meld is valid. */
export function isValidMeld(meld: Meld): boolean {
  switch (meld.type) {
    case 'chi': {
      if (meld.tiles.length !== 3) return false;
      const types = meld.tiles.map(tileIdToType).sort((a, b) => a - b);
      if (!types.every((t) => isSuitedType(t))) return false;
      if (suitOf(types[0]!) !== suitOf(types[1]!) || suitOf(types[1]!) !== suitOf(types[2]!)) {
        return false;
      }
      return types[1]! === types[0]! + 1 && types[2]! === types[1]! + 1;
    }
    case 'pon': {
      if (meld.tiles.length !== 3) return false;
      const types = meld.tiles.map(tileIdToType);
      return types[0] === types[1] && types[1] === types[2];
    }
    case 'kan':
    case 'closedKan':
    case 'addedKan': {
      if (meld.tiles.length !== 4) return false;
      const types = meld.tiles.map(tileIdToType);
      return types.every((t) => t === types[0]);
    }
    default:
      return false;
  }
}

/** Check if a hand is concealed (no open melds; closed kans are OK). */
export function isHandConcealed(openMelds: Meld[], _closedKans: Meld[]): boolean {
  return openMelds.length === 0;
}

/** Count total melds (open + closed kans). */
export function countMelds(openMelds: Meld[], closedKans: Meld[]): number {
  return openMelds.length + closedKans.length;
}
