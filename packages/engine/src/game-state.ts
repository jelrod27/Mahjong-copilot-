import type {
  TileId,
  TileType,
  PlayerId,
  Meld,
  PlayerState,
  DiscardInfo,
  GameState,
  GameEvent,
  Wind,
} from './types.js';
import { GamePhase } from './types.js';
import { tileIdToType, tilesToHandArray } from './tiles.js';
import { buildWall, dealHands, drawTile, drawReplacementTile, type WallState } from './wall.js';
import {
  findValidChi,
  findValidPon,
  findValidOpenKan,
  findAddedKans,
  resolveCallPriority,
  type PendingCall,
} from './melds.js';
import { isWinningHand, isTenpai } from './win-detection.js';
import { checkStaticFuriten, wouldCompleteFuriten } from './furiten.js';

// ============================================================================
// Game Initialization
// ============================================================================

export interface GameConfig {
  seed?: number;
  startingPoints: number;
}

const DEFAULT_CONFIG: GameConfig = {
  startingPoints: 25000,
};

/**
 * Create the initial game state for a new game.
 */
export function createGame(config: Partial<GameConfig> = {}): GameState {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const players = createPlayers(cfg.startingPoints);

  return {
    phase: GamePhase.WaitingToStart,
    round: {
      wind: 0 as Wind, // East round
      number: 1,
      dealer: 0 as PlayerId,
      honbaCount: 0,
      riichiSticksOnTable: 0,
    },
    wall: { liveTiles: [], deadWall: [], tilesRemaining: 0 },
    players,
    currentTurn: 0 as PlayerId,
    turnNumber: 0,
    doraIndicators: [],
    uraDoraIndicators: [],
    gameLog: [],
  };
}

function createPlayers(startingPoints: number): [PlayerState, PlayerState, PlayerState, PlayerState] {
  return [0, 1, 2, 3].map((id) => ({
    id: id as PlayerId,
    seat: id as Wind,
    hand: { closed: [], closedArray: new Array(34).fill(0) as number[], openMelds: [], closedKans: [] },
    discards: [],
    points: startingPoints,
    isRiichi: false,
    isIppatsu: false,
    isFuriten: false,
    isTemporaryFuriten: false,
  })) as unknown as [PlayerState, PlayerState, PlayerState, PlayerState];
}

// ============================================================================
// Round Management
// ============================================================================

/**
 * Start a new round: build wall, deal hands, set phase to draw.
 */
export function startRound(state: GameState, seed?: number): GameState {
  const wallState = buildWall(seed);
  const { hands, wall: afterDeal } = dealHands(wallState);

  const newPlayers = state.players.map((p, i) => {
    const closed = hands[i]!;
    return {
      ...p,
      hand: {
        closed,
        closedArray: tilesToHandArray(closed),
        openMelds: [],
        closedKans: [],
      },
      discards: [],
      isRiichi: false,
      riichiTurn: undefined,
      isIppatsu: false,
      isFuriten: false,
      isTemporaryFuriten: false,
    };
  }) as unknown as [PlayerState, PlayerState, PlayerState, PlayerState];

  const newState: GameState = {
    ...state,
    phase: GamePhase.PlayerDraw,
    wall: {
      liveTiles: afterDeal.liveTiles,
      deadWall: afterDeal.deadWall,
      tilesRemaining: afterDeal.liveTiles.length,
    },
    players: newPlayers,
    currentTurn: state.round.dealer,
    turnNumber: 0,
    lastDiscard: undefined,
    doraIndicators: afterDeal.deadWall.slice(4, 5) as TileId[], // First dora indicator
    uraDoraIndicators: afterDeal.deadWall.slice(5, 6) as TileId[],
    gameLog: [],
  };

  return addEvent(newState, { type: 'round_start', timestamp: Date.now() });
}

// ============================================================================
// Turn Actions
// ============================================================================

/**
 * Execute a tile draw for the current player.
 */
