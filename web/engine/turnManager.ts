/**
 * Turn state machine for Hong Kong Mahjong.
 * Pure function: nextState(current, action) → new state.
 * No side effects — works identically on client and server.
 */

import { Tile, TileSuit, TileType, WindTile, tilesMatch, tileKey } from '@/models/Tile';
import {
  GameState, GamePhase, Player, PlayerAction, GameTurn,
  MeldInfo, ClaimRequest, TurnPhase, ClaimType,
} from '@/models/GameState';
import { TileFactory } from '@/models/Tile';
import { GameAction } from './types';
import { isWinningHand, canPlayerWin } from './winDetection';
import { getAvailableClaims, resolveClaims } from './claiming';

function applyDeferredKong(state: GameState, declarerIndex: number, kongTile: Tile): GameState {
  const player = state.players[declarerIndex];

  // Find the exposed pung to upgrade
  const pungMeldIndex = player.melds.findIndex(
    m => m.type === 'pung' && tilesMatch(m.tiles[0], kongTile)
  );
  if (pungMeldIndex === -1) {
    // Fallback: should never happen, just end claim phase normally
    return {
      ...state,
      currentPlayerIndex: (declarerIndex + 1) % state.players.length,
      turnPhase: 'draw',
      pendingClaims: [],
      claimablePlayers: [],
      passedPlayers: [],
      isRobKongOpportunity: undefined,
      turnStartedAt: new Date(),
    };
  }

  const newPlayers = [...state.players];
  const newMelds = [...newPlayers[declarerIndex].melds];
  newMelds[pungMeldIndex] = {
    ...newMelds[pungMeldIndex],
    tiles: [...newMelds[pungMeldIndex].tiles, kongTile],
    type: 'kong',
  };
  newPlayers[declarerIndex] = {
    ...newPlayers[declarerIndex],
    hand: newPlayers[declarerIndex].hand.filter(t => t.id !== kongTile.id),
    melds: newMelds,
  };

  // Draw replacement from dead wall
  let updatedState: GameState = {
    ...state,
    players: newPlayers,
    pendingClaims: [],
    claimablePlayers: [],
    passedPlayers: [],
    isRobKongOpportunity: undefined,
    turnPhase: 'discard',
    currentPlayerIndex: declarerIndex,
    turnStartedAt: new Date(),
  };

  if (state.deadWall.length === 0 && state.wall.length === 0) {
    return handleWallExhaustion(updatedState);
  }

  const sourceWall = state.deadWall.length > 0 ? state.deadWall : state.wall;
  const replacement = sourceWall[0];
  const newSourceWall = sourceWall.slice(1);

  newPlayers[declarerIndex] = {
    ...newPlayers[declarerIndex],
    hand: [...newPlayers[declarerIndex].hand, replacement],
  };

  const wallKey = state.deadWall.length > 0 ? 'deadWall' : 'wall';

  return {
    ...updatedState,
    players: newPlayers,
    [wallKey]: newSourceWall,
    lastDrawnTile: replacement,
    isKongReplacement: true,
  };
}

// ============================================
// Game initialization
// ============================================

export interface GameOptions {
  variant?: string;
  playerNames: string[];
  aiPlayers: { index: number; difficulty: 'easy' | 'medium' | 'hard' }[];
  humanPlayerId: string;
  turnTimeLimit?: number;
  dealerIndex?: number;
  seatWinds?: WindTile[];
  prevailingWind?: WindTile;
}

/**
 * Create a new game with shuffled tiles, dealt hands, and initial state.
 */
