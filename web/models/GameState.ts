import {Tile, TileSuit, WindTile, tileToJson, tileFromJson} from './Tile';

export enum GamePhase {
  WAITING = 'waiting',
  DEALING = 'dealing',
  PLAYING = 'playing',
  PAUSED = 'paused',
  FINISHED = 'finished',
}

export enum PlayerAction {
  DRAW = 'draw',
  DISCARD = 'discard',
  CHOW = 'chow',
  PUNG = 'pung',
  KONG = 'kong',
  WIN = 'win',
  PASS = 'pass',
}

export type TurnPhase = 'draw' | 'discard' | 'claim' | 'endOfTurn';

export type ClaimType = 'chow' | 'pung' | 'kong' | 'win';

export interface ClaimRequest {
  playerId: string;
  claimType: ClaimType;
  tiles: Tile[]; // tiles from hand used in the claim
}

export interface MeldInfo {
  tiles: Tile[];
  type: 'chow' | 'pung' | 'kong' | 'pair';
  isConcealed: boolean;
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
  hand: Tile[];
  melds: MeldInfo[];
  score: number;
  seatWind: WindTile;
  isDealer: boolean;
  flowers: Tile[];
}

export interface GameTurn {
  turnNumber: number;
  playerId: string;
  action: PlayerAction;
  tile?: Tile;
  timestamp: Date;
}

export interface GameState {
  id: string;
  variant: string;
  phase: GamePhase;
  turnPhase: TurnPhase;
  players: Player[];
  currentPlayerIndex: number;
  wall: Tile[];
  deadWall: Tile[];
  discardPile: Tile[];
  playerDiscards: Record<string, Tile[]>;
  lastDrawnTile?: Tile;
  lastDiscardedTile?: Tile;
  lastDiscardedBy?: string;
  lastAction?: PlayerAction;
  pendingClaims: ClaimRequest[];
  prevailingWind: WindTile;
  winnerId?: string;
  winningTile?: Tile;
  isSelfDrawn?: boolean;
  finalScores: Record<string, number>;
  createdAt: Date;
  finishedAt?: Date;
  turnHistory: GameTurn[];
  turnTimeLimit: number;
  turnStartedAt?: Date;
}

export const getCurrentPlayer = (gameState: GameState): Player => {
  return gameState.players[gameState.currentPlayerIndex];
};

export const isGameFinished = (gameState: GameState): boolean => {
  return gameState.phase === GamePhase.FINISHED;
};

export const getRemainingTiles = (gameState: GameState): number => {
  return gameState.wall.length;
};

export const gameStateToJson = (gameState: GameState): Record<string, any> => {
  return {
    ...gameState,
    players: gameState.players.map(p => playerToJson(p)),
    wall: gameState.wall.map(t => tileToJson(t)),
    deadWall: gameState.deadWall.map(t => tileToJson(t)),
    discardPile: gameState.discardPile.map(t => tileToJson(t)),
    lastDrawnTile: gameState.lastDrawnTile ? tileToJson(gameState.lastDrawnTile) : undefined,
    lastDiscardedTile: gameState.lastDiscardedTile ? tileToJson(gameState.lastDiscardedTile) : undefined,
    winningTile: gameState.winningTile ? tileToJson(gameState.winningTile) : undefined,
    playerDiscards: Object.fromEntries(
      Object.entries(gameState.playerDiscards).map(([k, v]) => [k, v.map(t => tileToJson(t))])
    ),
    pendingClaims: gameState.pendingClaims.map(c => ({
      ...c,
      tiles: c.tiles.map(t => tileToJson(t)),
    })),
    createdAt: gameState.createdAt.toISOString(),
    finishedAt: gameState.finishedAt ? gameState.finishedAt.toISOString() : undefined,
    turnStartedAt: gameState.turnStartedAt ? gameState.turnStartedAt.toISOString() : undefined,
    turnHistory: gameState.turnHistory.map(t => gameTurnToJson(t)),
  };
};