export function performDraw(state: GameState): GameState | null {
  if (state.phase !== GamePhase.PlayerDraw) return null;
  if (state.wall.liveTiles.length === 0) return null;

  const wallState = toWallState(state);
  const result = drawTile(wallState);
  if (!result) return null;

  const tile = result.tile;
  const playerId = state.currentTurn;
  const player = state.players[playerId]!;

  const newClosed = [...player.hand.closed, tile];
  const newClosedArray = tilesToHandArray(newClosed);

  const newPlayer: PlayerState = {
    ...player,
    hand: { ...player.hand, closed: newClosed, closedArray: newClosedArray, tsumoTile: tile },
    isTemporaryFuriten: false, // Reset temporary furiten on draw
  };

  const newPlayers = [...state.players] as [PlayerState, PlayerState, PlayerState, PlayerState];
  newPlayers[playerId] = newPlayer;

  let newState: GameState = {
    ...state,
    phase: GamePhase.PlayerDiscard,
    wall: {
      liveTiles: result.wall.liveTiles,
      deadWall: result.wall.deadWall,
      tilesRemaining: result.wall.liveTiles.length,
    },
    players: newPlayers,
    turnNumber: state.turnNumber + 1,
  };

  newState = addEvent(newState, {
    type: 'draw',
    playerId,
    tileId: tile,
    timestamp: Date.now(),
  });

  return newState;
}

/**
 * Execute a discard by the current player.
 */
export function performDiscard(state: GameState, tileId: TileId): GameState | null {
  if (state.phase !== GamePhase.PlayerDiscard) return null;

  const playerId = state.currentTurn;
  const player = state.players[playerId]!;

  // Verify tile is in hand
  const tileIdx = player.hand.closed.indexOf(tileId);
  if (tileIdx === -1) return null;

  // If riichi, can only discard tsumo tile (hand is locked)
  if (player.isRiichi && tileId !== player.hand.tsumoTile) return null;

  const newClosed = [...player.hand.closed];
  newClosed.splice(tileIdx, 1);
  const newClosedArray = tilesToHandArray(newClosed);

  const discardInfo: DiscardInfo = {
    tile: tileId,
    turnNumber: state.turnNumber,
    isRiichiDiscard: false,
    isTsumogiri: tileId === player.hand.tsumoTile,
  };

  const newPlayer: PlayerState = {
    ...player,
    hand: { ...player.hand, closed: newClosed, closedArray: newClosedArray, tsumoTile: undefined },
    discards: [...player.discards, discardInfo],
    isIppatsu: false, // Ippatsu ends when you discard
  };

  // Update furiten for this player
  const updatedPlayer = updateFuriten(newPlayer);

  const newPlayers = [...state.players] as [PlayerState, PlayerState, PlayerState, PlayerState];
  newPlayers[playerId] = updatedPlayer;

  let newState: GameState = {
    ...state,
    phase: GamePhase.CallWindow,
    players: newPlayers,
    lastDiscard: discardInfo,
  };

  newState = addEvent(newState, {
    type: 'discard',
    playerId,
    tileId,
    timestamp: Date.now(),
  });

  return newState;
}

/**
 * Declare riichi before discarding.
 * Player must be tenpai, concealed hand, and have >= 1000 points.
 */
export function declareRiichi(state: GameState): GameState | null {
  if (state.phase !== GamePhase.PlayerDiscard) return null;

  const playerId = state.currentTurn;
  const player = state.players[playerId]!;

  // Must be concealed (no open melds)
  if (player.hand.openMelds.length > 0) return null;
  // Already riichi
  if (player.isRiichi) return null;
  // Need 1000 points
  if (player.points < 1000) return null;

  // Check tenpai: remove tsumo tile from hand for the check
  const handWithoutTsumo = player.hand.closed.filter((t) => t !== player.hand.tsumoTile);
  // Actually, we need to check if after discarding ANY tile, the hand is tenpai
  // For simplicity, check the 13-tile hand (current hand minus tsumo)
  const handArray = tilesToHandArray(handWithoutTsumo);
  if (!isTenpai(handArray)) return null;

  const newPlayer: PlayerState = {
    ...player,
    isRiichi: true,
    riichiTurn: state.turnNumber,
    isIppatsu: true,
    points: player.points - 1000,
  };

  const newPlayers = [...state.players] as [PlayerState, PlayerState, PlayerState, PlayerState];
  newPlayers[playerId] = newPlayer;

  let newState: GameState = {
    ...state,
    round: {
      ...state.round,
      riichiSticksOnTable: state.round.riichiSticksOnTable + 1,
    },
    players: newPlayers,
  };

  newState = addEvent(newState, {
    type: 'riichi',
    playerId,
    timestamp: Date.now(),
  });

  return newState;
}