export function initializeGame(options: GameOptions): GameState {
  const tiles = TileFactory.getAllTiles();

  // Shuffle
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  const dealerIndex = options.dealerIndex ?? 0;
  const winds: WindTile[] = options.seatWinds ?? [WindTile.EAST, WindTile.SOUTH, WindTile.WEST, WindTile.NORTH];

  const players: Player[] = options.playerNames.map((name, i) => {
    const aiConfig = options.aiPlayers.find(a => a.index === i);
    return {
      id: i === 0 ? options.humanPlayerId : `ai_${i}`,
      name,
      isAI: !!aiConfig,
      aiDifficulty: aiConfig?.difficulty,
      hand: [],
      melds: [],
      score: 0,
      seatWind: winds[i],
      isDealer: i === dealerIndex,
      flowers: [],
    };
  });

  // Deal 13 tiles each
  let tileIndex = 0;
  for (const player of players) {
    player.hand = tiles.slice(tileIndex, tileIndex + 13);
    tileIndex += 13;
  }

  // Separate dead wall (14 tiles for kong replacements)
  const deadWall = tiles.slice(tileIndex, tileIndex + 14);
  tileIndex += 14;
  const wall = tiles.slice(tileIndex);

  const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  let state: GameState = {
    id: gameId,
    variant: options.variant || 'Hong Kong Mahjong',
    phase: GamePhase.PLAYING,
    turnPhase: 'draw',
    players,
    currentPlayerIndex: dealerIndex,
    wall,
    deadWall,
    discardPile: [],
    playerDiscards: Object.fromEntries(players.map(p => [p.id, []])),
    prevailingWind: options.prevailingWind ?? WindTile.EAST,
    pendingClaims: [],
    claimablePlayers: [],
    passedPlayers: [],
    finalScores: {},
    createdAt: new Date(),
    turnHistory: [],
    turnTimeLimit: options.turnTimeLimit || 20,
  };

  // Handle initial flowers for all players
  for (let i = 0; i < players.length; i++) {
    state = handleFlowers(state, i);
  }

  // Sort hands
  for (const player of state.players) {
    player.hand = sortHand(player.hand);
  }

  return state;
}

// ============================================
// State transitions
// ============================================

/**
 * Apply an action to the game state and return the new state.
 * Returns null if the action is invalid.
 */
export function applyAction(
  state: GameState,
  playerId: string,
  action: GameAction,
): GameState | null {
  if (state.phase !== GamePhase.PLAYING) return null;

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;

  switch (action.type) {
    case 'DRAW':
      return handleDraw(state, playerIndex);
    case 'DISCARD':
      return handleDiscard(state, playerIndex, action.tile);
    case 'DECLARE_KONG':
      return handleDeclareKong(state, playerIndex, action.tile);
    case 'DECLARE_WIN':
      return handleSelfDrawnWin(state, playerIndex);
    case 'CLAIM':
      return handleClaim(state, playerIndex, action.claimType, action.tilesFromHand);
    case 'PASS':
      return handlePass(state, playerIndex);
    default:
      return null;
  }
}

function handleDraw(state: GameState, playerIndex: number): GameState | null {
  if (state.turnPhase !== 'draw') return null;
  if (state.currentPlayerIndex !== playerIndex) return null;
  if (state.wall.length === 0) return handleWallExhaustion(state);

  const drawnTile = state.wall[0];
  const newWall = state.wall.slice(1);
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hand: [...newPlayers[playerIndex].hand, drawnTile],
  };

  let newState: GameState = {
    ...state,
    wall: newWall,
    players: newPlayers,
    lastDrawnTile: drawnTile,
    turnPhase: 'discard',
    turnStartedAt: new Date(),
    isKongReplacement: undefined,
  };

  // Handle flower/season: reveal and draw replacement
  if (drawnTile.type === TileType.BONUS) {
    newState = handleFlowerDraw(newState, playerIndex, drawnTile);
  }

  return newState;
}

function handleFlowerDraw(state: GameState, playerIndex: number, flowerTile: Tile): GameState {
  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerIndex] };

  // Remove flower from hand, add to flowers
  player.hand = player.hand.filter(t => t.id !== flowerTile.id);
  player.flowers = [...player.flowers, flowerTile];
  newPlayers[playerIndex] = player;

  // Draw replacement from dead wall
  if (state.deadWall.length === 0 && state.wall.length === 0) {
    return handleWallExhaustion({ ...state, players: newPlayers });
  }

  const replacementSource = state.deadWall.length > 0 ? 'deadWall' : 'wall';
  const sourceWall = replacementSource === 'deadWall' ? state.deadWall : state.wall;
  const replacement = sourceWall[0];
  const newSourceWall = sourceWall.slice(1);

  player.hand = [...player.hand, replacement];
  newPlayers[playerIndex] = player;

  let newState: GameState = {
    ...state,
    players: newPlayers,
    [replacementSource]: newSourceWall,
    lastDrawnTile: replacement,
  };

  // If replacement is also a flower, recurse
  if (replacement.type === TileType.BONUS) {
    newState = handleFlowerDraw(newState, playerIndex, replacement);
  }

  return newState;
}

