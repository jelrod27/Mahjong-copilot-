import {Tile, tileToJson, tileFromJson} from './Tile';
import {Timestamp} from '@react-native-firebase/firestore';

export enum GamePhase {
  WAITING = 'waiting', // Waiting to start
  DEALING = 'dealing', // Dealing tiles
  PLAYING = 'playing', // Active gameplay
  PAUSED = 'paused', // Paused
  FINISHED = 'finished', // Game finished
}

export enum PlayerAction {
  DRAW = 'draw', // Draw a tile
  DISCARD = 'discard', // Discard a tile
  CHOW = 'chow', // Make a chow (sequence)
  PUNG = 'pung', // Make a pung (triplet)
  KONG = 'kong', // Make a kong (quad)
  WIN = 'win', // Win the game
  PASS = 'pass', // Pass turn
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  hand: Tile[];
  melds: Tile[][]; // Completed melds (chows, pungs, kongs)
  score: number;
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
  variant: string; // Mahjong variant
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  wall: Tile[]; // Remaining tiles in wall
  discardPile: Tile[]; // Discarded tiles
  lastDrawnTile?: Tile;
  lastDiscardedTile?: Tile;
  lastAction?: PlayerAction;
  winnerId?: string;
  finalScores: Record<string, number>;
  createdAt: Date;
  finishedAt?: Date;
  turnHistory: GameTurn[]; // For rewind functionality
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
    id: gameState.id,
    variant: gameState.variant,
    phase: gameState.phase,
    players: gameState.players.map(p => playerToJson(p)),
    currentPlayerIndex: gameState.currentPlayerIndex,
    wall: gameState.wall.map(t => tileToJson(t)),
    discardPile: gameState.discardPile.map(t => tileToJson(t)),
    lastDrawnTile: gameState.lastDrawnTile ? tileToJson(gameState.lastDrawnTile) : undefined,
    lastDiscardedTile: gameState.lastDiscardedTile ? tileToJson(gameState.lastDiscardedTile) : undefined,
    lastAction: gameState.lastAction,
    winnerId: gameState.winnerId,
    finalScores: gameState.finalScores,
    createdAt: Timestamp.fromDate(gameState.createdAt),
    finishedAt: gameState.finishedAt ? Timestamp.fromDate(gameState.finishedAt) : undefined,
    turnHistory: gameState.turnHistory.map(t => gameTurnToJson(t)),
  };
};

export const gameStateFromJson = (json: Record<string, any>): GameState => {
  return {
    id: json.id as string,
    variant: json.variant as string,
    phase: json.phase as GamePhase,
    players: (json.players as any[]).map(p => playerFromJson(p)),
    currentPlayerIndex: (json.currentPlayerIndex as number) ?? 0,
    wall: (json.wall as any[])?.map((t: any) => tileFromJson(t)) ?? [],
    discardPile: (json.discardPile as any[])?.map((t: any) => tileFromJson(t)) ?? [],
    lastDrawnTile: json.lastDrawnTile ? tileFromJson(json.lastDrawnTile) : undefined,
    lastDiscardedTile: json.lastDiscardedTile ? tileFromJson(json.lastDiscardedTile) : undefined,
    lastAction: json.lastAction as PlayerAction | undefined,
    winnerId: json.winnerId as string | undefined,
    finalScores: (json.finalScores as Record<string, number>) ?? {},
    createdAt: (json.createdAt as Timestamp).toDate(),
    finishedAt: json.finishedAt ? (json.finishedAt as Timestamp).toDate() : undefined,
    turnHistory: (json.turnHistory as any[])?.map((t: any) => gameTurnFromJson(t)) ?? [],
  };
};

// Helper functions for JSON conversion
function playerToJson(player: Player): Record<string, any> {
  return {
    id: player.id,
    name: player.name,
    isAI: player.isAI,
    hand: player.hand.map(t => tileToJson(t)),
    melds: player.melds.map(m => m.map(t => tileToJson(t))),
    score: player.score,
  };
}

function playerFromJson(json: Record<string, any>): Player {
  return {
    id: json.id as string,
    name: json.name as string,
    isAI: (json.isAI as boolean) ?? false,
    hand: (json.hand as any[])?.map((t: any) => tileFromJson(t)) ?? [],
    melds: (json.melds as any[][])?.map((m: any[]) => m.map((t: any) => tileFromJson(t))) ?? [],
    score: (json.score as number) ?? 0,
  };
}

function gameTurnToJson(turn: GameTurn): Record<string, any> {
  return {
    turnNumber: turn.turnNumber,
    playerId: turn.playerId,
    action: turn.action,
    tile: turn.tile ? tileToJson(turn.tile) : undefined,
    timestamp: Timestamp.fromDate(turn.timestamp),
  };
}

function gameTurnFromJson(json: Record<string, any>): GameTurn {
  return {
    turnNumber: json.turnNumber as number,
    playerId: json.playerId as string,
    action: json.action as PlayerAction,
    tile: json.tile ? tileFromJson(json.tile) : undefined,
    timestamp: (json.timestamp as Timestamp).toDate(),
  };
}

// Tile JSON conversion functions are imported from Tile.ts