// ============================================================================
// Call Window Resolution
// ============================================================================

/**
 * Get available calls for all players on the last discard.
 */
export function getAvailableCalls(state: GameState): Map<PlayerId, PendingCall[]> {
  if (state.phase !== GamePhase.CallWindow || !state.lastDiscard) {
    return new Map();
  }

  const discardTile = state.lastDiscard.tile;
  const discarderId = state.currentTurn;
  const calls = new Map<PlayerId, PendingCall[]>();

  for (let i = 0; i < 4; i++) {
    const pid = i as PlayerId;
    if (pid === discarderId) continue;

    const player = state.players[pid]!;
    const playerCalls: PendingCall[] = [];

    // Check ron
    const testHand = [...player.hand.closed, discardTile];
    const testArray = tilesToHandArray(testHand);
    if (isWinningHand(testArray)) {
      // Check furiten
      const isFuriten =
        player.isFuriten ||
        player.isTemporaryFuriten ||
        checkStaticFuriten(player.hand.closed, player.discards);
      if (!isFuriten) {
        playerCalls.push({ playerId: pid, callType: 'ron' });
      }
    }

    // Check pon (not if riichi)
    if (!player.isRiichi) {
      const pon = findValidPon(discardTile, player.hand.closed, pid, discarderId);
      if (pon) {
        playerCalls.push({ playerId: pid, callType: 'pon', meld: pon });
      }
    }

    // Check kan (not if riichi)
    if (!player.isRiichi) {
      const kan = findValidOpenKan(discardTile, player.hand.closed, pid, discarderId);
      if (kan) {
        playerCalls.push({ playerId: pid, callType: 'kan', meld: kan });
      }
    }

    // Check chi (not if riichi)
    if (!player.isRiichi) {
      const chiOptions = findValidChi(discardTile, player.hand.closed, pid, discarderId);
      for (const chi of chiOptions) {
        playerCalls.push({ playerId: pid, callType: 'chi', meld: chi });
      }
    }

    if (playerCalls.length > 0) {
      calls.set(pid, playerCalls);
    }
  }

  return calls;
}

/**
 * Resolve the call window with player decisions.
 * Returns the updated state after the winning call is applied.
 */
export function resolveCallWindow(
  state: GameState,
  decisions: PendingCall[],
): GameState {
  if (state.phase !== GamePhase.CallWindow) return state;

  const discarderId = state.currentTurn;

  // If no decisions or all pass, advance to next player
  const winners = resolveCallPriority(decisions, discarderId);

  if (winners.length === 0) {
    // All pass — mark temporary furiten for players who could have called ron
    let newState = markTemporaryFuriten(state);

    // Advance to next player's draw
    const nextPlayer = ((discarderId + 1) % 4) as PlayerId;

    // Check exhaustive draw
    if (newState.wall.tilesRemaining === 0) {
      return handleExhaustiveDraw(newState);
    }

    return {
      ...newState,
      phase: GamePhase.PlayerDraw,
      currentTurn: nextPlayer,
    };
  }

  const winner = winners[0]!;

  if (winner.callType === 'ron') {
    // Handle ron (possibly multiple for double/triple ron)
    return handleRon(state, winners);
  }

  // For pon/kan/chi, apply the meld
  return applyMeldCall(state, winner);
}

/**
 * Skip the call window (all players pass).
 */
export function skipCallWindow(state: GameState): GameState {
  return resolveCallWindow(state, []);
}

// ============================================================================
// Meld Application
// ============================================================================

