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
import { isWinningHand } from './winDetection';
import { getAvailableClaims, resolveClaims } from './claiming';

// ============================================
// Game initialization
// ============================================

export interface GameOptions {
  variant?: string;
  playerNames: string[];
  aiPlayers: { index: number; difficulty: 'easy' | 'medium' | 'hard' }[];
  humanPlayerId: string;
  turnTimeLimit?: number;
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

  const winds: WindTile[] = [WindTile.EAST, WindTile.SOUTH, WindTile.WEST, WindTile.NORTH];

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
      isDealer: i === 0,
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
    currentPlayerIndex: 0,
    wall,
    deadWall,
    discardPile: [],
    playerDiscards: Object.fromEntries(players.map(p => [p.id, []])),
    prevailingWind: WindTile.EAST,
    pendingClaims: [],
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
    currentPlayerIndex: (playerIndex + 1) % state.players.length,
    turnStartedAt: new Date(),
  };

  return newState;
}

function handleSelfDrawnWin(state: GameState, playerIndex: number): GameState | null {
  if (state.turnPhase !== 'discard') return null; // can only win after drawing
  if (state.currentPlayerIndex !== playerIndex) return null;

  const player = state.players[playerIndex];
  if (!isWinningHand(player.hand)) return null;

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
    };
  }

  // Add to existing pung: 1 matching tile in hand + existing pung meld
  if (matchingInHand.length >= 1) {
    const pungMeldIndex = player.melds.findIndex(
      m => m.type === 'pung' && tilesMatch(m.tiles[0], tile)
    );
    if (pungMeldIndex !== -1) {
      const newPlayers = [...state.players];
      const newMelds = [...newPlayers[playerIndex].melds];
      newMelds[pungMeldIndex] = {
        ...newMelds[pungMeldIndex],
        tiles: [...newMelds[pungMeldIndex].tiles, matchingInHand[0]],
        type: 'kong',
      };
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        hand: newPlayers[playerIndex].hand.filter(t => t.id !== matchingInHand[0].id),
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

  const player = state.players[playerIndex];
  const discardedTile = state.lastDiscardedTile;

  // Validate the claim
  if (claimType === 'win') {
    const handWithTile = [...player.hand, discardedTile];
    if (!isWinningHand(handWithTile)) return null;

    // Remove tile from discard pile
    const newDiscardPile = state.discardPile.filter(t => t.id !== discardedTile.id);

    return {
      ...state,
      discardPile: newDiscardPile,
      phase: GamePhase.FINISHED,
      winnerId: player.id,
      winningTile: discardedTile,
      isSelfDrawn: false,
      finishedAt: new Date(),
    };
  }

  // Validate tiles from hand exist
  for (const t of tilesFromHand) {
    if (!player.hand.find(h => h.id === t.id)) return null;
  }

  const meldTiles = [...tilesFromHand, discardedTile];

  // Validate meld
  let meldType: 'chow' | 'pung' | 'kong';
  if (claimType === 'chow') {
    meldType = 'chow';
    const sorted = meldTiles.sort((a, b) => (a.number || 0) - (b.number || 0));
    if (sorted.length !== 3) return null;
    if (sorted.some(t => t.type !== TileType.SUIT)) return null;
    if (sorted.some(t => t.suit !== sorted[0].suit)) return null;
    if (sorted[1].number !== sorted[0].number! + 1 || sorted[2].number !== sorted[1].number! + 1) return null;
  } else if (claimType === 'pung') {
    meldType = 'pung';
    if (meldTiles.length !== 3) return null;
    if (!meldTiles.every(t => tilesMatch(t, meldTiles[0]))) return null;
  } else if (claimType === 'kong') {
    meldType = 'kong';
    if (meldTiles.length !== 4) return null;
    if (!meldTiles.every(t => tilesMatch(t, meldTiles[0]))) return null;
  } else {
    return null;
  }

  // Apply the claim
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hand: newPlayers[playerIndex].hand.filter(t => !tilesFromHand.find(h => h.id === t.id)),
    melds: [
      ...newPlayers[playerIndex].melds,
      { tiles: meldTiles, type: meldType, isConcealed: false },
    ],
  };

  // Remove from discard pile
  const newDiscardPile = state.discardPile.filter(t => t.id !== discardedTile.id);

  let newState: GameState = {
    ...state,
    players: newPlayers,
    discardPile: newDiscardPile,
    currentPlayerIndex: playerIndex,
    pendingClaims: [],
    turnPhase: claimType === 'kong' ? 'draw' : 'discard', // kong gets replacement draw
    turnStartedAt: new Date(),
  };

  // Kong: draw replacement tile
  if (claimType === 'kong') {
    const sourceWall = newState.deadWall.length > 0 ? 'deadWall' : 'wall';
    if ((newState[sourceWall] as Tile[]).length > 0) {
      const replacement = (newState[sourceWall] as Tile[])[0];
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        hand: [...newPlayers[playerIndex].hand, replacement],
      };
      newState = {
        ...newState,
        players: newPlayers,
        [sourceWall]: (newState[sourceWall] as Tile[]).slice(1),
        lastDrawnTile: replacement,
        turnPhase: 'discard',
      };
    }
  }

  return newState;
}

function handlePass(state: GameState, playerIndex: number): GameState | null {
  if (state.turnPhase !== 'claim') return null;

  const discarderIndex = state.players.findIndex(p => p.id === state.lastDiscardedBy);

  // Find next non-discarder player in turn order who hasn't been visited yet
  let nextIndex = (playerIndex + 1) % state.players.length;
  let checked = 0;
  while (nextIndex === discarderIndex && checked < state.players.length) {
    nextIndex = (nextIndex + 1) % state.players.length;
    checked++;
  }

  // If we wrapped back to the current player or the discarder's next player,
  // all non-discarder players have had their chance — end claim phase
  if (nextIndex === (discarderIndex + 1) % state.players.length) {
    return {
      ...state,
      currentPlayerIndex: (discarderIndex + 1) % state.players.length,
      turnPhase: 'draw',
      pendingClaims: [],
      turnStartedAt: new Date(),
    };
  }

  // Advance to next claimer, stay in claim phase
  return {
    ...state,
    currentPlayerIndex: nextIndex,
    turnPhase: 'claim',
    pendingClaims: [],
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