function handleDiscard(state: GameState, playerIndex: number, tile: Tile): GameState | null {
  if (state.turnPhase !== 'discard') return null;
  if (state.currentPlayerIndex !== playerIndex) return null;

  const player = state.players[playerIndex];
  const tileInHand = player.hand.find(t => t.id === tile.id);
  if (!tileInHand) return null;

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hand: newPlayers[playerIndex].hand.filter(t => t.id !== tile.id),
  };

  const newPlayerDiscards = { ...state.playerDiscards };
  newPlayerDiscards[player.id] = [...(newPlayerDiscards[player.id] || []), tile];

  const turn: GameTurn = {
    turnNumber: state.turnHistory.length + 1,
    playerId: player.id,
    action: PlayerAction.DISCARD,
    tile,
    timestamp: new Date(),
  };

  // Check if any other player can claim
  const claims = getAllClaims(state, playerIndex, tile, newPlayers);

  // Only include players who actually have claims available
  const claimableIds = claims.length > 0
    ? claims.map(c => c.playerId)
    : [];

  // All non-discarder players need to act during claim phase (claim or pass)
  const allNonDiscarderIds = claims.length > 0
    ? getClaimablePlayerIds(playerIndex, newPlayers)
    : [];

  const newState: GameState = {
    ...state,
    players: newPlayers,
    discardPile: [...state.discardPile, tile],
    playerDiscards: newPlayerDiscards,
    lastDiscardedTile: tile,
    lastDiscardedBy: player.id,
    lastAction: PlayerAction.DISCARD,
    turnHistory: [...state.turnHistory, turn],
    turnPhase: claims.length > 0 ? 'claim' : 'draw',
    pendingClaims: [],
    claimablePlayers: allNonDiscarderIds,
    passedPlayers: [],
    currentPlayerIndex: (playerIndex + 1) % state.players.length,
    turnStartedAt: new Date(),
  };

  return newState;
}

function handleSelfDrawnWin(state: GameState, playerIndex: number): GameState | null {
  if (state.turnPhase !== 'discard') return null; // can only win after drawing
  if (state.currentPlayerIndex !== playerIndex) return null;

  const player = state.players[playerIndex];
  if (!canPlayerWin(player.hand, player.melds)) return null;

  return {
    ...state,
    phase: GamePhase.FINISHED,
    winnerId: player.id,
    winningTile: state.lastDrawnTile,
    isSelfDrawn: true,
    finishedAt: new Date(),
  };
}

function handleDeclareKong(state: GameState, playerIndex: number, tile: Tile): GameState | null {
  if (state.turnPhase !== 'discard') return null;
  if (state.currentPlayerIndex !== playerIndex) return null;

  const player = state.players[playerIndex];
  const matchingInHand = player.hand.filter(t => tilesMatch(t, tile));

  // Concealed kong: 4 matching tiles in hand
  if (matchingInHand.length === 4) {
    const newPlayers = [...state.players];
    newPlayers[playerIndex] = {
      ...newPlayers[playerIndex],
      hand: newPlayers[playerIndex].hand.filter(t => !tilesMatch(t, tile)),
      melds: [
        ...newPlayers[playerIndex].melds,
        { tiles: matchingInHand, type: 'kong', isConcealed: true },
      ],
    };

    // Draw replacement from dead wall
    if (state.deadWall.length === 0 && state.wall.length === 0) return null;
    const sourceWall = state.deadWall.length > 0 ? state.deadWall : state.wall;
    const replacement = sourceWall[0];

    newPlayers[playerIndex] = {
      ...newPlayers[playerIndex],
      hand: [...newPlayers[playerIndex].hand, replacement],
    };

    return {
      ...state,
      players: newPlayers,
      [state.deadWall.length > 0 ? 'deadWall' : 'wall']: sourceWall.slice(1),
      lastDrawnTile: replacement,
      turnPhase: 'discard', // player must discard after kong
      isKongReplacement: true,
    };
  }

  // Add to existing pung: 1 matching tile in hand + existing pung meld
  if (matchingInHand.length >= 1) {
    const pungMeldIndex = player.melds.findIndex(
      m => m.type === 'pung' && tilesMatch(m.tiles[0], tile)
    );
    if (pungMeldIndex !== -1) {
      const kongTile = matchingInHand[0];

      // Check if any other player can win with the kong tile (robbing the kong)
      const robbingClaims: { playerId: string }[] = [];
      for (let i = 0; i < state.players.length; i++) {
        if (i === playerIndex) continue;
        const otherHand = [...state.players[i].hand, kongTile];
        if (canPlayerWin(otherHand, state.players[i].melds)) {
          robbingClaims.push({ playerId: state.players[i].id });
        }
      }

      if (robbingClaims.length > 0) {
        // Enter claim phase for robbing the kong
        // The kong tile acts as the "discarded" tile for claim purposes
        // Store the kong state so it can be reverted if someone wins
        return {
          ...state,
          turnPhase: 'claim',
          lastDiscardedTile: kongTile,
          lastDiscardedBy: player.id,
          claimablePlayers: getClaimablePlayerIds(playerIndex, state.players),
          passedPlayers: [],
          pendingClaims: [],
          currentPlayerIndex: (playerIndex + 1) % state.players.length,
          isRobKongOpportunity: true,
        };
      }

      // No one can rob — proceed with kong normally
      const newPlayers = [...state.players];
      const newMelds = [...newPlayers[playerIndex].melds];
      newMelds[pungMeldIndex] = {
        ...newMelds[pungMeldIndex],
        tiles: [...newMelds[pungMeldIndex].tiles, kongTile],
        type: 'kong',
      };
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        hand: newPlayers[playerIndex].hand.filter(t => t.id !== kongTile.id),
        melds: newMelds,
      };

      // Draw replacement
      if (state.deadWall.length === 0 && state.wall.length === 0) return null;
      const sourceWall = state.deadWall.length > 0 ? state.deadWall : state.wall;
      const replacement = sourceWall[0];

      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        hand: [...newPlayers[playerIndex].hand, replacement],
      };

      return {
        ...state,
        players: newPlayers,
        [state.deadWall.length > 0 ? 'deadWall' : 'wall']: sourceWall.slice(1),
        lastDrawnTile: replacement,
        turnPhase: 'discard',
        isKongReplacement: true,
      };
    }
  }

  return null;
}