function applyMeldCall(state: GameState, call: PendingCall): GameState {
  if (!call.meld || !state.lastDiscard) return state;

  const playerId = call.playerId;
  const player = state.players[playerId]!;
  const discardTile = state.lastDiscard.tile;

  // Remove called tiles from hand (excluding the discard tile which comes from the table)
  const tilesToRemove = call.meld.tiles.filter((t) => t !== discardTile);
  let newClosed = [...player.hand.closed];
  for (const t of tilesToRemove) {
    const idx = newClosed.indexOf(t);
    if (idx !== -1) newClosed.splice(idx, 1);
  }

  const newMeld: Meld = { ...call.meld };

  let newOpenMelds = [...player.hand.openMelds];

  if (call.callType === 'kan') {
    // Open kan — need replacement draw
    newOpenMelds = [...newOpenMelds, newMeld];

    const newPlayer: PlayerState = {
      ...player,
      hand: {
        ...player.hand,
        closed: newClosed,
        closedArray: tilesToHandArray(newClosed),
        openMelds: newOpenMelds,
        tsumoTile: undefined,
      },
      isIppatsu: false,
    };

    const newPlayers = [...state.players] as [PlayerState, PlayerState, PlayerState, PlayerState];
    newPlayers[playerId] = newPlayer;

    // Mark the discard as called
    const discarderId = state.currentTurn;
    const discarder = newPlayers[discarderId]!;
    const newDiscards = [...discarder.discards];
    if (newDiscards.length > 0) {
      newDiscards[newDiscards.length - 1] = {
        ...newDiscards[newDiscards.length - 1]!,
        calledBy: playerId,
      };
    }
    newPlayers[discarderId] = { ...discarder, discards: newDiscards };

    let newState: GameState = {
      ...state,
      phase: GamePhase.KanProcess,
      players: newPlayers,
      currentTurn: playerId,
    };

    return addEvent(newState, {
      type: 'call',
      playerId,
      meld: newMeld,
      timestamp: Date.now(),
      data: { callType: 'kan' },
    });
  }

  // Chi or Pon
  newOpenMelds = [...newOpenMelds, newMeld];

  const newPlayer: PlayerState = {
    ...player,
    hand: {
      ...player.hand,
      closed: newClosed,
      closedArray: tilesToHandArray(newClosed),
      openMelds: newOpenMelds,
      tsumoTile: undefined,
    },
    isIppatsu: false,
  };

  const newPlayers = [...state.players] as [PlayerState, PlayerState, PlayerState, PlayerState];
  newPlayers[playerId] = newPlayer;

  // Mark the discard as called
  const discarderId = state.currentTurn;
  const discarder = newPlayers[discarderId]!;
  const newDiscards = [...discarder.discards];
  if (newDiscards.length > 0) {
    newDiscards[newDiscards.length - 1] = {
      ...newDiscards[newDiscards.length - 1]!,
      calledBy: playerId,
    };
  }
  newPlayers[discarderId] = { ...discarder, discards: newDiscards };

  let newState: GameState = {
    ...state,
    phase: GamePhase.PlayerDiscard, // Caller must discard
    players: newPlayers,
    currentTurn: playerId,
  };

  return addEvent(newState, {
    type: 'call',
    playerId,
    meld: newMeld,
    timestamp: Date.now(),
    data: { callType: call.callType },
  });
}

// ============================================================================
// Win Handling
// ============================================================================

function handleRon(state: GameState, ronCallers: PendingCall[]): GameState {
  let newState: GameState = {
    ...state,
    phase: GamePhase.RoundEnd,
  };

  for (const caller of ronCallers) {
    newState = addEvent(newState, {
      type: 'ron',
      playerId: caller.playerId,
      tileId: state.lastDiscard?.tile,
      timestamp: Date.now(),
    });
  }

  return newState;
}

/**
 * Declare tsumo win for the current player.
 */
export function declareTsumo(state: GameState): GameState | null {
  if (state.phase !== GamePhase.PlayerDiscard) return null;

  const playerId = state.currentTurn;
  const player = state.players[playerId]!;

  // Check if hand is a winning hand
  if (!isWinningHand(player.hand.closedArray)) return null;

  let newState: GameState = {
    ...state,
    phase: GamePhase.RoundEnd,
  };

  newState = addEvent(newState, {
    type: 'tsumo',
    playerId,
    tileId: player.hand.tsumoTile,
    timestamp: Date.now(),
  });

  return newState;
}

