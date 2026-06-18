/**
 * Turn state machine for Hong Kong Mahjong.
 * Pure function: nextState(current, action) → new state.
 * No side effects — works identically on client and server.
 */

import { Tile, TileSuit, TileType, WindTile, tilesMatch, tileKey } from '@/models/Tile';
import {
  GameState, GamePhase, Player, PlayerAction, GameTurn,
  MeldInfo, ClaimRequest, TurnPhase, ClaimType, DrawResult, AIPersonalityParams,
} from '@/models/GameState';
import { TileFactory } from '@/models/Tile';
import { GameAction, ScoringContext, ScoringResult, WinMethod, DEFAULT_MIN_FAAN } from './types';
import { createRng, shuffleInPlace, randomSeed } from './rng';
import { isWinningHand, canPlayerWin, isTenpai } from './winDetection';
import { getAvailableClaims, resolveClaimRequests } from './claiming';
import { meetsMinFaan, calculateScore } from './scoring';

/**
 * Flat noten-penalty constant used at wall exhaustion.
 *
 * Ruleset note: HK rules vary — many clubs play "no payment on draw" while
 * modern learning/app settings import the Japanese tenpai/noten bappu idea.
 * We pick the simplest defensible variant: every noten player pays
 * NOTEN_PENALTY_PER_NOTEN, split evenly among the tenpai players. If everyone
 * is tenpai or everyone is noten, there is no payment.
 */
export const NOTEN_PENALTY_PER_NOTEN = 1500;

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

  const result: GameState = {
    ...updatedState,
    players: newPlayers,
    [wallKey]: newSourceWall,
    lastDrawnTile: replacement,
    isKongReplacement: true,
  };
  if (replacement.type === TileType.BONUS) {
    return handleFlowerDraw(result, declarerIndex, replacement);
  }
  return result;
}

// ============================================
// Game initialization
// ============================================

export interface GameOptions {
  variant?: string;
  playerNames: string[];
  aiPlayers: { index: number; difficulty: 'easy' | 'medium' | 'hard'; personality?: AIPersonalityParams }[];
  humanPlayerId: string;
  turnTimeLimit?: number;
  dealerIndex?: number;
  seatWinds?: WindTile[];
  prevailingWind?: WindTile;
  /**
   * Minimum faan required for a legal win. Defaults to HK standard (3).
   * Solo / learning modes may pass 1 or 0 to let beginners complete hands.
   */
  minFaan?: number;
  /**
   * Deterministic seed. The same seed always produces the same shuffle and
   * the same AI noise, so a (seed, action-sequence) pair replays exactly.
   * Omit for a random game.
   */
  seed?: string;
}

/**
 * Create a new game with shuffled tiles, dealt hands, and initial state.
 */
