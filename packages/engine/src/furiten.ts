import type { TileId, TileType, DiscardInfo } from './types.js';
import { findWaits } from './win-detection.js';
import { tilesToHandArray, tileIdToType } from './tiles.js';

// ============================================================================
// Furiten Detection
// ============================================================================

/**
 * Check static (permanent) furiten.
 * A player is in static furiten if any of their winning tiles
 * appear in their own discard pile.
 *
 * @param closedHand - The player's closed hand tiles (TileId[])
 * @param discards - The player's discard pile
 * @returns true if the player is in static furiten
 */
export function checkStaticFuriten(
  closedHand: TileId[],
  discards: DiscardInfo[],
): boolean {
  const handArray = tilesToHandArray(closedHand);
  const waits = findWaits(handArray);

  if (waits.length === 0) return false;

  const waitSet = new Set<TileType>(waits);

  for (const discard of discards) {
    const discardType = tileIdToType(discard.tile);
    if (waitSet.has(discardType)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a specific tile type is in the player's discards.
 */
export function isTileInDiscards(
  tileType: TileType,
  discards: DiscardInfo[],
): boolean {
  return discards.some((d) => tileIdToType(d.tile) === tileType);
}

/**
 * Check temporary furiten.
 * A player is in temporary furiten if they passed on a winning tile
 * (chose not to ron) during the current go-around.
 * Resets on the player's next draw.
 *
 * This is tracked as state, not computed. This function validates
 * if a player should be marked as temporarily furiten given that
 * a tile was discarded they could have won on.
 *
 * @param closedHand - The player's closed hand (TileId[])
 * @param discardedTileType - The tile type that was just discarded by another player
 * @returns true if the discarded tile would complete the hand (and passing creates temp furiten)
 */
export function wouldCompleteFuriten(
  closedHand: TileId[],
  discardedTileType: TileType,
): boolean {
  const handArray = tilesToHandArray(closedHand);
  const waits = findWaits(handArray);
  return waits.includes(discardedTileType);
}

/**
 * Check riichi furiten.
 * A player who declared riichi and passes on any winning tile
 * (even automatically) is furiten for the rest of the round.
 *
 * Same logic as temporary furiten, but the flag is never cleared.
 * This function simply checks if a riichi player could have won
 * on a discarded tile.
 */
export function checkRiichiFuriten(
  closedHand: TileId[],
  discardedTileType: TileType,
): boolean {
  return wouldCompleteFuriten(closedHand, discardedTileType);
}

/**
 * Comprehensive furiten check for a player attempting to win by ron.
 *
 * A player cannot win by ron if:
 * 1. They are in static furiten (winning tile in own discards)
 * 2. They are in temporary furiten (passed on a ron this go-around)
 * 3. They are in riichi furiten (passed on a win after declaring riichi)
 *
 * Tsumo (self-draw) is always allowed regardless of furiten state.
 *
 * @param closedHand - Player's closed hand tiles
 * @param discards - Player's own discard pile
 * @param isTemporaryFuriten - Whether temporary furiten flag is set
 * @param isRiichiFuriten - Whether riichi furiten flag is set (from PlayerState)
 * @returns true if the player is blocked from winning by ron
 */
export function isFuritenForRon(
  closedHand: TileId[],
  discards: DiscardInfo[],
  isTemporaryFuriten: boolean,
  isRiichiFuriten: boolean,
): boolean {
  // Temporary or riichi furiten
  if (isTemporaryFuriten || isRiichiFuriten) return true;

  // Static furiten
  return checkStaticFuriten(closedHand, discards);
}

/**
 * Get all winning tile types for a hand.
 * Utility used by furiten checks and the co-pilot.
 */
export function getWinningTileTypes(closedHand: TileId[]): TileType[] {
  const handArray = tilesToHandArray(closedHand);
  return findWaits(handArray);
}