// ============================================================================
// Kan Processing
// ============================================================================

/**
 * Process a kan: draw replacement tile from dead wall.
 */
export function processKanDraw(state: GameState): GameState | null {
  if (state.phase !== GamePhase.KanProcess) return null;

  const wallState = toWallState(state);
  const result = drawReplacementTile(wallState);
  if (!result) return null;

  const tile = result.tile;
  const playerId = state.currentTurn;
  const player = state.players[playerId]!;

  const newClosed = [...player.hand.closed, tile];
  const newClosedArray = tilesToHandArray(newClosed);

  const newPlayer: PlayerState = {
    ...player,
    hand: { ...player.hand, closed: newClosed, closedArray: newClosedArray, tsumoTile: tile },
  };

  const newPlayers = [...state.players] as [PlayerState, PlayerState, PlayerState, PlayerState];
  newPlayers[playerId] = newPlayer;

  let newState: GameState = {
    ...state,
    phase: GamePhase.PlayerDiscard,
    wall: {
      liveTiles: result.wall.liveTiles,
      deadWall: result.wall.deadWall,
      tilesRemaining: result.wall.liveTiles.length,
    },
    players: newPlayers,
  };

  // Update dora indicators
  if (result.newDoraRevealed) {
    const doraCount = 1 + result.wall.kanCount;
    const doraPositions = [4, 6, 8, 10];
    const uraPositions = [5, 7, 9, 11];
    const newDora: TileId[] = [];
    const newUraDora: TileId[] = [];
    for (let i = 0; i < doraCount && i < doraPositions.length; i++) {
      const d = result.wall.deadWall[doraPositions[i]!];
      if (d !== undefined) newDora.push(d);
      const u = result.wall.deadWall[uraPositions[i]!];
      if (u !== undefined) newUraDora.push(u);
    }
    newState = { ...newState, doraIndicators: newDora, uraDoraIndicators: newUraDora };
  }

  newState = addEvent(newState, {
    type: 'kan_draw',
    playerId,
    tileId: tile,
    timestamp: Date.now(),
  });

  return newState;
}

/**
 * Declare a closed kan from hand (during discard phase).
 */
export function declareClosedKan(state: GameState, tiles: TileId[]): GameState | null {
  if (state.phase !== GamePhase.PlayerDiscard) return null;
  if (tiles.length !== 4) return null;

  const playerId = state.currentTurn;
  const player = state.players[playerId]!;

  // Verify all tiles are same type and in hand
  const types = tiles.map(tileIdToType);
  if (!types.every((t) => t === types[0])) return null;

  let newClosed = [...player.hand.closed];
  for (const t of tiles) {
    const idx = newClosed.indexOf(t);
    if (idx === -1) return null;
    newClosed.splice(idx, 1);
  }

  const newMeld: Meld = { type: 'closedKan', tiles: [...tiles] };
  const newClosedKans = [...player.hand.closedKans, newMeld];

  const newPlayer: PlayerState = {
    ...player,
    hand: {
      ...player.hand,
      closed: newClosed,
      closedArray: tilesToHandArray(newClosed),
      closedKans: newClosedKans,
      tsumoTile: undefined,
    },
  };

  const newPlayers = [...state.players] as [PlayerState, PlayerState, PlayerState, PlayerState];
  newPlayers[playerId] = newPlayer;

  let newState: GameState = {
    ...state,
    phase: GamePhase.KanProcess,
    players: newPlayers,
  };

  newState = addEvent(newState, {
    type: 'closed_kan',
    playerId,
    meld: newMeld,
    timestamp: Date.now(),
  });

  return newState;
}

/**
 * Declare an added kan (shouminkan) — add 4th tile to an existing pon.
 */
