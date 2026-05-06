/**
 * Shared AI utilities for analyzing game state.
 * Pure functions — no framework deps.
 */

import { Tile, TileType, TileSuit, tileKey } from '@/models/Tile';
import { GameState, MeldInfo } from '@/models/GameState';

/**
 * Count how many copies of each tile are visible (discards, exposed melds, own hand).
 */
export function countVisibleTiles(gameState: GameState, playerIndex: number): Map<string, number> {
  const counts = new Map<string, number>();

  const inc = (tile: Tile) => {
    const key = tileKey(tile);
    counts.set(key, (counts.get(key) || 0) + 1);
  };

  // Own hand
  for (const t of gameState.players[playerIndex].hand) inc(t);

  // All discards
  for (const t of gameState.discardPile) inc(t);

  // All exposed melds (all players)
  for (const player of gameState.players) {
    for (const meld of player.melds) {
      if (!meld.isConcealed) {
        for (const t of meld.tiles) inc(t);
      }
    }
  }

  // Own concealed melds — skip tiles already counted in hand to avoid double-count (MC-004)
  const handIds = new Set(gameState.players[playerIndex].hand.map(t => t.id));
  for (const meld of gameState.players[playerIndex].melds) {
    if (meld.isConcealed) {
      for (const t of meld.tiles) {
        if (!handIds.has(t.id)) inc(t);
      }
    }
  }

  // Flowers (all players)
  for (const player of gameState.players) {
    for (const t of player.flowers) inc(t);
  }

  return counts;
}

/**
 * Check if a tile is "safe" — all 4 copies are visible, or it was recently
 * discarded by the target player (they won't win off their own discard).
 */
export function isSafeTile(tile: Tile, gameState: GameState, playerIndex: number): boolean {
  const visible = countVisibleTiles(gameState, playerIndex);
  const key = tileKey(tile);
  const count = visible.get(key) || 0;

  // All 4 copies visible — nobody can use it
  if (count >= 4) return true;

  // Tile was already discarded and not claimed — somewhat safe
  // Only safe if 3+ copies are in the discard pile (1 or fewer remain) — MC-005
  const discardKeys = gameState.discardPile.map(t => tileKey(t));
  if (discardKeys.filter(k => k === key).length >= 3) return true;

  return false;
}

/**
 * Calculate "danger" score for discarding a tile.
 * Higher = more dangerous (opponents might need it).
 */
export function tileDangerScore(
  tile: Tile,
  gameState: GameState,
  playerIndex: number,
): number {
  const visible = countVisibleTiles(gameState, playerIndex);
  const key = tileKey(tile);
  const visibleCount = visible.get(key) || 0;

  // Safe tiles have 0 danger
  if (visibleCount >= 4) return 0;

  let danger = 0;

  // Fewer copies visible = more dangerous (opponents might be collecting)
  danger += (4 - visibleCount) * 2;

  // Check each opponent's discard pattern
  for (let i = 0; i < gameState.players.length; i++) {
    if (i === playerIndex) continue;
    const opponent = gameState.players[i];

    // If opponent has few discards of this suit, they might be collecting it
    if (tile.type === TileType.SUIT) {
      const opponentDiscards = gameState.playerDiscards[opponent.id] || [];
      const suitDiscards = opponentDiscards.filter(t => t.suit === tile.suit).length;
      const totalDiscards = opponentDiscards.length;

      if (totalDiscards > 3 && suitDiscards === 0) {
        // Opponent hasn't discarded any of this suit — suspicious
        danger += 3;
      }
    }

    // If opponent has exposed melds of the same suit, they're collecting
    for (const meld of opponent.melds) {
      if (meld.tiles[0].suit === tile.suit && tile.type === TileType.SUIT) {
        danger += 2;
      }
    }
  }

  return danger;
}

/**
 * Categorize a tile for discard priority.
 * Lower = safer to discard (in general).
 */
/**
 * Detect if an opponent appears dangerous (likely close to winning).
 * Checks exposed meld count, discard pattern, and late-game state.
 */
export function isOpponentDangerous(gameState: GameState, opponentIndex: number): boolean {
  const opponent = gameState.players[opponentIndex];

  // Many exposed melds = close to winning
  const exposedMelds = opponent.melds.filter(m => !m.isConcealed).length;
  if (exposedMelds >= 3) return true;

  // Late game (wall running low) + any exposed melds
  if (gameState.wall.length < 20 && exposedMelds >= 2) return true;

  // Very few tiles in hand (after many melds) = close to winning
  const handSize = opponent.hand.length; // we can see hand.length even if not tiles
  if (handSize <= 4 && exposedMelds >= 2) return true;

  return false;
}

/**
 * Detect suit concentration in an opponent's discards.
 * Returns suits the opponent appears to be collecting (not discarding).
 */
export function detectOpponentSuitFocus(
  gameState: GameState,
  opponentIndex: number,
): Set<string> {
  const opponent = gameState.players[opponentIndex];
  const discards = gameState.playerDiscards[opponent.id] || [];
  if (discards.length < 4) return new Set();

  const suitDiscards = new Map<string, number>();
  const totalSuitDiscards = discards.filter(t => t.type === TileType.SUIT).length;

  for (const t of discards) {
    if (t.type === TileType.SUIT) {
      suitDiscards.set(t.suit, (suitDiscards.get(t.suit) || 0) + 1);
    }
  }

  const focused = new Set<string>();
  const suits = [TileSuit.BAMBOO, TileSuit.CHARACTER, TileSuit.DOT];
  for (const suit of suits) {
    const count = suitDiscards.get(suit) || 0;
    // If they've discarded many tiles but almost none of this suit, they're collecting it
    if (totalSuitDiscards >= 5 && count <= 1) {
      focused.add(suit);
    }
  }

  // Also check exposed melds for suit concentration
  for (const meld of opponent.melds) {
    if (meld.tiles[0].type === TileType.SUIT) {
      focused.add(meld.tiles[0].suit);
    }
  }

  return focused;
}

/**
 * Resolve a player's discards from `playerDiscards` record.
 * Handles both player-ID keys and numeric-index fallback keys (MC-012).
 */
export function resolvePlayerDiscards(
  gameState: GameState,
  playerId: string,
  playerIndex: number,
): Tile[] {
  if (gameState.playerDiscards[playerId]) {
    return gameState.playerDiscards[playerId];
  }
  const indexKey = String(playerIndex);
  if (gameState.playerDiscards[indexKey]) {
    return gameState.playerDiscards[indexKey];
  }
  return [];
}

export function tileDiscardPriority(tile: Tile): number {
  // Honor tiles (winds/dragons) — generally safer early
  if (tile.type === TileType.HONOR) return 1;

  // Terminal tiles (1 and 9) — harder to use in chows
  if (tile.type === TileType.SUIT && (tile.number === 1 || tile.number === 9)) return 2;

  // Edge tiles (2 and 8)
  if (tile.type === TileType.SUIT && (tile.number === 2 || tile.number === 8)) return 3;

  // Middle tiles (3-7) — most versatile, keep them
  return 4;
}