function handleClaim(
  state: GameState,
  playerIndex: number,
  claimType: ClaimType,
  tilesFromHand: Tile[],
): GameState | null {
  if (state.turnPhase !== 'claim') return null;
  if (!state.lastDiscardedTile) return null;
  if (state.currentPlayerIndex !== playerIndex) return null;

  const player = state.players[playerIndex];
  const discardedTile = state.lastDiscardedTile;

  // Validate the claim
  if (claimType === 'win') {
    const handWithTile = [...player.hand, discardedTile];
    if (!canPlayerWin(handWithTile, player.melds)) return null;
  } else {
    // Validate tiles from hand exist
    for (const t of tilesFromHand) {
      if (!player.hand.find(h => h.id === t.id)) return null;
    }
    const meldTiles = [...tilesFromHand, discardedTile];
    // Validate meld formation
    if (claimType === 'chow') {
      const sorted = meldTiles.sort((a, b) => (a.number || 0) - (b.number || 0));
      if (sorted.length !== 3) return null;
      if (sorted.some(t => t.type !== TileType.SUIT)) return null;
      if (sorted.some(t => t.suit !== sorted[0].suit)) return null;
      if (sorted[1].number !== sorted[0].number! + 1 || sorted[2].number !== sorted[1].number! + 1) return null;
    } else if (claimType === 'pung') {
      if (meldTiles.length !== 3) return null;
      if (!meldTiles.every(t => tilesMatch(t, meldTiles[0]))) return null;
    } else if (claimType === 'kong') {
      if (meldTiles.length !== 4) return null;
      if (!meldTiles.every(t => tilesMatch(t, meldTiles[0]))) return null;
    } else {
      return null;
    }
  }

  // Store the claim as pending
  const newPending: ClaimRequest = {
    playerId: player.id,
    claimType,
    tiles: tilesFromHand,
  };
  const updatedPending = [...state.pendingClaims, newPending];

  // Check if all claimable players have now acted (claimed or passed)
  const actedPlayerIds = new Set([
    ...state.passedPlayers,
    ...updatedPending.map(c => c.playerId),
  ]);
  const allActed = state.claimablePlayers.length > 0 &&
    state.claimablePlayers.every(id => actedPlayerIds.has(id));

  if (!allActed) {
    // More players still need to decide — advance to next claimer
    const discarderIndex = state.players.findIndex(p => p.id === state.lastDiscardedBy);
    let nextIndex = (playerIndex + 1) % state.players.length;
    while (nextIndex === discarderIndex || actedPlayerIds.has(state.players[nextIndex].id)) {
      nextIndex = (nextIndex + 1) % state.players.length;
      if (nextIndex === playerIndex) break; // safety
    }
    return {
      ...state,
      pendingClaims: updatedPending,
      currentPlayerIndex: nextIndex,
      turnPhase: 'claim',
      turnStartedAt: new Date(),
    };
  }

  // All players have acted — resolve claims by priority
  return resolveAndApplyClaim(state, updatedPending);
}