export const gameStateFromJson = (json: Record<string, any>): GameState => {
  return {
    id: json.id as string,
    variant: json.variant as string,
    phase: json.phase as GamePhase,
    turnPhase: (json.turnPhase as TurnPhase) ?? 'draw',
    players: (json.players as any[]).map(p => playerFromJson(p)),
    currentPlayerIndex: (json.currentPlayerIndex as number) ?? 0,
    wall: (json.wall as any[])?.map((t: any) => tileFromJson(t)) ?? [],
    deadWall: (json.deadWall as any[])?.map((t: any) => tileFromJson(t)) ?? [],
    discardPile: (json.discardPile as any[])?.map((t: any) => tileFromJson(t)) ?? [],
    playerDiscards: json.playerDiscards
      ? Object.fromEntries(
          Object.entries(json.playerDiscards as Record<string, any[]>).map(([k, v]) => [k, v.map((t: any) => tileFromJson(t))])
        )
      : {},
    lastDrawnTile: json.lastDrawnTile ? tileFromJson(json.lastDrawnTile) : undefined,
    lastDiscardedTile: json.lastDiscardedTile ? tileFromJson(json.lastDiscardedTile) : undefined,
    lastDiscardedBy: json.lastDiscardedBy as string | undefined,
    lastAction: json.lastAction as PlayerAction | undefined,
    pendingClaims: (json.pendingClaims as any[])?.map((c: any) => ({
      ...c,
      tiles: c.tiles?.map((t: any) => tileFromJson(t)) ?? [],
    })) ?? [],
    prevailingWind: (json.prevailingWind as WindTile) ?? WindTile.EAST,
    winnerId: json.winnerId as string | undefined,
    winningTile: json.winningTile ? tileFromJson(json.winningTile) : undefined,
    isSelfDrawn: json.isSelfDrawn as boolean | undefined,
    finalScores: (json.finalScores as Record<string, number>) ?? {},
    createdAt: new Date(json.createdAt as string),
    finishedAt: json.finishedAt ? new Date(json.finishedAt as string) : undefined,
    turnHistory: (json.turnHistory as any[])?.map((t: any) => gameTurnFromJson(t)) ?? [],
    turnTimeLimit: (json.turnTimeLimit as number) ?? 20,
    turnStartedAt: json.turnStartedAt ? new Date(json.turnStartedAt as string) : undefined,
  };
};

function meldToJson(meld: MeldInfo): Record<string, any> {
  return {
    tiles: meld.tiles.map(t => tileToJson(t)),
    type: meld.type,
    isConcealed: meld.isConcealed,
  };
}

function meldFromJson(json: any): MeldInfo {
  return {
    tiles: (json.tiles as any[])?.map((t: any) => tileFromJson(t)) ?? [],
    type: json.type as 'chow' | 'pung' | 'kong' | 'pair',
    isConcealed: json.isConcealed ?? true,
  };
}

function playerToJson(player: Player): Record<string, any> {
  return {
    id: player.id,
    name: player.name,
    isAI: player.isAI,
    aiDifficulty: player.aiDifficulty,
    hand: player.hand.map(t => tileToJson(t)),
    melds: player.melds.map(m => meldToJson(m)),
    score: player.score,
    seatWind: player.seatWind,
    isDealer: player.isDealer,
    flowers: player.flowers.map(t => tileToJson(t)),
  };
}

function playerFromJson(json: Record<string, any>): Player {
  return {
    id: json.id as string,
    name: json.name as string,
    isAI: (json.isAI as boolean) ?? false,
    aiDifficulty: json.aiDifficulty as 'easy' | 'medium' | 'hard' | undefined,
    hand: (json.hand as any[])?.map((t: any) => tileFromJson(t)) ?? [],
    melds: (json.melds as any[])?.map((m: any) => meldFromJson(m)) ?? [],
    score: (json.score as number) ?? 0,
    seatWind: (json.seatWind as WindTile) ?? WindTile.EAST,
    isDealer: (json.isDealer as boolean) ?? false,
    flowers: (json.flowers as any[])?.map((t: any) => tileFromJson(t)) ?? [],
  };
}

function gameTurnToJson(turn: GameTurn): Record<string, any> {
  return {
    turnNumber: turn.turnNumber,
    playerId: turn.playerId,
    action: turn.action,
    tile: turn.tile ? tileToJson(turn.tile) : undefined,
    timestamp: turn.timestamp.toISOString(),
  };
}

function gameTurnFromJson(json: Record<string, any>): GameTurn {
  return {
    turnNumber: json.turnNumber as number,
    playerId: json.playerId as string,
    action: json.action as PlayerAction,
    tile: json.tile ? tileFromJson(json.tile) : undefined,
    timestamp: new Date(json.timestamp as string),
  };
}