export function declareAddedKan(state: GameState, tileId: TileId): GameState | null {
  if (state.phase !== GamePhase.PlayerDiscard) return null;

  const playerId = state.currentTurn;
  const player = state.players[playerId]!;

  // Check if tile is in hand
  const tileIdx = player.hand.closed.indexOf(tileId);
  if (tileIdx === -1) return null;

  // Find matching pon
  const addedKans = findAddedKans(tileId, player.hand.openMelds);
  if (addedKans.length === 0) return null;

  const kanMeld = addedKans[0]!;

  // Remove tile from hand
  const newClosed = [...player.hand.closed];
  newClosed.splice(tileIdx, 1);

  // Replace pon with added kan in open melds
  const newOpenMelds = player.hand.openMelds.map((m) => {
    if (m.type === 'pon' && tileIdToType(m.tiles[0]!) === tileIdToType(tileId)) {
      return kanMeld;
    }
    return m;
  });

  const newPlayer: PlayerState = {
    ...player,
    hand: {
      ...player.hand,
      closed: newClosed,
      closedArray: tilesToHandArray(newClosed),
      openMelds: newOpenMelds,
      tsumoTile: undefined,
    },
  };

  const newPlayers = [...state.players] as [PlayerState, PlayerState, PlayerState, PlayerState];
  newPlayers[playerId] = newPlayer;

  let newState: GameState = {
    ...state,
    phase: GamePhase.KanProcess,
    players: newPlayers,
  };

  newState = addEvent(newState, {
    type: 'added_kan',
    playerId,
    tileId,
    meld: kanMeld,
    timestamp: Date.now(),
  });

  return newState;
}

// ============================================================================
// Round End Conditions
// ============================================================================

function handleExhaustiveDraw(state: GameState): GameState {
  // Check tenpai/noten for each player
  const tenpaiPlayers: PlayerId[] = [];
  const notenPlayers: PlayerId[] = [];

  for (let i = 0; i < 4; i++) {
    const player = state.players[i]!;
    const handArray = player.hand.closedArray;
    if (isTenpai(handArray)) {
      tenpaiPlayers.push(i as PlayerId);
    } else {
      notenPlayers.push(i as PlayerId);
    }
  }

  // Tenpai/noten payments: 3000 points split
  const newPlayers = [...state.players] as [PlayerState, PlayerState, PlayerState, PlayerState];

  if (tenpaiPlayers.length > 0 && tenpaiPlayers.length < 4) {
    const payPerNoten = Math.floor(3000 / notenPlayers.length);
    const receivePerTenpai = Math.floor(3000 / tenpaiPlayers.length);

    for (const pid of notenPlayers) {
      newPlayers[pid] = { ...newPlayers[pid]!, points: newPlayers[pid]!.points - payPerNoten };
    }
    for (const pid of tenpaiPlayers) {
      newPlayers[pid] = { ...newPlayers[pid]!, points: newPlayers[pid]!.points + receivePerTenpai };
    }
  }

  let newState: GameState = {
    ...state,
    phase: GamePhase.RoundEnd,
    players: newPlayers,
  };

  newState = addEvent(newState, {
    type: 'exhaustive_draw',
    timestamp: Date.now(),
    data: {
      tenpaiPlayers,
      notenPlayers,
    },
  });

  return newState;
}

/**
 * Check for abortive draw conditions.
 */
export function checkAbortiveDraws(state: GameState): string | null {
  // 9 different terminals/honors in starting hand (kyuushu kyuuhai)
  // This is a player choice, not automatic. Return the condition name.
  if (state.turnNumber === 1) {
    const player = state.players[state.currentTurn]!;
    const uniqueTermHonor = new Set<TileType>();
    for (const tile of player.hand.closed) {
      const t = tileIdToType(tile);
      if (t === 0 || t === 8 || t === 9 || t === 17 || t === 18 || t === 26 ||
          t >= 27 && t <= 33) {
        uniqueTermHonor.add(t);
      }
    }
    if (uniqueTermHonor.size >= 9) return 'kyuushu_kyuuhai';
  }

  // 4 kans by different players
  let totalKans = 0;
  const kanPlayers = new Set<PlayerId>();
  for (let i = 0; i < 4; i++) {
    const p = state.players[i]!;
    const playerKans =
      p.hand.openMelds.filter((m) => m.type === 'kan' || m.type === 'addedKan').length +
      p.hand.closedKans.length;
    if (playerKans > 0) kanPlayers.add(i as PlayerId);
    totalKans += playerKans;
  }
  if (totalKans >= 4 && kanPlayers.size > 1) return 'suukaikan';

  // 4 riichi
  const riichiCount = state.players.filter((p) => p.isRiichi).length;
  if (riichiCount === 4) return 'suucha_riichi';

  return null;
}