function resolveAndApplyClaim(state: GameState, claims: ClaimRequest[]): GameState {
  const discardedTile = state.lastDiscardedTile!;

  // Build priority map and resolve
  const priorityMap: Record<ClaimType, number> = { win: 4, kong: 3, pung: 2, chow: 1 };
  const discarderIndex = state.players.findIndex(p => p.id === state.lastDiscardedBy);

  // Sort by priority desc, then by distance from discarder asc
  const sorted = [...claims].sort((a, b) => {
    const priDiff = priorityMap[b.claimType] - priorityMap[a.claimType];
    if (priDiff !== 0) return priDiff;
    const idxA = state.players.findIndex(p => p.id === a.playerId);
    const idxB = state.players.findIndex(p => p.id === b.playerId);
    const distA = ((idxA - discarderIndex) + state.players.length) % state.players.length;
    const distB = ((idxB - discarderIndex) + state.players.length) % state.players.length;
    return distA - distB;
  });

  const winner = sorted[0];
  const winnerIndex = state.players.findIndex(p => p.id === winner.playerId);
  const player = state.players[winnerIndex];

  // Apply the winning claim
  if (winner.claimType === 'win') {
    const newDiscardPile = state.discardPile.filter(t => t.id !== discardedTile.id);
    return {
      ...state,
      discardPile: newDiscardPile,
      phase: GamePhase.FINISHED,
      winnerId: player.id,
      winningTile: discardedTile,
      isSelfDrawn: false,
      finishedAt: new Date(),
      pendingClaims: [],
      claimablePlayers: [],
      passedPlayers: [],
    };
  }

  const tilesFromHand = winner.tiles;
  const meldTiles = [...tilesFromHand, discardedTile];
  const meldType = winner.claimType === 'chow' ? 'chow' : winner.claimType === 'pung' ? 'pung' : 'kong';

  const newPlayers = [...state.players];
  newPlayers[winnerIndex] = {
    ...newPlayers[winnerIndex],
    hand: newPlayers[winnerIndex].hand.filter(t => !tilesFromHand.find(h => h.id === t.id)),
    melds: [
      ...newPlayers[winnerIndex].melds,
      { tiles: meldTiles, type: meldType, isConcealed: false },
    ],
  };

  const newDiscardPile = state.discardPile.filter(t => t.id !== discardedTile.id);

  let newState: GameState = {
    ...state,
    players: newPlayers,
    discardPile: newDiscardPile,
    currentPlayerIndex: winnerIndex,
    pendingClaims: [],
    claimablePlayers: [],
    passedPlayers: [],
    turnPhase: winner.claimType === 'kong' ? 'draw' : 'discard',
    turnStartedAt: new Date(),
  };

  // Kong: draw replacement tile
  if (winner.claimType === 'kong') {
    const sourceWall = newState.deadWall.length > 0 ? 'deadWall' : 'wall';
    if ((newState[sourceWall] as Tile[]).length > 0) {
      const replacement = (newState[sourceWall] as Tile[])[0];
      newPlayers[winnerIndex] = {
        ...newPlayers[winnerIndex],
        hand: [...newPlayers[winnerIndex].hand, replacement],
      };
      newState = {
        ...newState,
        players: newPlayers,
        [sourceWall]: (newState[sourceWall] as Tile[]).slice(1),
        lastDrawnTile: replacement,
        turnPhase: 'discard',
        isKongReplacement: true,
      };
    }
  }

  return newState;
}