export function initializeGame(options: GameOptions): GameState {
  const seed = options.seed ?? randomSeed();
  const tiles = TileFactory.getAllTiles();
  shuffleInPlace(tiles, createRng(seed));

  const dealerIndex = options.dealerIndex ?? 0;
  const winds: WindTile[] = options.seatWinds ?? [WindTile.EAST, WindTile.SOUTH, WindTile.WEST, WindTile.NORTH];

  const players: Player[] = options.playerNames.map((name, i) => {
    const aiConfig = options.aiPlayers.find(a => a.index === i);
    return {
      id: i === 0 ? options.humanPlayerId : `ai_${i}`,
      name,
      isAI: !!aiConfig,
      aiDifficulty: aiConfig?.difficulty,
      aiPersonality: aiConfig?.personality,
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

  const gameId = `game_${seed}`;

  let state: GameState = {
    id: gameId,
    seed,
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
    minFaan: options.minFaan ?? DEFAULT_MIN_FAAN,
  };

  // Handle initial flowers for all players, starting from the dealer
  // (HK convention: replacement draws proceed in turn order from East)
  for (let i = 0; i < players.length; i++) {
    state = handleFlowers(state, (dealerIndex + i) % players.length);
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
  let currentState = state;
  let currentTile: Tile | null = flowerTile;

  while (currentTile && currentTile.type === TileType.BONUS) {
    const newPlayers = [...currentState.players];
    const player = { ...newPlayers[playerIndex] };

    // Remove flower from hand, add to flowers
    player.hand = player.hand.filter(t => t.id !== currentTile!.id);
    player.flowers = [...player.flowers, currentTile];
    newPlayers[playerIndex] = player;

    // Draw replacement from dead wall (prefer dead wall, fall back to wall)
    if (currentState.deadWall.length === 0 && currentState.wall.length === 0) {
      return handleWallExhaustion({ ...currentState, players: newPlayers });
    }

    const replacementSource = currentState.deadWall.length > 0 ? 'deadWall' : 'wall';
    const sourceWall = replacementSource === 'deadWall' ? currentState.deadWall : currentState.wall;
    const replacement = sourceWall[0];
    const newSourceWall = sourceWall.slice(1);

    player.hand = [...player.hand, replacement];
    newPlayers[playerIndex] = player;

    currentState = {
      ...currentState,
      players: newPlayers,
      [replacementSource]: newSourceWall,
      lastDrawnTile: replacement,
    };

    // If replacement is also a bonus tile, loop again; otherwise we're done
    currentTile = replacement.type === TileType.BONUS ? replacement : null;
  }

  return currentState;
}

function handleDiscard(state: GameState, playerIndex: number, tile: Tile): GameState | null {
  if (state.turnPhase !== 'discard') return null;
  if (state.currentPlayerIndex !== playerIndex) return null;

  const player = state.players[playerIndex];
  const tileInHand = player.hand.find(t => t.id === tile.id);
  if (!tileInHand) return null;
  // Bonus tiles are never legal discards — they belong in the flower display
  if (tileInHand.type === TileType.BONUS) return null;

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
    // The kong-replacement window closes once the player discards
    isKongReplacement: undefined,
    turnStartedAt: new Date(),
  };

  return newState;
}

function handleSelfDrawnWin(state: GameState, playerIndex: number): GameState | null {
  if (state.turnPhase !== 'discard') return null; // can only win after drawing
  if (state.currentPlayerIndex !== playerIndex) return null;

  const player = state.players[playerIndex];
  if (!canPlayerWin(player.hand, player.melds)) return null;
  if (!state.lastDrawnTile) return null;
  // The drawn tile must actually be in this player's hand — guards against
  // stale lastDrawnTile from another player's turn.
  if (!player.hand.find(t => t.id === state.lastDrawnTile!.id)) return null;

  // Enforce HK minimum faan threshold: a hand must score >= minFaan to legally win.
  const ctx = buildScoringContext(state, player, state.lastDrawnTile, {
    isSelfDrawn: true,
  });
  if (!meetsMinFaan(player.hand, player.melds, ctx)) return null;

  return {
    ...state,
    phase: GamePhase.FINISHED,
    winnerId: player.id,
    winningTile: state.lastDrawnTile,
    isSelfDrawn: true,
    winMethod: ctx.winMethod,
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
    if (state.deadWall.length === 0 && state.wall.length === 0) {
      // Kong is valid but no replacement tile exists — transition to draw game
      return handleWallExhaustion({
        ...state,
        players: newPlayers,
        pendingClaims: [],
        claimablePlayers: [],
        passedPlayers: [],
        isRobKongOpportunity: undefined,
        turnPhase: 'discard',
        currentPlayerIndex: playerIndex,
        turnStartedAt: new Date(),
      });
    }
    const sourceWall = state.deadWall.length > 0 ? state.deadWall : state.wall;
    const replacement = sourceWall[0];

    newPlayers[playerIndex] = {
      ...newPlayers[playerIndex],
      hand: [...newPlayers[playerIndex].hand, replacement],
    };

    const wallKey = state.deadWall.length > 0 ? 'deadWall' : 'wall';
    const kongState: GameState = {
      ...state,
      players: newPlayers,
      [wallKey]: sourceWall.slice(1),
      lastDrawnTile: replacement,
      turnPhase: 'discard', // player must discard after kong
      isKongReplacement: true,
    };
    if (replacement.type === TileType.BONUS) {
      return handleFlowerDraw(kongState, playerIndex, replacement);
    }
    return kongState;
  }

  // Add to existing pung: 1 matching tile in hand + existing pung meld
  if (matchingInHand.length >= 1) {
    const pungMeldIndex = player.melds.findIndex(
      m => m.type === 'pung' && tilesMatch(m.tiles[0], tile)
    );
    if (pungMeldIndex !== -1) {
      const kongTile = matchingInHand[0];

      // Check if any other player can win with the kong tile (robbing the kong).
      // The robbing hand must also meet the HK minimum faan threshold to be legal.
      const robbingClaims: { playerId: string }[] = [];
      for (let i = 0; i < state.players.length; i++) {
        if (i === playerIndex) continue;
        const otherHand = [...state.players[i].hand, kongTile];
        if (!canPlayerWin(otherHand, state.players[i].melds)) continue;
        const robCtx = buildScoringContext(state, state.players[i], kongTile, {
          isSelfDrawn: false,
          winMethod: 'robKong',
          discarderIndex: playerIndex,
        });
        if (!meetsMinFaan(state.players[i].hand, state.players[i].melds, robCtx)) continue;
        robbingClaims.push({ playerId: state.players[i].id });
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
      if (state.deadWall.length === 0 && state.wall.length === 0) {
        // Kong is valid but no replacement tile exists — transition to draw game
        return handleWallExhaustion({
          ...state,
          players: newPlayers,
          pendingClaims: [],
          claimablePlayers: [],
          passedPlayers: [],
          isRobKongOpportunity: undefined,
          turnPhase: 'discard',
          currentPlayerIndex: playerIndex,
          turnStartedAt: new Date(),
        });
      }
      const sourceWall = state.deadWall.length > 0 ? state.deadWall : state.wall;
      const replacement = sourceWall[0];

      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        hand: [...newPlayers[playerIndex].hand, replacement],
      };

      const wallKey2 = state.deadWall.length > 0 ? 'deadWall' : 'wall';
      const deferredKongState: GameState = {
        ...state,
        players: newPlayers,
        [wallKey2]: sourceWall.slice(1),
        lastDrawnTile: replacement,
        turnPhase: 'discard',
        isKongReplacement: true,
      };
      if (replacement.type === TileType.BONUS) {
        return handleFlowerDraw(deferredKongState, playerIndex, replacement);
      }
      return deferredKongState;
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

  // During a rob-the-kong window the tile is not a real discard — it is
  // still in the kong declarer's hand. Only a win may take it.
  if (state.isRobKongOpportunity && claimType !== 'win') return null;

  // Validate the claim
  if (claimType === 'win') {
    const handWithTile = [...player.hand, discardedTile];
    if (!canPlayerWin(handWithTile, player.melds)) return null;
    // Enforce HK minimum faan threshold on discard-wins as well.
    const ctx = buildScoringContext(state, player, discardedTile, {
      isSelfDrawn: false,
      discarderIndex: state.players.findIndex(p => p.id === state.lastDiscardedBy),
    });
    if (!meetsMinFaan(player.hand, player.melds, ctx)) return null;
  } else {
    // Validate tiles from hand exist and are distinct physical tiles
    if (new Set(tilesFromHand.map(t => t.id)).size !== tilesFromHand.length) return null;
    for (const t of tilesFromHand) {
      if (!player.hand.find(h => h.id === t.id)) return null;
    }
    const meldTiles = [...tilesFromHand, discardedTile];
    // Validate meld formation
    if (claimType === 'chow') {
      // Chow is only legal for the player to the discarder's left (next in turn order)
      const discarderIdx = state.players.findIndex(p => p.id === state.lastDiscardedBy);
      if (discarderIdx === -1) return null;
      if (playerIndex !== (discarderIdx + 1) % state.players.length) return null;
      const sorted = [...meldTiles].sort((a, b) => (a.number || 0) - (b.number || 0));
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
  const discarderIndex = state.players.findIndex(p => p.id === state.lastDiscardedBy);

  const playerIndexMap = Object.fromEntries(state.players.map((p, i) => [p.id, i]));
  const winner = resolveClaimRequests(claims, discarderIndex, state.players.length, playerIndexMap)!;
  const winnerIndex = state.players.findIndex(p => p.id === winner.playerId);
  const player = state.players[winnerIndex];

  // Apply the winning claim
  if (winner.claimType === 'win') {
    const newDiscardPile = state.discardPile.filter(t => t.id !== discardedTile.id);
    // The claimed tile joins the winner's hand: keeps the finished state
    // consistent with self-draw wins (14 effective tiles in hand) and
    // conserves the 144-tile invariant. On a robbed kong the tile is still
    // in the declarer's hand rather than the pile — remove it from there.
    const winPlayers = state.players.map(p => ({
      ...p,
      hand: p.hand.filter(t => t.id !== discardedTile.id),
    }));
    winPlayers[winnerIndex] = {
      ...winPlayers[winnerIndex],
      hand: [...winPlayers[winnerIndex].hand, discardedTile],
    };
    return {
      ...state,
      players: winPlayers,
      discardPile: newDiscardPile,
      phase: GamePhase.FINISHED,
      winnerId: player.id,
      winningTile: discardedTile,
      isSelfDrawn: false,
      winMethod: deriveWinMethod(state, false),
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
    // The claimant did not draw: clear draw-derived state so a follow-up
    // DECLARE_WIN cannot masquerade as a self-draw on a stale tile.
    lastDrawnTile: undefined,
    isKongReplacement: undefined,
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
      if (replacement.type === TileType.BONUS) {
        newState = handleFlowerDraw(newState, winnerIndex, replacement);
      }
    } else {
      // Both walls empty — kong is valid but no replacement. Transition to draw game.
      return handleWallExhaustion({
        ...newState,
        players: newPlayers,
        turnPhase: 'discard',
        currentPlayerIndex: winnerIndex,
      });
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
  // Tenpai/noten settlement (see NOTEN_PENALTY_PER_NOTEN note above).
  // A player is tenpai if their hand is one tile away from winning (shanten === 0).
  // For players with exposed melds, shanten is evaluated on their concealed tiles
  // treated as a 13-tile equivalent hand (meld count × 3 pre-committed tiles).
  const tenpaiFlags = state.players.map(p => isPlayerTenpai(p));
  const tenpaiCount = tenpaiFlags.filter(Boolean).length;
  const notenCount = state.players.length - tenpaiCount;

  const scoreChanges = new Array(state.players.length).fill(0);
  // Only settle when the split is mixed — all-tenpai and all-noten pay nothing.
  if (tenpaiCount > 0 && notenCount > 0) {
    const totalPool = NOTEN_PENALTY_PER_NOTEN * notenCount;
    const perTenpai = Math.floor(totalPool / tenpaiCount);
    for (let i = 0; i < state.players.length; i++) {
      if (tenpaiFlags[i]) {
        scoreChanges[i] += perTenpai;
      } else {
        scoreChanges[i] -= NOTEN_PENALTY_PER_NOTEN;
      }
    }
  }

  const drawResult: DrawResult = {
    reason: 'wallExhausted',
    tenpaiPlayerIds: state.players.filter((_, i) => tenpaiFlags[i]).map(p => p.id),
    notenPlayerIds: state.players.filter((_, i) => !tenpaiFlags[i]).map(p => p.id),
    scoreChanges,
  };

  return {
    ...state,
    phase: GamePhase.FINISHED,
    finishedAt: new Date(),
    drawResult,
    // No winnerId = draw game
  };
}

/**
 * Determine whether a player is tenpai (one tile away from winning).
 * Uses the exact brute-force check (all 34 tile kinds through canPlayerWin)
 * rather than the heuristic shanten estimate, because tenpai here has
 * scoring consequences: it decides the wall-exhaustion noten settlement.
 */
export function isPlayerTenpai(player: Player): boolean {
  return isTenpai(player.hand, player.melds);
}

/**
 * Derive how a prospective win was obtained from live game state.
 * Single source of truth for win methods: the legality gate, the finished
 * state, and the UI's scoring context all flow through this.
 */
export function deriveWinMethod(state: GameState, isSelfDrawn: boolean): WinMethod {
  if (isSelfDrawn) {
    if (state.isKongReplacement) return 'kongReplacement';
    if (state.wall.length === 0) return 'lastTileDraw';
    return 'selfDraw';
  }
  if (state.isRobKongOpportunity) return 'robKong';
  if (state.wall.length === 0) return 'lastTileClaim';
  return 'discard';
}

function totalDiscards(state: GameState): number {
  return Object.values(state.playerDiscards).reduce((sum, d) => sum + d.length, 0);
}

/** Heavenly hand: dealer self-draws a win on the first draw, before any discard or claim. */
function isHeavenlyWin(state: GameState, player: Player, isSelfDrawn: boolean): boolean {
  return isSelfDrawn && player.isDealer &&
    totalDiscards(state) === 0 &&
    state.players.every(p => p.melds.length === 0);
}

/** Earthly hand: a non-dealer wins by claiming the dealer's very first discard. */
function isEarthlyWin(state: GameState, player: Player, isSelfDrawn: boolean): boolean {
  if (isSelfDrawn || player.isDealer) return false;
  const dealer = state.players.find(p => p.isDealer);
  if (!dealer || state.lastDiscardedBy !== dealer.id) return false;
  return totalDiscards(state) === 1 &&
    state.players.every(p => p.melds.length === 0);
}

/**
 * Build a ScoringContext from the current game state for a given player + winning tile.
 * Used by the min-faan legality gate on win declarations and, via
 * buildWinScoringContext, by final scoring.
 */
function buildScoringContext(
  state: GameState,
  player: Player,
  winningTile: Tile,
  opts: Partial<ScoringContext> & Pick<ScoringContext, 'isSelfDrawn'>,
): ScoringContext {
  const isConcealed = player.melds.every(m => m.isConcealed);
  return {
    winningTile,
    isSelfDrawn: opts.isSelfDrawn,
    seatWind: player.seatWind,
    prevailingWind: state.prevailingWind,
    isConcealed,
    flowers: player.flowers,
    winMethod: opts.winMethod ?? deriveWinMethod(state, opts.isSelfDrawn),
    isDealer: player.isDealer,
    discarderIndex: opts.discarderIndex,
    isHeavenly: isHeavenlyWin(state, player, opts.isSelfDrawn),
    isEarthly: isEarthlyWin(state, player, opts.isSelfDrawn),
    minFaan: state.minFaan ?? DEFAULT_MIN_FAAN,
  };
}

/**
 * Can this player legally declare a self-drawn win right now?
 * Mirrors handleSelfDrawnWin's gates (winning shape + drawn tile in hand +
 * minimum faan) without mutating state. AI tiers MUST use this rather than
 * bare canPlayerWin, or they will declare wins the engine rejects.
 */
export function canDeclareSelfDrawnWin(state: GameState, playerIndex: number): boolean {
  if (state.turnPhase !== 'discard' || state.currentPlayerIndex !== playerIndex) return false;
  const player = state.players[playerIndex];
  if (!state.lastDrawnTile) return false;
  if (!player.hand.find(t => t.id === state.lastDrawnTile!.id)) return false;
  if (!canPlayerWin(player.hand, player.melds)) return false;
  const ctx = buildScoringContext(state, player, state.lastDrawnTile, { isSelfDrawn: true });
  return meetsMinFaan(player.hand, player.melds, ctx);
}

/**
 * Score the player's current hand as if they declared a self-drawn win now,
 * ignoring the minimum-faan gate. Returns null when the hand is not a winning
 * shape (or the drawn tile isn't in hand). The UI uses this to explain *why* a
 * complete hand can't be declared — e.g. "only 2 faan, this table needs 3" —
 * without duplicating scoring logic. Win legality is still owned by
 * canDeclareSelfDrawnWin / handleSelfDrawnWin.
 */
export function scoreSelfDrawnHand(state: GameState, playerIndex: number): ScoringResult | null {
  if (state.turnPhase !== 'discard' || state.currentPlayerIndex !== playerIndex) return null;
  const player = state.players[playerIndex];
  if (!state.lastDrawnTile) return null;
  if (!player.hand.find(t => t.id === state.lastDrawnTile!.id)) return null;
  if (!canPlayerWin(player.hand, player.melds)) return null;
  const ctx = buildScoringContext(state, player, state.lastDrawnTile, { isSelfDrawn: true });
  return calculateScore(player.hand, player.melds, ctx);
}

/**
 * The claims a player may legally make on the current discard, with win
 * claims filtered through the minimum-faan gate (a winning shape below the
 * table minimum is not a legal claim). Use this — not raw getAvailableClaims —
 * when offering claims to AI or UI.
 */
export function getLegalClaims(state: GameState, playerIndex: number) {
  if (!state.lastDiscardedTile || !state.lastDiscardedBy) return [];
  const player = state.players[playerIndex];
  const discarderIndex = state.players.findIndex(p => p.id === state.lastDiscardedBy);
  if (discarderIndex === -1 || discarderIndex === playerIndex) return [];

  let claims = getAvailableClaims(
    state.lastDiscardedTile, player, playerIndex, discarderIndex, state.players.length,
  );

  // Rob-the-kong window: only wins may take the tile
  if (state.isRobKongOpportunity) {
    claims = claims.filter(c => c.claimType === 'win');
  }

  return claims.filter(c => {
    if (c.claimType !== 'win') return true;
    const ctx = buildScoringContext(state, player, state.lastDiscardedTile!, {
      isSelfDrawn: false,
      discarderIndex,
    });
    return meetsMinFaan(player.hand, player.melds, ctx);
  });
}

/**
 * Build the ScoringContext for a FINISHED game's winner. Returns null when the
 * game has no winner (draw) or state is inconsistent. UI layers should use
 * this instead of reconstructing win context themselves.
 */
export function buildWinScoringContext(state: GameState): ScoringContext | null {
  if (!state.winnerId || !state.winningTile) return null;
  const winner = state.players.find(p => p.id === state.winnerId);
  if (!winner) return null;
  const isSelfDrawn = state.isSelfDrawn ?? false;
  const discarderIndex = !isSelfDrawn && state.lastDiscardedBy
    ? state.players.findIndex(p => p.id === state.lastDiscardedBy)
    : undefined;
  return buildScoringContext(state, winner, state.winningTile, {
    isSelfDrawn,
    winMethod: state.winMethod,
    discarderIndex: discarderIndex === -1 ? undefined : discarderIndex,
  });
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
    const claims = getAvailableClaims(discardedTile, players[i], i, discarderIndex, players.length)
      .filter(c => {
        // Win claims below the table's minimum faan are not legal claims —
        // don't open a claim window for them.
        if (c.claimType !== 'win') return true;
        const ctx = buildScoringContext(state, players[i], discardedTile, {
          isSelfDrawn: false,
          discarderIndex,
        });
        return meetsMinFaan(players[i].hand, players[i].melds, ctx);
      });
    if (claims.length > 0) {
      results.push({ playerId: players[i].id, claims });
    }
  }

  return results;
}

function handleFlowers(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const initialFlowers = player.hand.filter(t => t.type === TileType.BONUS);
  if (initialFlowers.length === 0) return state;

  const newPlayers = [...state.players];
  let hand = player.hand.filter(t => t.type !== TileType.BONUS);
  const playerFlowers: Tile[] = [...player.flowers, ...initialFlowers];

  // Draw replacements
  let wall = [...state.wall];
  let deadWall = [...state.deadWall];

  // Use an explicit growing-index loop instead of mutating a `const` array
  // with for-loop push, which is fragile and violates the const naming.
  const flowersToProcess: Tile[] = [...initialFlowers];
  let i = 0;
  while (i < flowersToProcess.length) {
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
      // Queue another iteration for the bonus replacement
      flowersToProcess.push(replacement);
    } else {
      hand.push(replacement);
    }
    i++;
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