/**
 * Apply an abortive draw.
 */
export function applyAbortiveDraw(state: GameState, reason: string): GameState {
  let newState: GameState = {
    ...state,
    phase: GamePhase.RoundEnd,
  };

  newState = addEvent(newState, {
    type: 'abortive_draw',
    timestamp: Date.now(),
    data: { reason },
  });

  return newState;
}

// ============================================================================
// Round Advancement
// ============================================================================

/**
 * Advance to the next round after round end.
 * Dealer rotates if dealer did not win (or on exhaustive draw if dealer is noten).
 */
export function advanceRound(state: GameState, dealerWon: boolean): GameState {
  const currentDealer = state.round.dealer;

  if (dealerWon) {
    // Dealer stays, honba increases
    return {
      ...state,
      phase: GamePhase.WaitingToStart,
      round: {
        ...state.round,
        honbaCount: state.round.honbaCount + 1,
      },
    };
  }

  // Dealer rotates
  const nextDealer = ((currentDealer + 1) % 4) as PlayerId;
  const dealerWrapped = nextDealer === 0;

  let nextWind = state.round.wind;
  let nextNumber = state.round.number;

  if (dealerWrapped) {
    // All players have been dealer — advance round wind
    nextNumber++;
    if (nextNumber > 4) {
      nextNumber = 1;
      nextWind = ((nextWind as number) + 1) as Wind;
    }
  }

  // Check game end (after South round typically, or West/North for extended games)
  if ((nextWind as number) >= 2) {
    return {
      ...state,
      phase: GamePhase.GameEnd,
    };
  }

  return {
    ...state,
    phase: GamePhase.WaitingToStart,
    round: {
      ...state.round,
      wind: nextWind,
      number: nextNumber,
      dealer: nextDealer,
      honbaCount: 0,
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

function addEvent(state: GameState, event: GameEvent): GameState {
  return {
    ...state,
    gameLog: [...state.gameLog, event],
  };
}

function updateFuriten(player: PlayerState): PlayerState {
  const isFuriten = checkStaticFuriten(player.hand.closed, player.discards);
  return { ...player, isFuriten };
}

function markTemporaryFuriten(state: GameState): GameState {
  if (!state.lastDiscard) return state;

  const discardType = tileIdToType(state.lastDiscard.tile);
  const discarderId = state.currentTurn;

  const newPlayers = [...state.players] as [PlayerState, PlayerState, PlayerState, PlayerState];

  for (let i = 0; i < 4; i++) {
    if (i === discarderId) continue;
    const player = newPlayers[i]!;

    if (wouldCompleteFuriten(player.hand.closed, discardType)) {
      newPlayers[i] = { ...player, isTemporaryFuriten: true };

      // Riichi furiten: if player is in riichi, permanent furiten for round
      if (player.isRiichi) {
        newPlayers[i] = { ...newPlayers[i]!, isFuriten: true };
      }
    }
  }

  return { ...state, players: newPlayers };
}

function toWallState(state: GameState): WallState {
  // Count kans for the WallState
  let kanCount = 0;
  for (const p of state.players) {
    kanCount += p.hand.openMelds.filter(
      (m) => m.type === 'kan' || m.type === 'addedKan',
    ).length;
    kanCount += p.hand.closedKans.length;
  }

  return {
    liveTiles: [...state.wall.liveTiles],
    deadWall: [...state.wall.deadWall],
    doraIndicatorPositions: [4, 6, 8, 10],
    uraDoraIndicatorPositions: [5, 7, 9, 11],
    kanCount,
    seed: 0,
  };
}

/**
 * Get the next player in turn order.
 */
export function nextPlayer(current: PlayerId): PlayerId {
  return ((current + 1) % 4) as PlayerId;
}