function handlePass(state: GameState, playerIndex: number): GameState | null {
  if (state.turnPhase !== 'claim') return null;
  if (state.currentPlayerIndex !== playerIndex) return null;

  const playerId = state.players[playerIndex].id;
  const newPassedPlayers = [...state.passedPlayers, playerId];
  const discarderIndex = state.players.findIndex(p => p.id === state.lastDiscardedBy);

  // Check if all claimable players have now acted
  const actedPlayerIds = new Set([
    ...newPassedPlayers,
    ...state.pendingClaims.map(c => c.playerId),
  ]);
  const allActed = state.claimablePlayers.length > 0 &&
    state.claimablePlayers.every(id => actedPlayerIds.has(id));

  if (allActed) {
    // Everyone has acted — resolve any pending claims or end claim phase
    if (state.pendingClaims.length > 0) {
      return resolveAndApplyClaim({ ...state, passedPlayers: newPassedPlayers }, state.pendingClaims);
    }
    // If this was a deferred kong (robbing opportunity) and nobody claimed, complete it
    if (state.isRobKongOpportunity && state.lastDiscardedTile) {
      return applyDeferredKong(state, discarderIndex, state.lastDiscardedTile);
    }
    return {
      ...state,
      currentPlayerIndex: (discarderIndex + 1) % state.players.length,
      turnPhase: 'draw',
      pendingClaims: [],
      claimablePlayers: [],
      passedPlayers: [],
      turnStartedAt: new Date(),
    };
  }

  // Find next non-discarder player who hasn't acted yet
  let nextIndex = (playerIndex + 1) % state.players.length;
  let checked = 0;
  while ((nextIndex === discarderIndex || actedPlayerIds.has(state.players[nextIndex].id)) && checked < state.players.length) {
    nextIndex = (nextIndex + 1) % state.players.length;
    checked++;
  }

  return {
    ...state,
    currentPlayerIndex: nextIndex,
    turnPhase: 'claim',
    passedPlayers: newPassedPlayers,
    turnStartedAt: new Date(),
  };
}

function handleWallExhaustion(state: GameState): GameState {
  return {
    ...state,
    phase: GamePhase.FINISHED,
    finishedAt: new Date(),
    // No winnerId = draw game
  };
}

// ============================================
// Helpers
// ============================================

function getClaimablePlayerIds(discarderIndex: number, players: Player[]): string[] {
  const ids: string[] = [];
  for (let i = 1; i < players.length; i++) {
    const idx = (discarderIndex + i) % players.length;
    ids.push(players[idx].id);
  }
  return ids;
}

function getAllClaims(
  state: GameState,
  discarderIndex: number,
  discardedTile: Tile,
  players: Player[],
): { playerId: string; claims: ReturnType<typeof getAvailableClaims> }[] {
  const results: { playerId: string; claims: ReturnType<typeof getAvailableClaims> }[] = [];

  for (let i = 0; i < players.length; i++) {
    if (i === discarderIndex) continue;
    const claims = getAvailableClaims(discardedTile, players[i], i, discarderIndex, players.length);
    if (claims.length > 0) {
      results.push({ playerId: players[i].id, claims });
    }
  }

  return results;
}

function handleFlowers(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const flowers = player.hand.filter(t => t.type === TileType.BONUS);
  if (flowers.length === 0) return state;

  const newPlayers = [...state.players];
  let hand = player.hand.filter(t => t.type !== TileType.BONUS);
  const playerFlowers = [...player.flowers, ...flowers];

  // Draw replacements
  let wall = [...state.wall];
  let deadWall = [...state.deadWall];

  for (let i = 0; i < flowers.length; i++) {
    const sourceWall = deadWall.length > 0 ? deadWall : wall;
    if (sourceWall.length === 0) break;
    const replacement = sourceWall[0];
    if (deadWall.length > 0) {
      deadWall = deadWall.slice(1);
    } else {
      wall = wall.slice(1);
    }

    if (replacement.type === TileType.BONUS) {
      playerFlowers.push(replacement);
      // Need another replacement
      flowers.push(replacement); // trick: extend loop
    } else {
      hand.push(replacement);
    }
  }

  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hand,
    flowers: playerFlowers,
  };

  return { ...state, players: newPlayers, wall, deadWall };
}

function sortHand(hand: Tile[]): Tile[] {
  const suitOrder: Record<string, number> = {
    [TileSuit.DOT]: 0,
    [TileSuit.BAMBOO]: 1,
    [TileSuit.CHARACTER]: 2,
    [TileSuit.WIND]: 3,
    [TileSuit.DRAGON]: 4,
  };

  return [...hand].sort((a, b) => {
    const suitDiff = (suitOrder[a.suit] ?? 9) - (suitOrder[b.suit] ?? 9);
    if (suitDiff !== 0) return suitDiff;
    return (a.number ?? 0) - (b.number ?? 0);
  });
}
